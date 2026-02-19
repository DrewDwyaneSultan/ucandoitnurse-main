import { supabase } from "./supabase";

export type SubscriptionPlan = "free" | "starter" | "pro" | "unlimited";

export interface UserCredits {
    creditsUsed: number;
    creditsLimit: number;
    creditsRemaining: number;
    resetDate: string;
    plan: SubscriptionPlan;
}

export interface UseCreditsResult {
    success: boolean;
    creditsRemaining: number;
    message: string;
}

// ============================================
// PLAN CONFIGURATIONS - BASED ON ACTUAL FEATURES
// ============================================
// What costs money: AI flashcard generation (Gemini API calls)
// Avg cost per generation: ~$0.001-0.005 (very affordable)
// Credits logic (app is now free, but this module remains for legacy reasons)

export const PLAN_CONFIGS = {
    free: {
        name: "Free",
        price: 0,
        pricePHP: 0,
        dailyCredits: 3,
        maxBooks: 2,
        features: [
            "3 AI credits/day",
            "2 books max",
            "Basic tracking",
        ],
        description: "Try it out",
    },
    starter: {
        name: "Starter",
        price: 1.99,
        pricePHP: 99,
        dailyCredits: 15,
        maxBooks: 5,
        features: [
            "15 AI credits/day",
            "5 books max",
            "Priority AI",
            "Analytics",
        ],
        description: "Regular study",
    },
    pro: {
        name: "Pro",
        price: 3.99,
        pricePHP: 199,
        dailyCredits: 50,
        maxBooks: 20,
        features: [
            "50 AI credits/day",
            "20 books max",
            "Advanced analytics",
            "Export cards",
            "Priority support",
        ],
        description: "Serious prep",
    },
    unlimited: {
        name: "Unlimited",
        price: 7.99,
        pricePHP: 399,
        dailyCredits: 9999,
        maxBooks: 999,
        features: [
            "Unlimited credits",
            "Unlimited books",
            "All Pro features",
            "Early access",
        ],
        description: "Power users",
    },
} as const;

// ============================================
// CREDIT MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get user's current credits and subscription info
 * Creates default free tier if no credits exist
 * 
 * @param userId - The user's ID
 * @param supabaseClient - Optional Supabase client (use service role client from server-side code to bypass RLS)
 */
export async function getUserCredits(
    userId: string
): Promise<UserCredits> {
    // Pricing removed: always return unlimited/free credits
    void userId;
    const today = new Date().toISOString().split("T")[0];
    return {
        creditsUsed: 0,
        creditsLimit: Number.MAX_SAFE_INTEGER,
        creditsRemaining: Number.MAX_SAFE_INTEGER,
        resetDate: today,
        plan: "unlimited",
    };
}

/**
 * Check if user has credits available (without using them)
 */
export async function hasCreditsAvailable(userId: string): Promise<boolean> {
    // always true now that everything is free
    void userId;
    return true;
}

/**
 * Use a credit for an action (e.g., generating flashcards)
 * Returns success/failure and remaining credits
 * 
 * @param userId - The user's ID
 * @param actionType - Type of action (for analytics)
 * @param metadata - Additional metadata (for analytics)
 * @param supabaseClient - Optional Supabase client (use service role client from server-side code to bypass RLS)
 */
export async function consumeCredit(
    userId: string,
    actionType: string = "flashcard_generation",
    metadata: Record<string, unknown> = {},
): Promise<UseCreditsResult> {
    // no-op: always succeed and return huge remaining
    void actionType;
    void metadata;
    if (!userId) {
        return { success: false, creditsRemaining: 0, message: "User not authenticated" };
    }
    return { success: true, creditsRemaining: Number.MAX_SAFE_INTEGER, message: "Credit used successfully" };
}

/**
 * Check if user can upload more books based on their plan
 */
export async function canUploadBook(userId: string): Promise<{ allowed: boolean; message: string; currentCount: number; limit: number }> {
    // always allow uploads unlimited
    void userId;
    return { allowed: true, message: "OK", currentCount: 0, limit: Number.MAX_SAFE_INTEGER };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string) {
    // subscriptions removed
    void userId;
    return null;
}

/**
 * Create or update user subscription (called after payment success)
 * 
 * @param userId - The user's ID
 * @param plan - The subscription plan to activate
 * @param paymentDetails - Optional payment details from PayMongo
 * @param supabaseClient - Optional Supabase client (use service role client from server-side code to bypass RLS)
 */
export async function activateSubscription(
    userId: string,
    plan: SubscriptionPlan,
    paymentDetails?: {
        paymongoPaymentId?: string;
        paymongoSubscriptionId?: string;
        periodStart?: Date;
        periodEnd?: Date;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient?: any // Accept any Supabase client instance
) {
    // Use provided client or fall back to default (anon key)
    const db = supabaseClient || supabase;

    const now = new Date();
    const periodEnd = paymentDetails?.periodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error } = await db
        .from("user_subscriptions")
        .upsert(
            {
                user_id: userId,
                plan,
                status: "active",
                stripe_customer_id: paymentDetails?.paymongoPaymentId, // Using stripe field for PayMongo ID
                stripe_subscription_id: paymentDetails?.paymongoSubscriptionId,
                current_period_start: paymentDetails?.periodStart?.toISOString() || now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: now.toISOString(),
            },
            { onConflict: "user_id" } // Specify conflict resolution on user_id
        );

    if (error) {
        console.error("Error activating subscription:", error);
        throw error;
    }

    // Update credits limit based on new plan
    const planConfig = PLAN_CONFIGS[plan];
    await db
        .from("user_credits")
        .upsert(
            {
                user_id: userId,
                credits_limit: planConfig.dailyCredits,
                credits_used: 0, // Reset credits on upgrade
                reset_date: now.toISOString().split("T")[0],
                updated_at: now.toISOString(),
            },
            { onConflict: "user_id" } // Specify conflict resolution on user_id
        );

    return { success: true };
}

/**
 * Cancel user subscription
 */
export async function cancelSubscription(userId: string) {
    const { error } = await supabase
        .from("user_subscriptions")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    if (error) {
        console.error("Error cancelling subscription:", error);
        throw error;
    }

    // Downgrade to free plan credits
    await supabase
        .from("user_credits")
        .update({
            credits_limit: PLAN_CONFIGS.free.dailyCredits,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
}

// (legacy) pricing/credits helpers removed
