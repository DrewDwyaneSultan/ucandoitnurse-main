import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { Resend } from "resend";

// Helper to create Supabase client when needed (avoids build-time env requirements)
function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing Supabase environment variables");
    }
    return createClient(url, key);
}

// Initialize web-push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@hly.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Helper to create Resend client when needed
function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error("Missing RESEND_API_KEY environment variable");
    }
    return new Resend(apiKey);
}

interface UserWithDueCards {
    id: string;
    email: string;
    dueCount: number;
    overdueCount: number;
}

// Cron job endpoint - runs daily to send reminders
export async function GET(request: NextRequest) {
    // Verify cron secret (for security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = getSupabaseClient();
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Get all users with their flashcard counts
        const { data: usersWithCards, error: usersError } = await supabase
            .from("flashcards")
            .select(`
                user_id,
                next_review_at,
                users:user_id (
                    id,
                    email
                )
            `)
            .or(`next_review_at.is.null,next_review_at.lte.${now.toISOString()}`);

        if (usersError) {
            console.error("Error fetching users:", usersError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        // Group by user and count due/overdue cards
        const userMap = new Map<string, UserWithDueCards>();

        for (const card of usersWithCards || []) {
            const userId = card.user_id;
            const userRaw = card.users as unknown;
            const user = userRaw as { id: string; email: string } | null;

            if (!user?.email) continue;

            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    id: userId,
                    email: user.email,
                    dueCount: 0,
                    overdueCount: 0
                });
            }

            const userData = userMap.get(userId)!;
            userData.dueCount++;

            // Check if overdue
            if (card.next_review_at && new Date(card.next_review_at) < now) {
                userData.overdueCount++;
            }
        }

        // Send notifications to each user with due cards
        const results = {
            processed: 0,
            pushSent: 0,
            emailSent: 0,
            errors: 0
        };

        for (const [userId, userData] of userMap) {
            if (userData.dueCount === 0) continue;

            results.processed++;

            // Prepare message
            const title = userData.overdueCount > 0
                ? "Cards need your attention!"
                : "Time to study!";

            const body = userData.overdueCount > 0
                ? `You have ${userData.overdueCount} overdue card${userData.overdueCount > 1 ? 's' : ''} waiting`
                : `${userData.dueCount} card${userData.dueCount > 1 ? 's' : ''} ready for review`;

            // 1. Send Push Notification
            try {
                const { data: subscriptions } = await supabase
                    .from("push_subscriptions")
                    .select("*")
                    .eq("user_id", userId);

                if (subscriptions && subscriptions.length > 0) {
                    const payload = JSON.stringify({ title, body, url: "/tasks" });

                    for (const sub of subscriptions) {
                        try {
                            await webpush.sendNotification({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            }, payload);
                            results.pushSent++;
                        } catch (pushError: unknown) {
                            const error = pushError as { statusCode?: number };
                            // Remove invalid subscriptions
                            if (error.statusCode === 410 || error.statusCode === 404) {
                                await supabase
                                    .from("push_subscriptions")
                                    .delete()
                                    .eq("endpoint", sub.endpoint);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Push error for user:", userId, error);
            }

            // 2. Send Email
            try {
                const resendClient = getResendClient();
            await resendClient.emails.send({
                    from: "HLY Study <reminders@hly.app>",
                    to: userData.email,
                    subject: title,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background-color: #FDFBF9;">
                            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 24px; padding: 40px; border: 1px solid #f1f5f9;">
                                <h1 style="font-size: 24px; color: #111; margin: 0 0 8px 0; font-weight: 500;">
                                    ${title}
                                </h1>
                                <p style="font-size: 16px; color: #6b7280; margin: 0 0 32px 0;">
                                    ${body}
                                </p>
                                
                                <div style="background: #f9fafb; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 32px;">
                                    <div style="font-size: 48px; font-weight: 300; color: #111;">
                                        ${userData.dueCount}
                                    </div>
                                    <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">
                                        cards to review
                                    </div>
                                </div>
                                
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://hly.app'}/tasks" 
                                   style="display: block; background: #111; color: white; text-decoration: none; padding: 16px 32px; border-radius: 100px; text-align: center; font-size: 14px; font-weight: 500;">
                                    Start Studying
                                </a>
                                
                                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
                                    You're receiving this because you enabled study reminders.
                                    <br>
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://hly.app'}/profile" style="color: #6b7280;">
                                        Manage preferences
                                    </a>
                                </p>
                            </div>
                        </body>
                        </html>
                    `
                });
                results.emailSent++;
            } catch (emailError) {
                console.error("Email error for user:", userId, emailError);
                results.errors++;
            }
        }

        return NextResponse.json({
            success: true,
            date: today,
            ...results
        });
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
