import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createEmbedding } from "@/lib/genkit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { topic, bookId, userId, topK = 10 } = await request.json();

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

        // Generate embedding for the topic query
        const queryEmbedding = await createEmbedding(topic);

        // Query Supabase for similar chunks using pgvector
        const { data: matches, error: matchError } = await supabase.rpc(
            "match_chunks",
            {
                query_embedding: queryEmbedding,
                match_count: topK,
                filter_book_id: bookId || null,
            }
        );

        if (matchError) {
            console.error("Match error:", matchError);
            return NextResponse.json(
                { error: "Failed to retrieve chunks: " + matchError.message },
                { status: 500 }
            );
        }

        if (!matches || matches.length === 0) {
            return NextResponse.json({
                success: true,
                chunks: [],
                message: "No relevant content found for this topic.",
            });
        }

        return NextResponse.json({
            success: true,
            chunks: matches,
            topic,
            totalMatches: matches.length,
        });
    } catch (error) {
        console.error("Retrieve error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
