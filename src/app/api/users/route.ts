import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Search users by email or display name
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const currentUserId = searchParams.get("userId");

    if (!query || query.length < 2) {
        return NextResponse.json({ users: [] });
    }

    try {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .neq("id", currentUserId)
            .or(`display_name.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;

        return NextResponse.json({ users: data || [] });
    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json(
            { error: "Failed to search users" },
            { status: 500 }
        );
    }
}

// PATCH: Update user profile
export async function PATCH(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { userId, displayName, bio, avatarUrl } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (displayName !== undefined) updates.display_name = displayName;
        if (bio !== undefined) updates.bio = bio;
        if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

        const { data, error } = await supabase
            .from("user_profiles")
            .update(updates)
            .eq("id", userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ profile: data });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}
