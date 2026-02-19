import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch flashcard sets for a folder OR a single set by ID
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const userId = searchParams.get("userId");
    const setId = searchParams.get("setId");

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        );
    }

    try {
        // If setId is provided, fetch a single set
        if (setId) {
            const { data: set, error: setError } = await supabase
                .from("flashcard_sets")
                .select("*")
                .eq("id", setId)
                .eq("user_id", userId)
                .single();

            if (setError) throw setError;

            // Fetch items and flashcards for this set
            const { data: items } = await supabase
                .from("flashcard_set_items")
                .select("*")
                .eq("set_id", setId)
                .order("position", { ascending: true });

            const flashcardIds = items?.map((i) => i.flashcard_id) || [];

            let flashcards: unknown[] = [];
            if (flashcardIds.length > 0) {
                const { data: flashcardsData } = await supabase
                    .from("flashcards")
                    .select("*")
                    .in("id", flashcardIds);
                flashcards = flashcardsData || [];
            }

            return NextResponse.json({
                set: {
                    ...set,
                    items: items || [],
                    flashcards,
                },
            });
        }

        // Otherwise, fetch all sets for a folder
        if (!folderId) {
            return NextResponse.json(
                { error: "Folder ID or Set ID is required" },
                { status: 400 }
            );
        }

        // Fetch sets for the folder
        const { data: sets, error: setsError } = await supabase
            .from("flashcard_sets")
            .select("*")
            .eq("folder_id", folderId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (setsError) throw setsError;

        // For each set, fetch its items and flashcards
        const setsWithItems = await Promise.all(
            (sets || []).map(async (set) => {
                const { data: items } = await supabase
                    .from("flashcard_set_items")
                    .select("*")
                    .eq("set_id", set.id)
                    .order("position", { ascending: true });

                const flashcardIds = items?.map((i) => i.flashcard_id) || [];

                let flashcards: unknown[] = [];
                if (flashcardIds.length > 0) {
                    const { data: flashcardsData } = await supabase
                        .from("flashcards")
                        .select("*")
                        .in("id", flashcardIds);
                    flashcards = flashcardsData || [];
                }

                return {
                    ...set,
                    items: items || [],
                    flashcards,
                };
            })
        );

        return NextResponse.json({ sets: setsWithItems });
    } catch (error) {
        console.error("Error fetching flashcard sets:", error);
        return NextResponse.json(
            { error: "Failed to fetch flashcard sets" },
            { status: 500 }
        );
    }
}

// POST: Create a new flashcard set from two flashcards
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { folderId, userId, flashcardIds, name } = await request.json();

        if (!folderId || !userId || !flashcardIds || flashcardIds.length < 2) {
            return NextResponse.json(
                { error: "Folder ID, User ID, and at least 2 flashcard IDs are required" },
                { status: 400 }
            );
        }

        // Create the set
        const { data: set, error: setError } = await supabase
            .from("flashcard_sets")
            .insert({
                folder_id: folderId,
                user_id: userId,
                name: name || "New Set",
            })
            .select()
            .single();

        if (setError) throw setError;

        // Add flashcards to the set
        const setItems = flashcardIds.map((flashcardId: string, index: number) => ({
            set_id: set.id,
            flashcard_id: flashcardId,
            position: index,
        }));

        const { error: itemsError } = await supabase
            .from("flashcard_set_items")
            .insert(setItems);

        if (itemsError) throw itemsError;

        // Remove these flashcards from folder_items (they're now in a set)
        for (const flashcardId of flashcardIds) {
            await supabase
                .from("folder_items")
                .delete()
                .eq("folder_id", folderId)
                .eq("item_id", flashcardId)
                .eq("item_type", "flashcard");
        }

        return NextResponse.json({ set });
    } catch (error) {
        console.error("Error creating flashcard set:", error);
        return NextResponse.json(
            { error: "Failed to create flashcard set" },
            { status: 500 }
        );
    }
}

// PATCH: Add flashcard to existing set, update set details, or merge sets
export async function PATCH(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { setId, userId, flashcardId, name, folderId, sourceSetId } = await request.json();

        if (!setId || !userId) {
            return NextResponse.json(
                { error: "Set ID and User ID are required" },
                { status: 400 }
            );
        }

        // If updating name
        if (name !== undefined) {
            const { error } = await supabase
                .from("flashcard_sets")
                .update({ name })
                .eq("id", setId)
                .eq("user_id", userId);

            if (error) throw error;
        }

        // If merging another set into this one
        if (sourceSetId) {
            // Get all flashcards from the source set
            const { data: sourceItems } = await supabase
                .from("flashcard_set_items")
                .select("flashcard_id")
                .eq("set_id", sourceSetId);

            if (sourceItems && sourceItems.length > 0) {
                // Get current max position in target set
                const { data: existingItems } = await supabase
                    .from("flashcard_set_items")
                    .select("position")
                    .eq("set_id", setId)
                    .order("position", { ascending: false })
                    .limit(1);

                let nextPosition = (existingItems?.[0]?.position ?? -1) + 1;

                // Move flashcards to target set
                for (const item of sourceItems) {
                    await supabase
                        .from("flashcard_set_items")
                        .insert({
                            set_id: setId,
                            flashcard_id: item.flashcard_id,
                            position: nextPosition++,
                        });
                }

                // Delete items from source set
                await supabase
                    .from("flashcard_set_items")
                    .delete()
                    .eq("set_id", sourceSetId);

                // Delete source set
                await supabase
                    .from("flashcard_sets")
                    .delete()
                    .eq("id", sourceSetId)
                    .eq("user_id", userId);
            }
        }

        // If adding a flashcard to the set
        if (flashcardId) {
            // Get current max position
            const { data: existingItems } = await supabase
                .from("flashcard_set_items")
                .select("position")
                .eq("set_id", setId)
                .order("position", { ascending: false })
                .limit(1);

            const nextPosition = (existingItems?.[0]?.position ?? -1) + 1;

            // Add the flashcard to the set
            const { error: addError } = await supabase
                .from("flashcard_set_items")
                .insert({
                    set_id: setId,
                    flashcard_id: flashcardId,
                    position: nextPosition,
                });

            if (addError) throw addError;

            // Remove from folder_items
            if (folderId) {
                await supabase
                    .from("folder_items")
                    .delete()
                    .eq("folder_id", folderId)
                    .eq("item_id", flashcardId)
                    .eq("item_type", "flashcard");
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating flashcard set:", error);
        return NextResponse.json(
            { error: "Failed to update flashcard set" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a flashcard set (moves flashcards back to folder)
export async function DELETE(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("setId");
    const userId = searchParams.get("userId");
    const folderId = searchParams.get("folderId");

    if (!setId || !userId) {
        return NextResponse.json(
            { error: "Set ID and User ID are required" },
            { status: 400 }
        );
    }

    try {
        // Get the flashcards in the set
        const { data: items } = await supabase
            .from("flashcard_set_items")
            .select("flashcard_id")
            .eq("set_id", setId);

        // Move flashcards back to folder_items
        if (items && items.length > 0 && folderId) {
            const folderItems = items.map((item) => ({
                folder_id: folderId,
                user_id: userId,
                item_type: "flashcard" as const,
                item_id: item.flashcard_id,
            }));

            await supabase.from("folder_items").insert(folderItems);
        }

        // Delete the set (cascades to set_items)
        const { error } = await supabase
            .from("flashcard_sets")
            .delete()
            .eq("id", setId)
            .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting flashcard set:", error);
        return NextResponse.json(
            { error: "Failed to delete flashcard set" },
            { status: 500 }
        );
    }
}
