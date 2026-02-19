// ============================================
// AI MODEL CONFIGURATION
// This file is CLIENT-SAFE (no server imports)
// ============================================

export type AIModelId = "gemini-3-flash-preview" | "gemini-2.5-flash" | "gemini-2.5-pro" | "gemini-2.5-flash-lite";

export interface AIModelConfig {
    id: AIModelId;
    name: string;
    description: string;
    speed: "fast" | "medium" | "slow";
    quality: "standard" | "high" | "premium";
    recommended?: boolean;
    isNew?: boolean;
}

export const AI_MODELS: AIModelConfig[] = [
    {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        description: "Latest & fastest",
        speed: "fast",
        quality: "high",
        isNew: true,
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        description: "Fast & efficient",
        speed: "fast",
        quality: "high",
        recommended: true,
    },
    {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "Best quality, complex tasks",
        speed: "slow",
        quality: "premium",
    },
    {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        description: "Lightweight & simple tasks",
        speed: "fast",
        quality: "standard",
    },
];

// Default model
export const DEFAULT_MODEL: AIModelId = "gemini-2.5-flash";
