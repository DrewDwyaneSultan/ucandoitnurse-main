import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET: Fetch user's folders
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const folderId = searchParams.get("folderId");

    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
        // If folderId is provided, fetch single folder with items
        if (folderId) {
            const { data: folder, error: folderError } = await supabase
                .from("folders")
                .select("*")
                .eq("id", folderId)
                .eq("user_id", userId)
                .single();

            if (folderError) throw folderError;

            // Fetch folder items
            const { data: items, error: itemsError } = await supabase
                .from("folder_items")
                .select("*")
                .eq("folder_id", folderId)
                .order("created_at", { ascending: false });

            if (itemsError) throw itemsError;

            // Group items by type and fetch details
            const bookIds = items?.filter(i => i.item_type === "book").map(i => i.item_id) || [];
            const flashcardIds = items?.filter(i => i.item_type === "flashcard").map(i => i.item_id) || [];

            let books = [];
            let flashcards = [];

            if (bookIds.length > 0) {
                const { data } = await supabase
                    .from("books")
                    .select("*")
                    .in("id", bookIds);
                books = data || [];
            }

            if (flashcardIds.length > 0) {
                const { data } = await supabase
                    .from("flashcards")
                    .select("*")
                    .in("id", flashcardIds);
                flashcards = data || [];
            }

            return NextResponse.json({
                folder: {
                    ...folder,
                    items,
                    books,
                    flashcards,
                },
            });
        }

        // Fetch all folders for user
        const { data: folders, error } = await supabase
            .from("folders")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ folders: folders || [] });
    } catch (error) {
        console.error("Error fetching folders:", error);
        return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }
}

// POST: Create a new folder
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { userId, name, description, color, icon } = await request.json();

        if (!userId || !name) {
            return NextResponse.json(
                { error: "User ID and folder name are required" },
                { status: 400 }
            );
        }

        const { data: folder, error } = await supabase
            .from("folders")
            .insert({
                user_id: userId,
                name: name.trim(),
                description: description?.trim() || null,
                color: color || "#5B79A6",
                icon: icon || "folder",
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ folder });
    } catch (error) {
        console.error("Error creating folder:", error);
        return NextResponse.json(
            { error: "Failed to create folder" },
            { status: 500 }
        );
    }
}

// PATCH: Update a folder
export async function PATCH(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { folderId, userId, name, description, color, icon } = await request.json();

        if (!folderId || !userId) {
            return NextResponse.json(
                { error: "Folder ID and user ID are required" },
                { status: 400 }
            );
        }

        const updateData: Record<string, string | null> = {
            updated_at: new Date().toISOString(),
        };

        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (color !== undefined) updateData.color = color;
        if (icon !== undefined) updateData.icon = icon;

        const { data: folder, error } = await supabase
            .from("folders")
            .update(updateData)
            .eq("id", folderId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ folder });
    } catch (error) {
        console.error("Error updating folder:", error);
        return NextResponse.json(
            { error: "Failed to update folder" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a folder
export async function DELETE(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const userId = searchParams.get("userId");

    if (!folderId || !userId) {
        return NextResponse.json(
            { error: "Folder ID and user ID are required" },
            { status: 400 }
        );
    }

    try {
        const { error } = await supabase
            .from("folders")
            .delete()
            .eq("id", folderId)
            .eq("user_id", userId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting folder:", error);
        return NextResponse.json(
            { error: "Failed to delete folder" },
            { status: 500 }
        );
    }
}
