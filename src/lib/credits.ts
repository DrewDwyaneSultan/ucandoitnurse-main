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
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient?: any
): Promise<UserCredits> {
    // Use provided client or fall back to default (anon key)
    const db = supabaseClient || supabase;

    if (!userId) {
        return getDefaultCredits("free");
    }

    try {
        // First, check if user has credits record
        const { data: existingCredits, error: creditsError } = await db
            .from("user_credits")
            .select("*")
            .eq("user_id", userId)
            .single();

        // Get user's subscription
        const { data: subscription } = await db
            .from("user_subscriptions")
            .select("plan, status")
            .eq("user_id", userId)
            .eq("status", "active")
            .single();

        const plan = (subscription?.plan || "free") as SubscriptionPlan;
        const planConfig = PLAN_CONFIGS[plan];
        const today = new Date().toISOString().split("T")[0];

        // If no credits record exists, create one
        if (creditsError || !existingCredits) {
            const { error: insertError } = await db
                .from("user_credits")
                .upsert({
                    user_id: userId,
                    credits_used: 0,
                    credits_limit: planConfig.dailyCredits,
                    reset_date: today,
                });

            if (insertError) {
                console.error("Error creating credits:", insertError);
            }

            return {
                creditsUsed: 0,
                creditsLimit: planConfig.dailyCredits,
                creditsRemaining: planConfig.dailyCredits,
                resetDate: today,
                plan,
            };
        }

        // Check if credits need to be reset (new day)
        const lastReset = existingCredits.reset_date;
        if (lastReset !== today) {
            // Reset credits for new day
            await db
                .from("user_credits")
                .update({
                    credits_used: 0,
                    credits_limit: planConfig.dailyCredits,
                    reset_date: today,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId);

            return {
                creditsUsed: 0,
                creditsLimit: planConfig.dailyCredits,
                creditsRemaining: planConfig.dailyCredits,
                resetDate: today,
                plan,
            };
        }

        // Return current credits
        return {
            creditsUsed: existingCredits.credits_used,
            creditsLimit: planConfig.dailyCredits,
            creditsRemaining: Math.max(0, planConfig.dailyCredits - existingCredits.credits_used),
            resetDate: existingCredits.reset_date,
            plan,
        };
    } catch (error) {
        console.error("Error in getUserCredits:", error);
        return getDefaultCredics("free");
    }
}

function getDefaultCredits(plan: SubscriptionPlan): UserCredits {
    return {
        creditsUsed: 0,
        creditsLimit: PLAN_CONFIGS[plan].dailyCredits,
        creditsRemaining: PLAN_CONFIGS[plan].dailyCredits,
        resetDate: new Date().toISOString().split("T")[0],
        plan,
    };
}

/**
 * Check if user has credits available (without using them)
 */
export async function hasCreditsAvailable(userId: string): Promise<boolean> {
    const credits = await getUserCredits(userId);
    return credits.creditsRemaining > 0;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseClient?: any
): Promise<UseCreditsResult> {
    // Use provided client or fall back to default (anon key)
    const db = supabaseClient || supabase;

    if (!userId) {
        return {
            success: false,
            creditsRemaining: 0,
            message: "User not authenticated",
        };
    }

    try {
        // Get current credits (pass the same client)
        const credits = await getUserCredits(userId, db);

        // Check if user has credits
        if (credits.creditsRemaining <= 0) {
            return {
                success: false,
                creditsRemaining: 0,
                message: "No credits remaining. Please upgrade your plan.",
            };
        }

        // Deduct credit
        const { error: updateError } = await db
            .from("user_credits")
            .update({
                credits_used: credits.creditsUsed + 1,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

        if (updateError) {
            console.error("Error updating credits:", updateError);
            return {
                success: false,
                creditsRemaining: credits.creditsRemaining,
                message: "Failed to use credit. Please try again.",
            };
        }

        // Log the usage for analytics
        await db.from("credit_usage").insert({
            user_id: userId,
            action_type: actionType,
            credits_consumed: 1,
            metadata,
        });

        return {
            success: true,
            creditsRemaining: credits.creditsRemaining - 1,
            message: "Credit used successfully.",
        };
    } catch (error) {
        console.error("Error in useCredit:", error);
        return {
            success: false,
            creditsRemaining: 0,
            message: "An error occurred. Please try again.",
        };
    }
}

/**
 * Check if user can upload more books based on their plan
 */
export async function canUploadBook(userId: string): Promise<{ allowed: boolean; message: string; currentCount: number; limit: number }> {
    const credits = await getUserCredits(userId);
    const planConfig = PLAN_CONFIGS[credits.plan];

    // Count user's current books
    const { count, error } = await supabase
        .from("books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    const currentCount = count || 0;
    const limit = planConfig.maxBooks;

    if (error) {
        console.error("Error counting books:", error);
        return { allowed: true, message: "OK", currentCount: 0, limit };
    }

    if (currentCount >= limit) {
        return {
            allowed: false,
            message: `You've reached the ${planConfig.name} plan limit of ${limit} books. Upgrade to add more.`,
            currentCount,
            limit,
        };
    }

    return { allowed: true, message: "OK", currentCount, limit };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string) {
    try {
        const { data, error } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (error && error.code !== "PGRST116") {
            console.error("Error getting subscription:", error);
        }

        return data;
    } catch (error) {
        console.error("Error in getUserSubscription:", error);
        return null;
    }
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

// Fix typo
function getDefaultCredics(plan: SubscriptionPlan): UserCredits {
    return getDefaultCredits(plan);
}
