import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch a single shared flashcard with its book for viewing
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ flashcardId: string }> }
) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { flashcardId } = await params;

    if (!userId || !flashcardId) {
        return NextResponse.json(
            { error: "User ID and flashcard ID are required" },
            { status: 400 }
        );
    }

    try {
        // First verify this flashcard was actually shared with the user
        const { data: sharedRecord, error: sharedError } = await supabase
            .from("shared_flashcards")
            .select("*")
            .eq("flashcard_id", flashcardId)
            .eq("recipient_id", userId)
            .maybeSingle();

        if (sharedError) {
            console.error("Error checking shared record:", sharedError);
            throw sharedError;
        }

        // If not shared with this user, check if they own it
        let isOwner = false;
        if (!sharedRecord) {
            const { data: ownedCard } = await supabase
                .from("flashcards")
                .select("id")
                .eq("id", flashcardId)
                .eq("user_id", userId)
                .maybeSingle();

            if (!ownedCard) {
                return NextResponse.json(
                    { error: "Flashcard not found or not accessible" },
                    { status: 404 }
                );
            }
            isOwner = true;
        }

        // Fetch the flashcard (using server client to bypass RLS)
        const { data: flashcard, error: flashcardError } = await supabase
            .from("flashcards")
            .select("*")
            .eq("id", flashcardId)
            .single();

        if (flashcardError || !flashcard) {
            console.error("Error fetching flashcard:", flashcardError);
            return NextResponse.json(
                { error: "Flashcard not found" },
                { status: 404 }
            );
        }

        // Fetch the associated book
        let book = null;
        if (flashcard.book_id) {
            const { data: bookData } = await supabase
                .from("books")
                .select("*")
                .eq("id", flashcard.book_id)
                .single();

            book = bookData;
        }

        // Mark as read if this is a shared card and not already read
        if (sharedRecord && !sharedRecord.is_read) {
            await supabase
                .from("shared_flashcards")
                .update({ is_read: true })
                .eq("id", sharedRecord.id);
        }

        return NextResponse.json({
            flashcard,
            book,
            isShared: !isOwner,
            sharedRecord: sharedRecord || null,
        });
    } catch (error) {
        console.error("Error fetching shared flashcard:", error);
        return NextResponse.json(
            { error: "Failed to fetch flashcard" },
            { status: 500 }
        );
    }
}
