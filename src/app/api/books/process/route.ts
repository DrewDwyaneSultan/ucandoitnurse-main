import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { chunkText } from "@/lib/chunking";
import { PdfReader } from "pdfreader";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

// Use pdfreader for memory-efficient streaming PDF text extraction
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    // Write buffer to temp file since pdfreader works with file paths
    const tempPath = join(tmpdir(), `pdf-${randomUUID()}.pdf`);
    await writeFile(tempPath, buffer);

    try {
        return await new Promise<string>((resolve, reject) => {
            const rows: { [key: number]: string[] } = {};
            let currentPage = 1;
            const pages: string[] = [];

            new PdfReader().parseFileItems(tempPath, (err, item) => {
                if (err) {
                    return reject(err);
                }

                if (!item) {
                    // EOF - compile the last page and resolve
                    if (Object.keys(rows).length > 0) {
                        const pageText = Object.keys(rows)
                            .sort((a, b) => Number(a) - Number(b))
                            .map((y) => rows[Number(y)].join(" "))
                            .join("\n");
                        pages.push(`[Page ${currentPage}]\n${pageText}`);
                    }
                    return resolve(pages.join("\n\n"));
                }

                if (item.page) {
                    // New page - save previous page content
                    if (Object.keys(rows).length > 0) {
                        const pageText = Object.keys(rows)
                            .sort((a, b) => Number(a) - Number(b))
                            .map((y) => rows[Number(y)].join(" "))
                            .join("\n");
                        pages.push(`[Page ${currentPage}]\n${pageText}`);
                    }
                    currentPage = item.page;
                    // Clear rows for new page
                    Object.keys(rows).forEach((key) => delete rows[Number(key)]);
                }

                if (item.text) {
                    // Group text by Y position (row)
                    const y = item.y ?? 0;
                    (rows[y] = rows[y] || []).push(item.text);
                }
            });
        });
    } finally {
        // Clean up temp file
        await unlink(tempPath).catch(() => { });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createServerClient();
        const { bookId, userId } = await request.json();

        if (!bookId || !userId) {
            return NextResponse.json(
                { error: "Book ID and User ID are required" },
                { status: 400 }
            );
        }

        // Get book record
        const { data: book, error: bookError } = await supabase
            .from("books")
            .select("*")
            .eq("id", bookId)
            .eq("user_id", userId)
            .single();

        if (bookError || !book) {
            return NextResponse.json(
                { error: "Book not found" },
                { status: 404 }
            );
        }

        // Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from("books")
            .download(book.file_path);

        if (downloadError || !fileData) {
            await updateBookStatus(supabase, bookId, "failed");
            return NextResponse.json(
                { error: "Failed to download PDF: " + downloadError?.message },
                { status: 500 }
            );
        }

        // Parse PDF
        const buffer = Buffer.from(await fileData.arrayBuffer());
        let fullText: string;

        try {
            fullText = await extractTextFromPdf(buffer);
        } catch (parseError) {
            await updateBookStatus(supabase, bookId, "failed");
            console.error("PDF parse error:", parseError);
            return NextResponse.json(
                { error: "Failed to parse PDF. The file may be corrupted or password-protected." },
                { status: 400 }
            );
        }

        if (!fullText || fullText.trim().length === 0) {
            await updateBookStatus(supabase, bookId, "failed");
            return NextResponse.json(
                { error: "No text content found in PDF. It may be a scanned document." },
                { status: 400 }
            );
        }

        // Chunk the text
        const chunks = chunkText(fullText, {
            chunkSize: 1000,
            overlap: 100,
            minChunkSize: 50,
        });

        if (chunks.length === 0) {
            await updateBookStatus(supabase, bookId, "failed");
            return NextResponse.json(
                { error: "Failed to create text chunks from PDF" },
                { status: 400 }
            );
        }

        // Insert chunks into database
        const chunkInserts = chunks.map((chunk) => ({
            user_id: userId,
            book_id: bookId,
            chunk_text: chunk.text,
            source: chunk.source,
        }));

        const batchSize = 100;
        for (let i = 0; i < chunkInserts.length; i += batchSize) {
            const batch = chunkInserts.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from("book_chunks")
                .insert(batch);

            if (insertError) {
                console.error("Chunk insert error:", insertError);
                await updateBookStatus(supabase, bookId, "failed");
                return NextResponse.json(
                    { error: "Failed to store text chunks: " + insertError.message },
                    { status: 500 }
                );
            }
        }

        // Update book with chunk count
        await supabase
            .from("books")
            .update({ total_chunks: chunks.length })
            .eq("id", bookId);

        return NextResponse.json({
            success: true,
            bookId,
            totalChunks: chunks.length,
            message: "PDF processed successfully. Ready for embedding generation.",
        });
    } catch (error) {
        console.error("Process error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

async function updateBookStatus(
    supabase: ReturnType<typeof createServerClient>,
    bookId: string,
    status: "processing" | "ready" | "failed"
) {
    await supabase.from("books").update({ status }).eq("id", bookId);
}
