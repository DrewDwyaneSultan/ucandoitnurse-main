import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// Re-export model configs from client-safe file
export { AI_MODELS, DEFAULT_MODEL, type AIModelId, type AIModelConfig } from "./ai-models";
import { type AIModelId, DEFAULT_MODEL } from "./ai-models";

// Initialize Genkit with Google GenAI plugin
export const ai = genkit({
    plugins: [googleAI()],
});

// Generate embeddings for text using Gemini
export async function createEmbedding(text: string): Promise<number[]> {
    try {
        const response = await ai.embed({
            embedder: googleAI.embedder("text-embedding-004"),
            content: text,
        });

        return response[0].embedding;
    } catch (error) {
        console.error("Embedding creation failed:", error);
        throw error;
    }
}

// Generate embeddings for multiple texts (batch)
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
        texts.map((text) => createEmbedding(text))
    );
    return embeddings;
}

// Flashcard generation prompt template
export const FLASHCARD_PROMPT = `You are an elite nursing educator and subject matter expert specializing in PNLE (Philippine Nursing Licensure Examination) and NCLEX-RN/NCLEX-PN question creation.

Your task is to generate high-quality, open-ended flashcard questions based on the provided nursing content. These are NOT multiple choice questions.

=== CRITICAL INSTRUCTIONS ===

1. QUESTION FORMAT:
   - Create questions in the PNLE/NCLEX clinical application style
   - Questions should test critical thinking, clinical judgment, and nursing process application
   - Use scenarios that assess priority setting, delegation, patient safety, and therapeutic communication
   - Questions must be clear, concise, and professionally worded
   - DO NOT create multiple choice options

2. ANSWER FORMAT:
   - The correct answer must be ONE SENTENCE or a FEW WORDS only
   - Be precise and direct - no lengthy explanations in the answer field
   - Example good answers: "Assess the airway first", "Elevate the affected limb", "Notify the physician immediately"

3. EXPLANATION FORMAT (CRITICAL):
   - Provide a comprehensive, accurate explanation (2-4 sentences)
   - MUST include at least one FACT directly from the source material
   - Use phrases like: "According to the text...", "The source states...", "Based on the content..."
   - Explain the clinical reasoning behind the correct answer
   - Include relevant nursing principles, pathophysiology, or pharmacology as applicable

4. HINT FORMAT:
   - Provide a subtle hint that guides thinking without revealing the answer
   - Example: "Think about the ABCs of emergency care" or "Consider Maslow's hierarchy"

5. ACCURACY REQUIREMENT:
   - ONLY use information from the provided source chunks
   - Do NOT fabricate facts or statistics
   - If information is unclear, do not guess - use what is explicitly stated

=== SOURCE CONTENT ===
{chunks}

=== OUTPUT FORMAT (JSON array) ===
Generate exactly {count} flashcards in this format:
[
  {
    "question": "A patient with Type 2 diabetes presents with polyuria, polydipsia, and a blood glucose of 450 mg/dL. What is the priority nursing intervention?",
    "correctAnswer": "Assess for signs of diabetic ketoacidosis",
    "explanation": "FACT: According to the source, blood glucose levels above 400 mg/dL require immediate assessment for DKA. The nurse must first assess for Kussmaul breathing, fruity breath odor, and altered mental status before administering interventions. Early recognition prevents life-threatening complications.",
    "hint": "Think about the most dangerous complication of uncontrolled hyperglycemia",
    "sourceChunkIds": ["chunk-id-1"]
  }
]

Generate {count} PNLE/NCLEX-style open-ended flashcards now:`;

// Retry helper with exponential backoff
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const errorMessage = lastError.message || "";

            if (errorMessage.includes("503") ||
                errorMessage.includes("overloaded") ||
                errorMessage.includes("UNAVAILABLE")) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }

    throw lastError;
}

// Generate flashcards from chunks using specified model
export async function generateFlashcards(
    chunks: { id: string; text: string; source: string }[],
    count: number = 5,
    modelId: AIModelId = DEFAULT_MODEL
): Promise<{
    question: string;
    choices: string[];
    correctAnswer: string;
    explanation: string;
    hint?: string;
    sourceChunkIds: string[];
}[]> {
    const chunksText = chunks
        .map((c, i) => `[Chunk ${i + 1} - ID: ${c.id}]\n${c.text}\nSource: ${c.source}`)
        .join("\n\n---\n\n");

    const prompt = FLASHCARD_PROMPT
        .replace(/{count}/g, count.toString())
        .replace("{chunks}", chunksText);

    // Models to try: user's choice first, then fallbacks
    const fallbackModels: AIModelId[] = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
    const models = [modelId, ...fallbackModels.filter(m => m !== modelId)];

    let lastError: Error | null = null;

    for (const currentModel of models) {
        try {
            console.log(`Trying model: ${currentModel}`);

            const { text } = await withRetry(async () => {
                return await ai.generate({
                    model: googleAI.model(currentModel),
                    prompt,
                    config: {
                        temperature: 0.5,
                    },
                });
            }, 2, 2000);

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("No JSON array found in response");
            }
            const parsed = JSON.parse(jsonMatch[0]);

            return parsed.map((card: { question: string; correctAnswer: string; explanation: string; hint?: string; sourceChunkIds: string[] }) => ({
                ...card,
                choices: [],
            }));

        } catch (error) {
            lastError = error as Error;
            const errorMessage = lastError.message || "";
            console.error(`Model ${currentModel} failed:`, errorMessage);

            if (errorMessage.includes("429") ||
                errorMessage.includes("quota") ||
                errorMessage.includes("RESOURCE_EXHAUSTED")) {
                throw lastError;
            }
        }
    }

    console.error("All models failed. Last error:", lastError);
    if (lastError) {
        throw lastError;
    }
    throw new Error("AI service unavailable. Please try again later.");
}
