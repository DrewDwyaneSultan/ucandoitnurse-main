import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST() {
    const supabase = createServerClient();
    // grab user from auth cookie
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        // check if user already has books
        const { count } = await supabase
            .from("books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);

        if (count && count > 0) {
            return NextResponse.json({ message: "User already has books" });
        }

        const bookId = randomUUID();
        const { data: book, error: bookError } = await supabase
            .from("books")
            .insert({
                id: bookId,
                user_id: user.id,
                title: "Sample Nursing Book",
                file_path: "demo-sample.pdf",
                status: "ready",
                total_chunks: 0,
            })
            .select("*")
            .single();

        if (bookError || !book) {
            console.error("Error creating demo book", bookError);
            return NextResponse.json({ error: "Failed to create demo book" }, { status: 500 });
        }

        const flashcards = [
            {
                id: randomUUID(),
                user_id: user.id,
                book_id: bookId,
                topic: "Nursing Fundamentals",
                question: "What is the first step in patient assessment?",
                choices: ["Wash hands", "Gather supplies", "Introduce yourself", "Take vital signs"],
                correct_answer: "Introduce yourself",
                explanation: "Always start by introducing yourself to build rapport.",
                hint: "Start with greeting",
                is_favorite: false,
                source_chunk_ids: [],
                mastered: null,
                review_count: 0,
                ease_factor: 2.5,
                interval_days: 1,
                next_review_at: null,
                total_reviews: 0,
                consecutive_correct: 0,
                difficulty: "easy",
            },
            {
                id: randomUUID(),
                user_id: user.id,
                book_id: bookId,
                topic: "Nursing Fundamentals",
                question: "What does RICE stand for in first aid?",
                choices: ["Rest, Ice, Compression, Elevation", "Run, Ignore, Create, Evaluate", "Relax, Inhale, Compress, Exhale", "Ready, Inspect, Care, Evaluate"],
                correct_answer: "Rest, Ice, Compression, Elevation",
                explanation: "RICE is a common mnemonic for treating sprains.",
                hint: "Think first-aid steps for a sprain",
                is_favorite: false,
                source_chunk_ids: [],
                mastered: null,
                review_count: 0,
                ease_factor: 2.5,
                interval_days: 1,
                next_review_at: null,
                total_reviews: 0,
                consecutive_correct: 0,
                difficulty: "easy",
            },
        ];

        const { error: fcError } = await supabase.from("flashcards").insert(flashcards);
        if (fcError) {
            console.error("Error inserting demo flashcards", fcError);
            return NextResponse.json({ error: "Failed to create demo flashcards" }, { status: 500 });
        }

        return NextResponse.json({ message: "Demo data created" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
