import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";

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
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch (e) {
                        console.error("Error setting cookies:", e);
                    }
                },
            },
        }
    );

    // If there's a code, exchange it for a session
    if (code) {
        console.log("Exchanging code for session");
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error("Exchange error:", error.message);
            return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
        }

        console.log("Session created, redirecting to dashboard");
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // No code - check if session already exists (Supabase might have handled it)
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        console.log("Session found, redirecting to dashboard");
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    // No code and no session - redirect to login
    console.log("No code and no session, redirecting to login");
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
}
