import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for cross-user aggregation
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LeaderboardEntry {
    userId: string;
    displayName: string;
    totalCards: number;
    rank: number;
}

export async function GET() {
    try {
        // Get all study sessions in scored mode
        const { data: sessions, error } = await supabase
            .from("study_sessions")
            .select("user_id, total_cards")
            .eq("mode", "scored");

        if (error) {
            console.error("Leaderboard sessions error:", error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // Aggregate cards by user
        const userTotals = new Map<string, number>();

        for (const session of sessions || []) {
            const userId = session.user_id;
            const current = userTotals.get(userId) || 0;
            userTotals.set(userId, current + (session.total_cards || 0));
        }

        // Get unique user IDs
        const userIds = Array.from(userTotals.keys());

        if (userIds.length === 0) {
            return NextResponse.json({ leaderboard: [] });
        }

        // Fetch user profiles
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, email")
            .in("id", userIds);

        // Build leaderboard
        const leaderboard: LeaderboardEntry[] = userIds
            .map((userId) => {
                const profile = profiles?.find((p) => p.id === userId);
                const displayName = profile?.display_name ||
                    profile?.email?.split("@")[0] ||
                    "User";

                return {
                    userId,
                    displayName,
                    totalCards: userTotals.get(userId) || 0
                };
            })
            .filter((entry) => entry.totalCards > 0)
            .sort((a, b) => b.totalCards - a.totalCards)
            .slice(0, 10) // Top 10
            .map((entry, index) => ({
                ...entry,
                rank: index + 1
            }));

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error("Leaderboard error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
