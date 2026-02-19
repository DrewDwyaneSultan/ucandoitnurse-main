import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();

        // Get form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const userId = formData.get("userId") as string | null;
        const title = formData.get("title") as string | null;

        // Validate inputs
        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only PDF files are allowed." },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 50MB." },
                { status: 400 }
            );
        }

        // Generate unique book ID
        const bookId = crypto.randomUUID();
        const fileName = `${userId}/books/${bookId}.pdf`;
        const bookTitle = title || file.name.replace(/\.pdf$/i, "");

        // Convert file to buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("books")
            .upload(fileName, buffer, {
                contentType: "application/pdf",
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload file: " + uploadError.message },
                { status: 500 }
            );
        }

        // Create book record in database
        const { data: book, error: dbError } = await supabase
            .from("books")
            .insert({
                id: bookId,
                user_id: userId,
                title: bookTitle,
                file_path: fileName,
                status: "processing",
            })
            .select()
            .single();

        if (dbError) {
            // Rollback: delete uploaded file
            await supabase.storage.from("books").remove([fileName]);
            console.error("Database insert error:", dbError);
            return NextResponse.json(
                { error: "Failed to create book record: " + dbError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            book,
            message: "Book uploaded successfully. Processing will begin shortly.",
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
