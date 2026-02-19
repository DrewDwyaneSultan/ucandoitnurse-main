import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// POST: Add an item to a folder
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { folderId, userId, itemType, itemId } = await request.json();

        if (!folderId || !userId || !itemType || !itemId) {
            return NextResponse.json(
                { error: "Folder ID, user ID, item type, and item ID are required" },
                { status: 400 }
            );
        }

        // Validate item type
        if (!["book", "flashcard", "shared_flashcard"].includes(itemType)) {
            return NextResponse.json(
                { error: "Invalid item type" },
                { status: 400 }
            );
        }

        // Check if item already exists in folder
        const { data: existing } = await supabase
            .from("folder_items")
            .select("id")
            .eq("folder_id", folderId)
            .eq("item_type", itemType)
            .eq("item_id", itemId)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: "Item already in folder" },
                { status: 400 }
            );
        }

        const { data: folderItem, error } = await supabase
            .from("folder_items")
            .insert({
                folder_id: folderId,
                user_id: userId,
                item_type: itemType,
                item_id: itemId,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ folderItem });
    } catch (error) {
        console.error("Error adding item to folder:", error);
        return NextResponse.json(
            { error: "Failed to add item to folder" },
            { status: 500 }
        );
    }
}

// DELETE: Remove an item from a folder
export async function DELETE(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const userId = searchParams.get("userId");
    const itemType = searchParams.get("itemType");
    const itemId = searchParams.get("itemId");

    if (!folderId || !userId || !itemType || !itemId) {
        return NextResponse.json(
            { error: "Folder ID, user ID, item type, and item ID are required" },
            { status: 400 }
        );
    }

    try {
        const { error } = await supabase
            .from("folder_items")
            .delete()
            .eq("folder_id", folderId)
            .eq("user_id", userId)
            .eq("item_type", itemType)
            .eq("item_id", itemId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing item from folder:", error);
        return NextResponse.json(
            { error: "Failed to remove item from folder" },
            { status: 500 }
        );
    }
}
