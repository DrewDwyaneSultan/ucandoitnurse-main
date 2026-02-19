import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/paymongo";
import { PLAN_CONFIGS, type SubscriptionPlan } from "@/lib/credits";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client for server-side
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, plan, email, currentPlan } = body as {
            userId: string;
            plan: SubscriptionPlan;
            email?: string;
            currentPlan?: SubscriptionPlan;
        };

        if (!userId || !plan) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (plan === "free") {
            return NextResponse.json(
                { error: "Free plan doesn't require payment" },
                { status: 400 }
            );
        }

        // Calculate prorated amount for upgrades
        let proratedAmount: number | undefined;
        let isUpgrade = false;

        if (currentPlan && currentPlan !== "free" && currentPlan !== plan) {
            const currentPlanPrice = PLAN_CONFIGS[currentPlan].pricePHP;
            const newPlanPrice = PLAN_CONFIGS[plan].pricePHP;

            // Only apply proration if upgrading to a higher tier
            if (newPlanPrice > currentPlanPrice) {
                proratedAmount = newPlanPrice - currentPlanPrice;
                isUpgrade = true;
            }
        }

        // Create PayMongo checkout session
        const result = await createCheckoutSession(userId, plan, email, proratedAmount);

        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Store the pending payment in database
        await supabase.from("pending_payments").insert({
            user_id: userId,
            session_id: result.sessionId,
            plan: plan,
            status: "pending",
            created_at: new Date().toISOString(),
        });

        return NextResponse.json({
            checkoutUrl: result.checkoutUrl,
            sessionId: result.sessionId,
            isUpgrade,
            proratedAmount,
        });
    } catch (error) {
        console.error("Payment creation error:", error);
        return NextResponse.json(
            { error: "Failed to create payment session" },
            { status: 500 }
        );
    }
}
