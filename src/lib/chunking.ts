import type { TextChunk } from "@/types/database.types";

export interface ChunkingOptions {
    chunkSize: number;      // Target size in characters
    overlap: number;        // Overlap between chunks in characters
    minChunkSize: number;   // Minimum chunk size to keep
}

const DEFAULT_OPTIONS: ChunkingOptions = {
    chunkSize: 1000,  // ~250-300 words
    overlap: 100,
    minChunkSize: 100,
};

/**
 * Split text into overlapping chunks for embedding
 * 
 * @param text - The full text to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks with metadata
 */
export function chunkText(
    text: string,
    options: Partial<ChunkingOptions> = {}
): TextChunk[] {
    const { chunkSize, overlap, minChunkSize } = { ...DEFAULT_OPTIONS, ...options };

    // Clean and normalize text
    const cleanedText = text
        .replace(/\s+/g, " ")  // Normalize whitespace
        .trim();

    if (cleanedText.length === 0) {
        return [];
    }

    if (cleanedText.length <= chunkSize) {
        return [{
            text: cleanedText,
            source: "chunk 1",
            index: 0,
        }];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < cleanedText.length) {
        let end = start + chunkSize;

        // If we're not at the end, try to break at a sentence or word boundary
        if (end < cleanedText.length) {
            // Look for sentence boundaries (., !, ?) within the last 20% of the chunk
            const searchStart = start + Math.floor(chunkSize * 0.8);
            const searchText = cleanedText.slice(searchStart, end);

            const sentenceMatch = searchText.match(/[.!?]\s+(?=[A-Z])/g);
            if (sentenceMatch) {
                // Find the last sentence boundary
                const lastMatch = searchText.lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
                if (lastMatch !== -1) {
                    end = searchStart + lastMatch + sentenceMatch[sentenceMatch.length - 1].length;
                }
            } else {
                // Fall back to word boundary
                const lastSpace = cleanedText.lastIndexOf(" ", end);
                if (lastSpace > start) {
                    end = lastSpace;
                }
            }
        }

        const chunkText = cleanedText.slice(start, end).trim();

        if (chunkText.length >= minChunkSize) {
            chunks.push({
                text: chunkText,
                source: `chunk ${chunkIndex + 1}`,
                index: chunkIndex,
            });
            chunkIndex++;
        }

        // Move start with overlap
        start = end - overlap;

        // Ensure we make progress
        const lastIndex = chunks.length > 0 ? chunks[chunks.length - 1].index : -1;
        if (start <= lastIndex) {
            start = end;
        }
    }

    return chunks;
}

/**
 * Estimate token count for text (rough approximation)
 * 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Chunk text by page markers if present
 */
export function chunkByPage(
    text: string,
    pageMarker: RegExp = /\[?Page\s*(\d+)\]?/gi
): TextChunk[] {
    const pages = text.split(pageMarker);
    const chunks: TextChunk[] = [];

    let pageNum = 1;
    for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i].trim();

        // Skip page number markers
        if (/^\d+$/.test(pageText)) {
            pageNum = parseInt(pageText, 10);
            continue;
        }

        if (pageText.length > 0) {
            // If page is too long, sub-chunk it
            if (pageText.length > DEFAULT_OPTIONS.chunkSize * 2) {
                const subChunks = chunkText(pageText);
                subChunks.forEach((chunk, idx) => {
                    chunks.push({
                        ...chunk,
                        source: `page ${pageNum}, part ${idx + 1}`,
                        index: chunks.length,
                    });
                });
            } else {
                chunks.push({
                    text: pageText,
                    source: `page ${pageNum}`,
                    index: chunks.length,
                });
            }
            pageNum++;
        }
    }

    return chunks;
}
