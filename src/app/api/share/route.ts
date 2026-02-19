import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch shared flashcards (received by user)
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "received"; // received, sent

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // First, fetch shared flashcards
        let query = supabase.from("shared_flashcards").select("*");

        if (type === "received") {
            query = query.eq("recipient_id", userId);
        } else if (type === "sent") {
            query = query.eq("sender_id", userId);
        }

        const { data: sharedCards, error: sharedError } = await query.order("created_at", { ascending: false });

        if (sharedError) throw sharedError;

        if (!sharedCards || sharedCards.length === 0) {
            return NextResponse.json({ sharedFlashcards: [] });
        }

        // Get all unique flashcard IDs and user IDs
        const flashcardIds = [...new Set(sharedCards.map((s) => s.flashcard_id))];
        const userIds = new Set<string>();
        sharedCards.forEach((s) => {
            userIds.add(s.sender_id);
            userIds.add(s.recipient_id);
        });

        // Fetch flashcards
        const { data: flashcards, error: flashcardsError } = await supabase
            .from("flashcards")
            .select("*")
            .in("id", flashcardIds);

        if (flashcardsError) {
            console.warn("Could not fetch flashcards:", flashcardsError);
        }

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
            .from("user_profiles")
            .select("*")
            .in("id", Array.from(userIds));

        if (profilesError) {
            console.warn("Could not fetch profiles:", profilesError);
        }

        // Create maps for quick lookup
        const flashcardMap = new Map(flashcards?.map((f) => [f.id, f]) || []);
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // Transform data
        const transformedShared = sharedCards
            .map((s) => ({
                ...s,
                flashcard: flashcardMap.get(s.flashcard_id) || null,
                sender: profileMap.get(s.sender_id) || {
                    id: s.sender_id,
                    display_name: "Unknown User",
                    avatar_url: null,
                    bio: null
                },
                recipient: profileMap.get(s.recipient_id) || {
                    id: s.recipient_id,
                    display_name: "Unknown User",
                    avatar_url: null,
                    bio: null
                },
            }))
            .filter((s) => s.flashcard !== null); // Only include if flashcard exists

        return NextResponse.json({ sharedFlashcards: transformedShared });
    } catch (error) {
        console.error("Error fetching shared flashcards:", error);
        return NextResponse.json(
            { error: "Failed to fetch shared flashcards" },
            { status: 500 }
        );
    }
}

// POST: Share a flashcard with a friend
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { flashcardId, senderId, recipientId, message } = await request.json();

        if (!flashcardId || !senderId || !recipientId) {
            return NextResponse.json(
                { error: "Flashcard ID, sender ID, and recipient ID are required" },
                { status: 400 }
            );
        }

        // Verify they are friends
        const { data: friendship, error: friendError } = await supabase
            .from("friendships")
            .select("*")
            .eq("status", "accepted")
            .or(
                `and(requester_id.eq.${senderId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${senderId})`
            )
            .limit(1)
            .maybeSingle();

        if (friendError || !friendship) {
            return NextResponse.json(
                { error: "You can only share cards with friends" },
                { status: 403 }
            );
        }

        // Check if already shared
        const { data: existingShare } = await supabase
            .from("shared_flashcards")
            .select("*")
            .eq("flashcard_id", flashcardId)
            .eq("sender_id", senderId)
            .eq("recipient_id", recipientId)
            .maybeSingle();

        if (existingShare) {
            return NextResponse.json(
                { error: "This card has already been shared with this friend" },
                { status: 400 }
            );
        }

        // Share the flashcard
        const { data: shared, error: shareError } = await supabase
            .from("shared_flashcards")
            .insert({
                flashcard_id: flashcardId,
                sender_id: senderId,
                recipient_id: recipientId,
                message: message || null,
            })
            .select()
            .single();

        if (shareError) throw shareError;

        return NextResponse.json({ shared });
    } catch (error) {
        console.error("Error sharing flashcard:", error);
        return NextResponse.json(
            { error: "Failed to share flashcard" },
            { status: 500 }
        );
    }
}

// PATCH: Mark shared flashcard as read
export async function PATCH(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { sharedId, userId } = await request.json();

        if (!sharedId || !userId) {
            return NextResponse.json(
                { error: "Shared ID and user ID are required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("shared_flashcards")
            .update({ is_read: true })
            .eq("id", sharedId)
            .eq("recipient_id", userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ shared: data });
    } catch (error) {
        console.error("Error updating shared flashcard:", error);
        return NextResponse.json(
            { error: "Failed to mark as read" },
            { status: 500 }
        );
    }
}

// DELETE: Remove shared flashcard
export async function DELETE(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const sharedId = searchParams.get("sharedId");
    const userId = searchParams.get("userId");

    if (!sharedId || !userId) {
        return NextResponse.json(
            { error: "Shared ID and user ID are required" },
            { status: 400 }
        );
    }

    try {
        const { error } = await supabase
            .from("shared_flashcards")
            .delete()
            .eq("id", sharedId)
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting shared flashcard:", error);
        return NextResponse.json(
            { error: "Failed to remove shared card" },
            { status: 500 }
        );
    }
}
