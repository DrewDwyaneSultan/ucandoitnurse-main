"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { CircleCheckBig, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIGS, type SubscriptionPlan } from "@/lib/credits";

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [error, setError] = useState<string>("");

    // NOTE: PayMongo doesn't support {CHECKOUT_SESSION_ID} placeholder like Stripe
    // So we verify using userId - the API will look up the pending payment
    const plan = searchParams.get("plan") as SubscriptionPlan | null;

    useEffect(() => {
        const verifyPayment = async () => {
            if (!plan || !user) {
                setStatus("error");
                setError("Missing payment information");
                return;
            }

            try {
                // Call verify endpoint - it will look up the pending payment by userId
                const response = await fetch("/api/payments/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.id,
                        plan,
                    }),
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    setStatus("error");
                    setError(data.error || "Payment verification failed");
                    return;
                }

                setStatus("success");
            } catch (err) {
                console.error("Verification error:", err);
                setStatus("error");
                setError("An error occurred. Please contact support.");
            }
        };

        if (user) {
            verifyPayment();
        }
    }, [plan, user]);

    const planConfig = plan ? PLAN_CONFIGS[plan] : null;

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white rounded-[2rem] shadow-xl p-10 max-w-md w-full text-center"
            >
                {status === "verifying" && (
                    <>
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-[#5B79A6] animate-spin" />
                        </div>
                        <h1 className="text-2xl font-caladea text-gray-900 mb-2">
                            Verifying Payment...
                        </h1>
                        <p className="text-gray-500 font-poppins text-sm">
                            Please wait while we confirm your payment.
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <CircleCheckBig className="w-10 h-10 text-green-600" />
                        </motion.div>
                        <span className="text-xs font-bold tracking-widest text-[#5B79A6] uppercase mb-2 block font-poppins">
                            Payment Successful
                        </span>
                        <h1 className="text-3xl font-caladea text-gray-900 mb-2">
                            Welcome to {planConfig?.name}!
                        </h1>
                        <p className="text-gray-500 font-poppins text-sm mb-8">
                            You now have <strong className="text-gray-900">{planConfig?.dailyCredits} AI generations</strong> per day.
                            <br />
                            Start creating amazing flashcards!
                        </p>
                        <Button
                            onClick={() => router.push("/dashboard")}
                            className="w-full rounded-full bg-gray-900 hover:bg-gray-800 hover:scale-105 transition-all duration-300 py-6 font-poppins"
                        >
                            Go to Dashboard
                        </Button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <CircleX className="w-10 h-10 text-red-600" />
                        </motion.div>
                        <span className="text-xs font-bold tracking-widest text-red-500 uppercase mb-2 block font-poppins">
                            Something Went Wrong
                        </span>
                        <h1 className="text-2xl font-caladea text-gray-900 mb-2">
                            Payment Issue
                        </h1>
                        <p className="text-gray-500 font-poppins text-sm mb-8">
                            {error}
                        </p>
                        <div className="space-y-3">
                            <Button
                                onClick={() => router.push("/dashboard")}
                                className="w-full rounded-full bg-gray-900 hover:bg-gray-800 py-6 font-poppins"
                            >
                                Go to Dashboard
                            </Button>
                            <p className="text-xs text-gray-400 font-poppins">
                                If you were charged, please contact support.
                            </p>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#5B79A6] animate-spin" />
                </div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
