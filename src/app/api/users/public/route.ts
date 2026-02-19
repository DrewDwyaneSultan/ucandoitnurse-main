import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch public profile data (non-confidential only)
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        );
    }

    try {
        // Fetch public profile data only (no email, sensitive data)
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("id, display_name, avatar_url, bio, created_at")
            .eq("id", userId)
            .single();

        if (profileError) throw profileError;

        // Fetch public stats
        const [booksRes, flashcardsRes] = await Promise.all([
            supabase.from("books").select("id", { count: "exact" }).eq("user_id", userId),
            supabase.from("flashcards").select("id", { count: "exact" }).eq("user_id", userId),
        ]);

        const stats = {
            books: booksRes.count || 0,
            flashcards: flashcardsRes.count || 0,
        };

        return NextResponse.json({ profile, stats });
    } catch (error) {
        console.error("Error fetching public profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
}
