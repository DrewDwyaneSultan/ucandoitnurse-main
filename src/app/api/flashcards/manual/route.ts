import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// POST: Create a manual flashcard
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { userId, question, answer, explanation, topic, folderId } = await request.json();

        if (!userId || !question || !answer) {
            return NextResponse.json(
                { error: "User ID, question, and answer are required" },
                { status: 400 }
            );
        }

        // Create the flashcard
        const { data: flashcard, error: flashcardError } = await supabase
            .from("flashcards")
            .insert({
                user_id: userId,
                book_id: null, // Manual flashcards don't have a book reference
                topic: topic || "Manual",
                question: question.trim(),
                choices: [], // Manual flashcards don't have choices
                correct_answer: answer.trim(),
                explanation: explanation?.trim() || null,
                source_chunk_ids: [],
                mastered: null,
                review_count: 0,
            })
            .select()
            .single();

        if (flashcardError) throw flashcardError;

        // If folderId is provided, add the flashcard to the folder
        if (folderId && flashcard) {
            const { error: folderItemError } = await supabase
                .from("folder_items")
                .insert({
                    folder_id: folderId,
                    user_id: userId,
                    item_type: "flashcard",
                    item_id: flashcard.id,
                });

            if (folderItemError) {
                console.error("Error adding flashcard to folder:", folderItemError);
                // Don't throw - flashcard was created successfully
            }
        }

        return NextResponse.json({ flashcard, success: true });
    } catch (error) {
        console.error("Error creating manual flashcard:", error);
        return NextResponse.json(
            { error: "Failed to create flashcard" },
            { status: 500 }
        );
    }
}
