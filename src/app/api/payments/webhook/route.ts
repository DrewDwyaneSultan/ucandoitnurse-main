/**
 * PayMongo Webhook Handler
 * 
 * This endpoint receives webhook events from PayMongo when payments are completed.
 * It's the most reliable way to process payments - works even if user closes browser.
 * 
 * Setup in PayMongo Dashboard:
 * 1. Go to Settings → Webhooks → Create Webhook
 * 2. Endpoint URL: https://yourdomain.com/api/payments/webhook
 * 3. Events to subscribe: checkout_session.payment.paid
 * 4. Copy the webhook secret to your .env as PAYMONGO_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { activateSubscription, type SubscriptionPlan, PLAN_CONFIGS } from "@/lib/credits";
import crypto from "crypto";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || "";

/**
 * PayMongo uses a specific signature format:
 * Paymongo-Signature: t=timestamp,te=test_mode_sig,li=live_mode_sig
 */
function verifyPayMongoSignature(
    payload: string,
    signatureHeader: string,
    secret: string
): boolean {
    if (!secret) {
        console.warn("[Webhook] No webhook secret configured - skipping verification in development");
        return process.env.NODE_ENV === "development";
    }

    try {
        // Parse the signature header
        const parts = signatureHeader.split(",");
        const signatureParts: Record<string, string> = {};

        for (const part of parts) {
            const [key, value] = part.split("=");
            if (key && value) {
                signatureParts[key] = value;
            }
        }

        const timestamp = signatureParts["t"];
        // Use live mode signature (li) in production, test mode (te) in development
        const signature = process.env.NODE_ENV === "production"
            ? signatureParts["li"]
            : (signatureParts["te"] || signatureParts["li"]);

        if (!timestamp || !signature) {
            console.error("[Webhook] Invalid signature header format");
            return false;
        }

        // Verify signature: HMAC-SHA256(timestamp + "." + payload, secret)
        const signedPayload = `${timestamp}.${payload}`;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(signedPayload)
            .digest("hex");

        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        if (!isValid) {
            console.error("[Webhook] Signature verification failed");
        }

        return isValid;
    } catch (error) {
        console.error("[Webhook] Error verifying signature:", error);
        return false;
    }
}

// PayMongo webhook event types
interface PayMongoWebhookEvent {
    data: {
        id: string;
        type: string;
        attributes: {
            type: string;
            livemode: boolean;
            data: {
                id: string;
                type: string;
                attributes: {
                    billing?: {
                        email?: string;
                        name?: string;
                    };
                    checkout_url: string;
                    client_key: string;
                    description: string;
                    line_items: Array<{
                        amount: number;
                        currency: string;
                        description: string;
                        name: string;
                        quantity: number;
                    }>;
                    metadata: {
                        user_id?: string;
                        plan?: string;
                        type?: string;
                    };
                    payment_intent: {
                        id: string;
                        type: string;
                        attributes: {
                            amount: number;
                            currency: string;
                            description: string;
                            status: string;
                        };
                    };
                    payment_method_used: string;
                    payments: Array<{
                        id: string;
                        type: string;
                        attributes: {
                            amount: number;
                            billing: {
                                email: string;
                                name: string;
                            };
                            currency: string;
                            fee: number;
                            net_amount: number;
                            status: string;
                        };
                    }>;
                    status: "active" | "expired" | "paid";
                };
            };
            previous_data: Record<string, unknown>;
            created_at: number;
            updated_at: number;
        };
    };
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        const signatureHeader = request.headers.get("paymongo-signature") || "";

        console.log("[Webhook] Received webhook event");

        // Verify webhook signature
        if (!verifyPayMongoSignature(rawBody, signatureHeader, PAYMONGO_WEBHOOK_SECRET)) {
            console.error("[Webhook] Invalid signature - rejecting request");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        // Parse the event
        const event: PayMongoWebhookEvent = JSON.parse(rawBody);
        const eventType = event.data.attributes.type;
        const checkoutData = event.data.attributes.data;

        console.log(`[Webhook] Event type: ${eventType}`);
        console.log(`[Webhook] Checkout session ID: ${checkoutData.id}`);
        console.log(`[Webhook] Status: ${checkoutData.attributes.status}`);

        // We only process checkout_session.payment.paid events
        if (eventType !== "checkout_session.payment.paid") {
            console.log(`[Webhook] Ignoring event type: ${eventType}`);
            return NextResponse.json({ received: true, processed: false });
        }

        // Extract metadata
        const metadata = checkoutData.attributes.metadata || {};
        const userId = metadata.user_id;
        const plan = metadata.plan as SubscriptionPlan;
        const sessionId = checkoutData.id;

        if (!userId || !plan) {
            console.error("[Webhook] Missing user_id or plan in metadata:", metadata);
            // Still return 200 to prevent PayMongo from retrying
            return NextResponse.json({
                received: true,
                processed: false,
                error: "Missing metadata"
            });
        }

        console.log(`[Webhook] Processing payment for user: ${userId}, plan: ${plan}`);

        // IDEMPOTENCY CHECK: Check if we already processed this payment
        const { data: existingPayment } = await supabase
            .from("payment_history")
            .select("id")
            .eq("payment_id", sessionId)
            .eq("status", "completed")
            .single();

        if (existingPayment) {
            console.log("[Webhook] Payment already processed - skipping");
            return NextResponse.json({
                received: true,
                processed: false,
                reason: "already_processed"
            });
        }

        // Activate the subscription
        console.log(`[Webhook] Activating subscription for user ${userId}`);
        await activateSubscription(userId, plan, {
            paymongoPaymentId: sessionId,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }, supabase); // Pass service role client to bypass RLS

        // Update pending payment status
        const { error: updateError } = await supabase
            .from("pending_payments")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("session_id", sessionId);

        if (updateError) {
            console.warn("[Webhook] Error updating pending payment:", updateError);
        }

        // Get payment details for logging
        const payments = checkoutData.attributes.payments || [];
        const payment = payments[0];
        const amountPaid = payment?.attributes?.amount
            ? payment.attributes.amount / 100
            : PLAN_CONFIGS[plan]?.pricePHP || 0;

        // Log the payment in history
        const { error: historyError } = await supabase
            .from("payment_history")
            .insert({
                user_id: userId,
                plan: plan,
                amount_php: amountPaid,
                payment_id: sessionId,
                payment_method: checkoutData.attributes.payment_method_used || "unknown",
                status: "completed",
                metadata: {
                    event_id: event.data.id,
                    payment_intent_id: checkoutData.attributes.payment_intent?.id,
                    processed_via: "webhook",
                },
                created_at: new Date().toISOString(),
            });

        if (historyError) {
            console.error("[Webhook] Error logging payment history:", historyError);
        }

        const processingTime = Date.now() - startTime;
        console.log(`[Webhook] Successfully processed payment in ${processingTime}ms`);

        return NextResponse.json({
            received: true,
            processed: true,
            userId,
            plan,
            processingTime: `${processingTime}ms`
        });

    } catch (error) {
        console.error("[Webhook] Error processing webhook:", error);

        // Return 200 to prevent PayMongo from retrying on parsing errors
        // But log the error for investigation
        return NextResponse.json(
            {
                received: true,
                processed: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 200 } // Important: Return 200 even on error to prevent infinite retries
        );
    }
}

// PayMongo may send GET requests to verify the endpoint
export async function GET() {
    return NextResponse.json({
        status: "ok",
        message: "PayMongo webhook endpoint is active"
    });
}
