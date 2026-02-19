import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch friends and friend requests
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "all"; // all, pending, accepted

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // First, fetch friendships
        let query = supabase
            .from("friendships")
            .select("*")
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

        if (type === "pending") {
            query = query.eq("status", "pending");
        } else if (type === "accepted") {
            query = query.eq("status", "accepted");
        } else {
            query = query.in("status", ["pending", "accepted"]);
        }

        const { data: friendships, error: friendshipsError } = await query.order("updated_at", { ascending: false });

        if (friendshipsError) throw friendshipsError;

        if (!friendships || friendships.length === 0) {
            return NextResponse.json({ friendships: [] });
        }

        // Get all unique user IDs we need to fetch profiles for
        const userIds = new Set<string>();
        friendships.forEach((f) => {
            userIds.add(f.requester_id);
            userIds.add(f.addressee_id);
        });

        // Fetch all relevant user profiles
        const { data: profiles, error: profilesError } = await supabase
            .from("user_profiles")
            .select("*")
            .in("id", Array.from(userIds));

        if (profilesError) {
            console.warn("Could not fetch profiles:", profilesError);
        }

        // Create a map for quick profile lookup
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // Transform data to include friend_profile (the other person's profile)
        const transformedFriendships = friendships.map((f) => {
            const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
            return {
                ...f,
                friend_profile: profileMap.get(friendId) || {
                    id: friendId,
                    display_name: "Unknown User",
                    avatar_url: null,
                    bio: null
                },
                is_incoming: f.addressee_id === userId && f.status === "pending",
            };
        });

        return NextResponse.json({ friendships: transformedFriendships });
    } catch (error) {
        console.error("Error fetching friendships:", error);
        return NextResponse.json({ error: "Failed to fetch friendships" }, { status: 500 });
    }
}

// POST: Send friend request
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { requesterId, addresseeEmail } = await request.json();

        if (!requesterId || !addresseeEmail) {
            return NextResponse.json(
                { error: "Requester ID and addressee email are required" },
                { status: 400 }
            );
        }

        // Search for user by display_name in user_profiles
        const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("id, display_name")
            .ilike("display_name", addresseeEmail)
            .limit(1)
            .single();

        if (profileError || !profileData) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (profileData.id === requesterId) {
            return NextResponse.json(
                { error: "You cannot send a friend request to yourself" },
                { status: 400 }
            );
        }

        // Check if already friends or request exists
        const { data: existingFriendship } = await supabase
            .from("friendships")
            .select("*")
            .or(
                `and(requester_id.eq.${requesterId},addressee_id.eq.${profileData.id}),and(requester_id.eq.${profileData.id},addressee_id.eq.${requesterId})`
            )
            .limit(1)
            .maybeSingle();

        if (existingFriendship) {
            return NextResponse.json(
                { error: "Friend request already exists or you are already friends" },
                { status: 400 }
            );
        }

        // Create friend request
        const { data: friendship, error: createError } = await supabase
            .from("friendships")
            .insert({
                requester_id: requesterId,
                addressee_id: profileData.id,
                status: "pending",
            })
            .select()
            .single();

        if (createError) throw createError;

        return NextResponse.json({ friendship });
    } catch (error) {
        console.error("Error creating friend request:", error);
        return NextResponse.json(
            { error: "Failed to send friend request" },
            { status: 500 }
        );
    }
}

// PATCH: Accept/decline/block friend request
export async function PATCH(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { friendshipId, status, userId } = await request.json();

        if (!friendshipId || !status || !userId) {
            return NextResponse.json(
                { error: "Friendship ID, status, and user ID are required" },
                { status: 400 }
            );
        }

        if (!["accepted", "declined", "blocked"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        // Verify user is the addressee (the one receiving the request)
        const { data: friendship, error: fetchError } = await supabase
            .from("friendships")
            .select("*")
            .eq("id", friendshipId)
            .single();

        if (fetchError || !friendship) {
            return NextResponse.json(
                { error: "Friendship not found" },
                { status: 404 }
            );
        }

        if (friendship.addressee_id !== userId) {
            return NextResponse.json(
                { error: "Only the recipient can respond to a friend request" },
                { status: 403 }
            );
        }

        const { data: updated, error: updateError } = await supabase
            .from("friendships")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", friendshipId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ friendship: updated });
    } catch (error) {
        console.error("Error updating friendship:", error);
        return NextResponse.json(
            { error: "Failed to update friend request" },
            { status: 500 }
        );
    }
}

// DELETE: Remove friendship
export async function DELETE(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const friendshipId = searchParams.get("friendshipId");
    const userId = searchParams.get("userId");

    if (!friendshipId || !userId) {
        return NextResponse.json(
            { error: "Friendship ID and user ID are required" },
            { status: 400 }
        );
    }

    try {
        const { error } = await supabase
            .from("friendships")
            .delete()
            .eq("id", friendshipId)
            .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting friendship:", error);
        return NextResponse.json(
            { error: "Failed to remove friend" },
            { status: 500 }
        );
    }
}
