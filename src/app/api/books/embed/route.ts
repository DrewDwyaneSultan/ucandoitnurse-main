import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createEmbedding } from "@/lib/genkit";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 minutes for embedding generation

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { bookId, userId } = await request.json();

        if (!bookId || !userId) {
            return NextResponse.json(
                { error: "Book ID and User ID are required" },
                { status: 400 }
            );
        }

        // Get book record
        const { data: book, error: bookError } = await supabase
            .from("books")
            .select("*")
            .eq("id", bookId)
            .eq("user_id", userId)
            .single();

        if (bookError || !book) {
            return NextResponse.json(
                { error: "Book not found" },
                { status: 404 }
            );
        }

        // Get all chunks without embeddings
        const { data: chunks, error: chunksError } = await supabase
            .from("book_chunks")
            .select("id, chunk_text")
            .eq("book_id", bookId)
            .is("embedding_vector", null);

        if (chunksError) {
            return NextResponse.json(
                { error: "Failed to fetch chunks: " + chunksError.message },
                { status: 500 }
            );
        }

        if (!chunks || chunks.length === 0) {
            // No chunks to embed, mark as ready
            await supabase
                .from("books")
                .update({ status: "ready" })
                .eq("id", bookId);

            return NextResponse.json({
                success: true,
                bookId,
                embeddedCount: 0,
                message: "No chunks to embed. Book is ready.",
            });
        }

        // Generate embeddings in batches to avoid rate limits
        const batchSize = 10;
        let embeddedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async (chunk) => {
                    try {
                        const embedding = await createEmbedding(chunk.chunk_text);

                        // Update chunk with embedding
                        const { error: updateError } = await supabase
                            .from("book_chunks")
                            .update({ embedding_vector: embedding })
                            .eq("id", chunk.id);

                        if (updateError) {
                            errors.push(`Chunk ${chunk.id}: ${updateError.message}`);
                        } else {
                            embeddedCount++;
                        }
                    } catch (err) {
                        console.error(`Embedding error for chunk ${chunk.id}:`, err);
                        errors.push(`Chunk ${chunk.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
                    }
                })
            );

            // Small delay between batches to respect rate limits
            if (i + batchSize < chunks.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        // Update book status
        // Consider it ready if at least 80% of chunks were embedded successfully
        const successRate = embeddedCount / chunks.length;
        const finalStatus = successRate >= 0.8 ? "ready" : "failed";

        console.log(`Embed complete: ${embeddedCount}/${chunks.length} chunks (${Math.round(successRate * 100)}%), status: ${finalStatus}`);

        await supabase
            .from("books")
            .update({ status: finalStatus })
            .eq("id", bookId);

        return NextResponse.json({
            success: embeddedCount > 0,
            bookId,
            embeddedCount,
            totalChunks: chunks.length,
            successRate: Math.round(successRate * 100),
            errors: errors.length > 0 ? errors : undefined,
            message:
                embeddedCount === chunks.length
                    ? "All embeddings generated successfully. Book is ready!"
                    : successRate >= 0.8
                        ? `Embedded ${embeddedCount}/${chunks.length} chunks. Book is ready!`
                        : `Only embedded ${embeddedCount}/${chunks.length} chunks. Please try again.`,
        });
    } catch (error) {
        console.error("Embed error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
