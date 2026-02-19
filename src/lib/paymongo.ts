/**
 * PayMongo Integration for GCash Payments
 * 
 * PayMongo supports:
 * - GCash
 * - GrabPay
 * - Credit/Debit Cards
 * - Maya
 * - BPI, UnionBank, etc.
 * 
 * Setup:
 * 1. Create account at https://dashboard.paymongo.com
 * 2. Get API keys from dashboard
 * 3. Add to .env.local:
 *    PAYMONGO_SECRET_KEY=sk_test_xxxxx
 *    PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
 */

import { PLAN_CONFIGS, type SubscriptionPlan } from "./credits";

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || "";
const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

interface PayMongoResponse<T> {
    data: T;
}

interface PayMongoPayment {
    id: string;
    type: "payment";
    attributes: {
        status: "pending" | "paid" | "failed";
        amount: number;
        currency: string;
    };
}

interface PayMongoCheckoutSession {
    id: string;
    type: "checkout_session";
    attributes: {
        checkout_url: string;
        payment_intent: {
            id: string;
            attributes?: {
                status: "awaiting_payment_method" | "awaiting_next_action" | "processing" | "succeeded" | "failed";
            };
        } | null;
        payments: PayMongoPayment[];
        // Checkout session status is only "active" or "expired"
        // NOT "paid" - we need to check payments array for actual payment status
        status: "active" | "expired";
    };
}



/**
 * Create a checkout session for subscription payment
 * 
 * NOTE: PayMongo does NOT support placeholder substitution like Stripe's {CHECKOUT_SESSION_ID}.
 * We need to create the checkout session first, get the ID, then we can't modify the URL.
 * 
 * Solution: We use the sessionId stored in pending_payments table along with userId to verify.
 * The success page will look up the pending payment by userId to get the session_id.
 */
export async function createCheckoutSession(
    userId: string,
    plan: SubscriptionPlan,
    userEmail?: string,
    proratedAmountPHP?: number // Optional prorated amount for upgrades
): Promise<{ checkoutUrl: string; sessionId: string } | { error: string }> {
    if (!PAYMONGO_SECRET_KEY) {
        console.error("PayMongo secret key not configured");
        return { error: "Payment system not configured. Please contact support." };
    }

    if (plan === "free") {
        return { error: "Free plan doesn't require payment" };
    }

    const planConfig = PLAN_CONFIGS[plan];
    // Use prorated amount if provided, otherwise use full plan price
    const actualPricePHP = proratedAmountPHP ?? planConfig.pricePHP;
    const amountInCentavos = actualPricePHP * 100; // PayMongo uses centavos

    try {
        // First create the checkout session to get the ID
        const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        billing: userEmail ? { email: userEmail } : undefined,
                        send_email_receipt: true,
                        show_description: true,
                        show_line_items: true,
                        description: proratedAmountPHP
                            ? `HLY Upgrade to ${planConfig.name} Plan`
                            : `HLY ${planConfig.name} Plan - Monthly Subscription`,
                        line_items: [
                            {
                                currency: "PHP",
                                amount: amountInCentavos,
                                name: proratedAmountPHP
                                    ? `Upgrade to ${planConfig.name} Plan`
                                    : `${planConfig.name} Plan`,
                                description: proratedAmountPHP
                                    ? "Prorated upgrade fee"
                                    : planConfig.description,
                                quantity: 1,
                            },
                        ],
                        payment_method_types: [
                            "gcash",      // GCash
                            "grab_pay",   // GrabPay
                            "paymaya",    // Maya
                            "card",       // Credit/Debit cards
                        ],
                        // NOTE: PayMongo doesn't support {CHECKOUT_SESSION_ID} placeholder!
                        // We pass userId and plan in URL. The success page will look up
                        // the pending_payment record by userId to get the real session_id.
                        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?user_id=${userId}&plan=${plan}`,
                        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/cancelled`,
                        metadata: {
                            user_id: userId,
                            plan: plan,
                            type: "subscription",
                        },
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("PayMongo error:", errorData);
            return { error: "Failed to create payment session. Please try again." };
        }

        const data: PayMongoResponse<PayMongoCheckoutSession> = await response.json();

        return {
            checkoutUrl: data.data.attributes.checkout_url,
            sessionId: data.data.id,
        };
    } catch (error) {
        console.error("PayMongo checkout error:", error);
        return { error: "Payment system error. Please try again later." };
    }
}

/**
 * Retrieve checkout session to verify payment
 * 
 * IMPORTANT: PayMongo checkout session status is only "active" or "expired"
 * To check if payment succeeded, we need to look at:
 * 1. The payments array in the checkout session
 * 2. OR the payment_intent status
 */
export async function getCheckoutSession(
    sessionId: string
): Promise<{ paid: boolean; metadata: Record<string, string>; debug?: string } | { error: string }> {
    if (!PAYMONGO_SECRET_KEY) {
        return { error: "Payment system not configured" };
    }

    try {
        const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions/${sessionId}`, {
            method: "GET",
            headers: {
                Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("[PayMongo] Failed to retrieve session:", errorData);
            return { error: "Failed to retrieve payment session" };
        }

        const data: PayMongoResponse<PayMongoCheckoutSession> = await response.json();
        const attributes = data.data.attributes;

        // Debug log the full response structure
        console.log("[PayMongo] Checkout session status:", attributes.status);
        console.log("[PayMongo] Payments array:", JSON.stringify(attributes.payments, null, 2));
        console.log("[PayMongo] Payment intent:", JSON.stringify(attributes.payment_intent, null, 2));

        // Check if any payment in the payments array has succeeded
        const payments = attributes.payments || [];
        const hasPaidPayment = payments.some(p => p.attributes.status === "paid");

        // Also check payment_intent status as backup
        const paymentIntentSucceeded = attributes.payment_intent?.attributes?.status === "succeeded";

        const paid = hasPaidPayment || paymentIntentSucceeded;

        console.log("[PayMongo] Payment status check - hasPaidPayment:", hasPaidPayment, "paymentIntentSucceeded:", paymentIntentSucceeded, "-> paid:", paid);

        return {
            paid,
            metadata: {},
            debug: `session_status=${attributes.status}, payments_count=${payments.length}, has_paid=${hasPaidPayment}, intent_succeeded=${paymentIntentSucceeded}`,
        };
    } catch (error) {
        console.error("Error retrieving checkout session:", error);
        return { error: "Failed to verify payment" };
    }
}

/**
 * Create a GCash source directly (alternative to checkout session)
 */
export async function createGCashPayment(
    userId: string,
    plan: SubscriptionPlan,
    userEmail?: string
): Promise<{ redirectUrl: string; sourceId: string } | { error: string }> {
    if (!PAYMONGO_SECRET_KEY) {
        return { error: "Payment system not configured" };
    }

    if (plan === "free") {
        return { error: "Free plan doesn't require payment" };
    }

    const planConfig = PLAN_CONFIGS[plan];
    const amountInCentavos = planConfig.pricePHP * 100;

    try {
        // Create a source for GCash
        const response = await fetch(`${PAYMONGO_API_URL}/sources`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amountInCentavos,
                        currency: "PHP",
                        type: "gcash",
                        redirect: {
                            success: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?plan=${plan}`,
                            failed: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/failed`,
                        },
                        billing: userEmail ? { email: userEmail } : undefined,
                        metadata: {
                            user_id: userId,
                            plan: plan,
                        },
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("PayMongo GCash error:", errorData);
            return { error: "Failed to create GCash payment" };
        }

        const data = await response.json();

        return {
            redirectUrl: data.data.attributes.redirect.checkout_url,
            sourceId: data.data.id,
        };
    } catch (error) {
        console.error("GCash payment error:", error);
        return { error: "Payment error. Please try again." };
    }
}

/**
 * Verify webhook signature from PayMongo
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
): boolean {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

    return signature === expectedSignature;
}
