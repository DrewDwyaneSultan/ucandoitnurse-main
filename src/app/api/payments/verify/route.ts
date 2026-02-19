import { NextRequest, NextResponse } from "next/server";
import { activateSubscription, type SubscriptionPlan, PLAN_CONFIGS } from "@/lib/credits";
import { getCheckoutSession } from "@/lib/paymongo";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Payment Verification Endpoint
 * 
 * This is called from the success page after PayMongo redirects back.
 * It works as a fallback/confirmation alongside the webhook handler.
 * 
 * Flow:
 * 1. User completes payment on PayMongo
 * 2. PayMongo sends webhook (primary path) AND redirects user here (secondary path)
 * 3. This endpoint checks if webhook already processed the payment
 * 4. If not, it verifies with PayMongo API and activates subscription
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { userId, plan } = body as {
            sessionId?: string;
            userId: string;
            plan: SubscriptionPlan;
        };
        let sessionId = body.sessionId;

        if (!userId || !plan) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // If sessionId not provided, look it up from pending_payments
        // This is needed because PayMongo doesn't support {CHECKOUT_SESSION_ID} placeholder like Stripe
        if (!sessionId) {
            console.log(`[Payment Verify] Looking up pending payment for user: ${userId}, plan: ${plan}`);

            const { data: pendingPayment, error: lookupError } = await supabase
                .from("pending_payments")
                .select("session_id, status")
                .eq("user_id", userId)
                .eq("plan", plan)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (lookupError || !pendingPayment) {
                console.error("[Payment Verify] No pending payment found:", lookupError);

                // Check if maybe the subscription was already activated via webhook
                const { data: activeSub } = await supabase
                    .from("user_subscriptions")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("plan", plan)
                    .eq("status", "active")
                    .single();

                if (activeSub) {
                    console.log("[Payment Verify] Subscription already active via webhook");
                    return NextResponse.json({
                        success: true,
                        message: "Subscription already active"
                    });
                }

                return NextResponse.json(
                    { error: "No pending payment found. Please try initiating payment again." },
                    { status: 400 }
                );
            }

            // If pending payment was already completed (by webhook), just return success
            if (pendingPayment.status === "completed") {
                console.log("[Payment Verify] Payment already completed via webhook");
                return NextResponse.json({
                    success: true,
                    message: "Payment already processed"
                });
            }

            sessionId = pendingPayment.session_id;
            console.log(`[Payment Verify] Found session_id: ${sessionId}`);
        }

        console.log(`[Payment Verify] Starting verification for session: ${sessionId}, user: ${userId}, plan: ${plan}`);

        // IDEMPOTENCY: Check if this payment was already processed
        const { data: existingPayment } = await supabase
            .from("payment_history")
            .select("id")
            .eq("payment_id", sessionId)
            .eq("status", "completed")
            .single();

        if (existingPayment) {
            console.log("[Payment Verify] Payment already in history, returning success");
            return NextResponse.json({
                success: true,
                message: "Payment already processed"
            });
        }

        // Check if subscription was already activated (maybe by webhook)
        const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", userId)
            .eq("plan", plan)
            .eq("status", "active")
            .single();

        if (existingSub) {
            console.log("[Payment Verify] Subscription already active");
            return NextResponse.json({
                success: true,
                message: "Subscription already active"
            });
        }

        // Verify payment status with PayMongo
        // PayMongo may take a moment to update, so we retry a few times
        let paid = false;
        let attempts = 0;
        const maxAttempts = 5;
        const delayMs = 1500;

        // Type guard: ensure sessionId is defined at this point
        if (!sessionId) {
            console.error("[Payment Verify] Session ID is undefined after lookup");
            return NextResponse.json(
                { error: "Session ID could not be determined. Please try again." },
                { status: 400 }
            );
        }

        while (!paid && attempts < maxAttempts) {
            attempts++;
            console.log(`[Payment Verify] Attempt ${attempts}/${maxAttempts} to verify payment`);

            const result = await getCheckoutSession(sessionId);

            if ("error" in result) {
                console.error(`[Payment Verify] Error from PayMongo:`, result.error);
            } else {
                paid = result.paid;
                console.log(`[Payment Verify] Payment status: ${paid ? "PAID" : "NOT PAID"}`);

                if (paid) break;
            }

            if (!paid && attempts < maxAttempts) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        if (!paid) {
            // Final check: maybe webhook processed it while we were retrying
            const { data: recentSub } = await supabase
                .from("user_subscriptions")
                .select("*")
                .eq("user_id", userId)
                .eq("plan", plan)
                .eq("status", "active")
                .single();

            if (recentSub) {
                console.log("[Payment Verify] Subscription was activated by webhook during retries");
                return NextResponse.json({
                    success: true,
                    message: "Subscription activated"
                });
            }

            // Payment genuinely not completed
            console.log("[Payment Verify] Payment not completed after all retries");
            return NextResponse.json(
                {
                    error: "Payment not yet completed. Please wait a moment and refresh the page. If you were charged, please contact support with your receipt.",
                    retryable: true
                },
                { status: 400 }
            );
        }

        // Payment confirmed! Activate subscription
        console.log(`[Payment Verify] Activating subscription for user ${userId}, plan ${plan}`);

        await activateSubscription(userId, plan, {
            paymongoPaymentId: sessionId,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }, supabase); // Pass service role client to bypass RLS

        // Update pending payment status
        await supabase
            .from("pending_payments")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("session_id", sessionId);

        // Log the payment in history
        const planConfig = PLAN_CONFIGS[plan];

        await supabase.from("payment_history").insert({
            user_id: userId,
            plan: plan,
            amount_php: planConfig?.pricePHP || 0,
            payment_id: sessionId,
            payment_method: "unknown", // We don't have this info from the API
            status: "completed",
            metadata: {
                processed_via: "verify_endpoint",
                attempts: attempts,
            },
            created_at: new Date().toISOString(),
        });

        const processingTime = Date.now() - startTime;
        console.log(`[Payment Verify] Payment verified and subscription activated in ${processingTime}ms`);

        return NextResponse.json({
            success: true,
            message: "Payment verified and subscription activated"
        });

    } catch (error) {
        console.error("[Payment Verify] Error:", error);
        return NextResponse.json(
            { error: "Failed to verify payment. Please contact support if you were charged." },
            { status: 500 }
        );
    }
}
