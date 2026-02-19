import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import webpush from "web-push";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@hly.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Send push notification to a user
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { userId, title, body, url } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "userId required" }, { status: 400 });
        }

        // Get user's push subscriptions
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", userId);

        if (error) {
            console.error("Error fetching subscriptions:", error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
        }

        const payload = JSON.stringify({
            title: title || "Time to study!",
            body: body || "You have cards due for review",
            url: url || "/tasks"
        });

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                try {
                    await webpush.sendNotification(pushSubscription, payload);
                    return { success: true, endpoint: sub.endpoint };
                } catch (err: unknown) {
                    const error = err as { statusCode?: number };
                    // If subscription is invalid, delete it
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await supabase
                            .from("push_subscriptions")
                            .delete()
                            .eq("endpoint", sub.endpoint);
                    }
                    throw err;
                }
            })
        );

        const successful = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            sent: successful,
            failed
        });
    } catch (error) {
        console.error("Push send error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
