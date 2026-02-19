import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createEmbedding, generateFlashcards, type AIModelId, DEFAULT_MODEL } from "@/lib/genkit";
import { getUserCredits, consumeCredit } from "@/lib/credits";
import type { ChunkMatch } from "@/types/database.types";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 minutes for generation

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const {
            topic,
            bookId,
            userId,
            count = 5,
            topK = 10,
            modelId = DEFAULT_MODEL,
        } = await request.json() as {
            topic: string;
            bookId: string;
            userId: string;
            count?: number;
            topK?: number;
            modelId?: AIModelId;
        };

        if (!topic) {
            return NextResponse.json(
                { error: "Topic is required" },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        if (!bookId) {
            return NextResponse.json(
                { error: "Book ID is required" },
                { status: 400 }
            );
        }

        // ============================================
        // CREDIT CHECK - Check if user has credits
        // ============================================
        const credits = await getUserCredits(userId, supabase); // Pass service role client

        if (credits.creditsRemaining <= 0) {
            return NextResponse.json(
                {
                    error: "NO_CREDITS",
                    message: "You've used all your daily credits. Upgrade your plan to continue.",
                    creditsRemaining: 0,
                    plan: credits.plan,
                },
                { status: 402 } // 402 Payment Required
            );
        }

        // Step 1: Generate embedding for the topic query
        const queryEmbedding = await createEmbedding(topic);

        // Step 2: Retrieve relevant chunks
        const { data: matches, error: matchError } = await supabase.rpc(
            "match_chunks",
            {
                query_embedding: queryEmbedding,
                match_count: topK,
                filter_book_id: bookId,
            }
        );

        if (matchError) {
            console.error("Match error:", matchError);
            return NextResponse.json(
                { error: "Failed to retrieve content: " + matchError.message },
                { status: 500 }
            );
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json(
                { error: "No relevant content found for this topic. Try a different topic or upload more books." },
                { status: 400 }
            );
        }

        // Step 3: Generate flashcards from chunks
        const chunksForGeneration = (matches as ChunkMatch[]).map((match) => ({
            id: match.id,
            text: match.chunk_text,
            source: match.source || "unknown",
        }));

        const generatedCards = await generateFlashcards(chunksForGeneration, count, modelId);

        if (!generatedCards || generatedCards.length === 0) {
            return NextResponse.json(
                { error: "Failed to generate flashcards. Please try again." },
                { status: 500 }
            );
        }

        // Step 4: Store flashcards in database
        // Use actual chunk IDs from our query, not AI-generated ones (which can be malformed)
        const actualChunkIds = (matches as ChunkMatch[]).map((m) => m.id);

        const flashcardInserts = generatedCards.map((card) => ({
            user_id: userId,
            book_id: bookId,
            topic,
            question: card.question,
            choices: card.choices || [],
            correct_answer: card.correctAnswer,
            explanation: card.explanation,
            hint: card.hint || null,
            source_chunk_ids: actualChunkIds.slice(0, 3), // Use first 3 actual chunk IDs as sources
            mastered: null, // New cards start as neutral (not reviewed)
            is_favorite: false,
            review_count: 0,
        }));

        const { data: savedCards, error: insertError } = await supabase
            .from("flashcards")
            .insert(flashcardInserts)
            .select();

        if (insertError) {
            console.error("Insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to save flashcards: " + insertError.message },
                { status: 500 }
            );
        }

        // ============================================
        // USE CREDIT - Deduct 1 credit after successful generation
        // ============================================
        const creditResult = await consumeCredit(userId, "flashcard_generation", {
            bookId,
            topic,
            cardsGenerated: savedCards?.length || 0,
        }, supabase); // Pass service role client

        return NextResponse.json({
            success: true,
            flashcards: savedCards,
            topic,
            count: savedCards?.length || 0,
            message: `Generated ${savedCards?.length || 0} flashcards for "${topic}"`,
            creditsRemaining: creditResult.creditsRemaining,
        });
    } catch (error) {
        console.error("Generate error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
