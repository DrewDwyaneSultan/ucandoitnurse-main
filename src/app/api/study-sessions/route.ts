import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch study sessions for a user
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const bookId = searchParams.get("bookId");

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        );
    }

    try {
        let query = supabase
            .from("study_sessions")
            .select("*")
            .eq("user_id", userId)
            .order("completed_at", { ascending: false })
            .limit(limit);

        if (bookId) {
            query = query.eq("book_id", bookId);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            sessions: sessions || [],
            count: sessions?.length || 0,
        });
    } catch (error) {
        console.error("Error fetching study sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch study sessions" },
            { status: 500 }
        );
    }
}
