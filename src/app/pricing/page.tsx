"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, Loader2, ArrowLeft, ArrowBigUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIGS, type SubscriptionPlan, getUserCredits, type UserCredits, getUserSubscription, cancelSubscription } from "@/lib/credits";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Link from "next/link";

interface Subscription {
    plan: SubscriptionPlan;
    status: string;
    current_period_end: string;
}

export default function PricingPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState<SubscriptionPlan | null>(null);
    const [credits, setCredits] = useState<UserCredits | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loadingCredits, setLoadingCredits] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [targetPlan, setTargetPlan] = useState<SubscriptionPlan | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        async function loadCredits() {
            if (!user) {
                setLoadingCredits(false);
                return;
            }
            try {
                const [userCredits, userSub] = await Promise.all([
                    getUserCredits(user.id),
                    getUserSubscription(user.id)
                ]);
                setCredits(userCredits);
                if (userSub && userSub.status === "active" && userSub.plan !== "free") {
                    setSubscription(userSub as Subscription);
                }
            } catch (error) {
                console.error("Error loading credits:", error);
            } finally {
                setLoadingCredits(false);
            }
        }
        loadCredits();
    }, [user]);

    const currentPlan = credits?.plan || "free";

    const getUpgradePrice = (fromPlan: SubscriptionPlan, toPlan: SubscriptionPlan): number => {
        const fromPrice = PLAN_CONFIGS[fromPlan].pricePHP;
        const toPrice = PLAN_CONFIGS[toPlan].pricePHP;
        return Math.max(0, toPrice - fromPrice);
    };

    const handlePlanClick = async (plan: SubscriptionPlan) => {
        if (!user) {
            toast.error("Hold up - you need to log in first!");
            return;
        }

        if (plan === "free" || plan === currentPlan) {
            return;
        }

        // If user has an active subscription
        if (subscription && subscription.status === "active") {
            const newPlanPrice = PLAN_CONFIGS[plan].pricePHP;
            const currentPlanPrice = PLAN_CONFIGS[subscription.plan].pricePHP;

            if (newPlanPrice > currentPlanPrice) {
                // Upgrading - show upgrade modal with prorated price
                setTargetPlan(plan);
                setShowUpgradeModal(true);
            } else {
                // Downgrading - show manage modal (need to cancel first)
                setTargetPlan(plan);
                setShowManageModal(true);
            }
            return;
        }

        // No subscription - proceed to checkout
        await proceedToCheckout(plan);
    };

    const proceedToCheckout = async (plan: SubscriptionPlan, isUpgrade: boolean = false) => {
        setLoading(plan);
        setShowUpgradeModal(false);

        try {
            const response = await fetch("/api/payments/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user?.id,
                    plan,
                    email: user?.email,
                    currentPlan: isUpgrade ? subscription?.plan : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                toast.error(data.error || "Hmm, something went wrong. Give it another shot!");
                setLoading(null);
                return;
            }

            window.location.href = data.checkoutUrl;
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Oops, that didn't work. Let us try again!");
            setLoading(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!user || !subscription) return;

        setCancelling(true);
        try {
            await cancelSubscription(user.id);
            toast.success("Subscription cancelled - you are now on the Free plan!");
            setSubscription(null);
            setShowManageModal(false);
            // Refresh credits
            const userCredits = await getUserCredits(user.id);
            setCredits(userCredits);
        } catch (error) {
            console.error("Cancel error:", error);
            toast.error("Couldn't cancel subscription - try again!");
        } finally {
            setCancelling(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    };

    const PlanCard = ({
        plan,
        isPopular = false
    }: {
        plan: SubscriptionPlan;
        isPopular?: boolean;
    }) => {
        const config = PLAN_CONFIGS[plan];
        const isCurrent = currentPlan === plan;
        const isLoading = loading === plan;
        const canUpgrade = subscription && PLAN_CONFIGS[plan].pricePHP > PLAN_CONFIGS[subscription.plan].pricePHP;
        const upgradePrice = subscription ? getUpgradePrice(subscription.plan, plan) : 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: plan === "free" ? 0 : plan === "starter" ? 0.1 : plan === "pro" ? 0.2 : 0.3 }}
                className={`
                    rounded-2xl p-6 relative flex flex-col
                    ${isCurrent
                        ? "bg-[#5B79A6] text-white"
                        : "bg-white border border-gray-200"
                    }
                `}
            >
                {isPopular && !isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-gray-900 text-white px-3 py-1 rounded-full font-poppins">
                        Popular
                    </span>
                )}

                {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium bg-white text-[#5B79A6] px-3 py-1 rounded-full font-poppins">
                        Current
                    </span>
                )}

                {/* Plan Name */}
                <h3 className={`text-lg font-caladea mb-4 ${isCurrent ? "text-white" : "text-gray-900"}`}>
                    {config.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                    <span className={`text-4xl font-caladea ${isCurrent ? "text-white" : "text-gray-900"}`}>
                        {config.pricePHP === 0 ? "Free" : `₱${config.pricePHP}`}
                    </span>
                    {config.pricePHP > 0 && (
                        <span className={`text-sm font-poppins ${isCurrent ? "text-white/70" : "text-gray-400"}`}>/mo</span>
                    )}
                </div>

                {/* Show upgrade price if applicable */}
                {canUpgrade && upgradePrice > 0 && (
                    <p className="text-xs font-poppins mb-4 text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                        Pay only ₱{upgradePrice} to upgrade
                    </p>
                )}

                {/* USD equivalent */}
                {config.price > 0 && !canUpgrade && (
                    <p className={`text-xs font-poppins mb-4 ${isCurrent ? "text-white/60" : "text-gray-400"}`}>
                        ~${config.price} USD
                    </p>
                )}
                {config.price === 0 && <div className="h-4 mb-4" />}

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-grow">
                    {config.features.map((feature: string, i: number) => (
                        <li key={i} className={`flex items-center gap-2 text-sm font-poppins ${isCurrent ? "text-white/90" : "text-gray-600"}`}>
                            <CheckCheck className={`w-4 h-4 flex-shrink-0 ${isCurrent ? "text-white" : "text-[#5B79A6]"}`} />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Button */}
                <Button
                    onClick={() => handlePlanClick(plan)}
                    disabled={isCurrent || isLoading || loading !== null || plan === "free"}
                    className={`
                        w-full rounded-full py-5 font-poppins text-sm font-medium transition-all
                        ${isCurrent
                            ? "bg-white text-[#5B79A6] hover:bg-gray-100 cursor-default"
                            : plan === "free"
                                ? "bg-gray-400 text-black cursor-not-allowed"
                                : canUpgrade
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-900 text-white hover:bg-gray-800"
                        }
                    `}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                        "Current"
                    ) : plan === "free" ? (
                        "Free"
                    ) : canUpgrade ? (
                        <>
                            <ArrowBigUp className="w-4 h-4 mr-1" />
                            Upgrade
                        </>
                    ) : (
                        "Subscribe"
                    )}
                </Button>
            </motion.div>
        );
    };

    if (loadingCredits) {
        return (
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#FDFBF9] border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/dashboard"
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>

                    {/* Current subscription badge */}
                    {subscription && (
                        <button
                            onClick={() => setShowManageModal(true)}
                            className="text-xs font-medium text-gray-200 hover:text-gray-900 bg-[#5B79A6]/90 px-3 py-1.5 rounded-full font-poppins hover:bg-[#5B79A6]/20 transition-colors"
                        >
                            Manage
                        </button>
                    )}
                </div>
            </header>

            {/* Hero */}
            <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 text-center">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-medium tracking-widest text-[#5B79A6] uppercase mb-3 font-poppins"
                >
                    Plans
                </motion.p>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl font-caladea text-gray-900 mb-3"
                >
                    Choose your plan
                </motion.h2>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-5xl mx-auto px-4 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PlanCard plan="free" />
                    <PlanCard plan="starter" />
                    <PlanCard plan="pro" isPopular />
                    <PlanCard plan="unlimited" />
                </div>
            </div>

            {/* Footer Info */}
            <div className="max-w-5xl mx-auto px-4 pb-10">
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500 font-poppins">
                        <span className="flex items-center gap-1.5">
                            <CheckCheck className="w-3 h-3 text-[#5B79A6]" />
                            Secure payment
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCheck className="w-3 h-3 text-[#5B79A6]" />
                            Daily reset
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCheck className="w-3 h-3 text-[#5B79A6]" />
                            Cancel anytime
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCheck className="w-3 h-3 text-[#5B79A6]" />
                            Instant activation
                        </span>
                    </div>
                </div>
            </div>

            {/* Upgrade Modal */}
            <AnimatePresence>
                {showUpgradeModal && subscription && targetPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setShowUpgradeModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                                            <ArrowBigUp className="w-5 h-5 text-white" />
                                        </div>
                                        <h2 className="text-xl font-caladea text-gray-900">Upgrade Plan</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowUpgradeModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 bg-gray-50 rounded-2xl p-4 text-center">
                                        <p className="text-xs text-gray-500 font-poppins mb-1">From</p>
                                        <p className="text-lg font-caladea text-gray-900">{PLAN_CONFIGS[subscription.plan].name}</p>
                                        <p className="text-sm text-gray-400 font-poppins">₱{PLAN_CONFIGS[subscription.plan].pricePHP}</p>
                                    </div>
                                    <ArrowBigUp className="w-5 h-5 text-green-500 rotate-90" />
                                    <div className="flex-1 bg-green-50 rounded-2xl p-4 text-center">
                                        <p className="text-xs text-green-600 font-poppins mb-1">To</p>
                                        <p className="text-lg font-caladea text-green-700">{PLAN_CONFIGS[targetPlan].name}</p>
                                        <p className="text-sm text-green-600 font-poppins">₱{PLAN_CONFIGS[targetPlan].pricePHP}</p>
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                                    <p className="text-sm text-green-700 font-poppins mb-1">You pay only</p>
                                    <p className="text-3xl font-caladea text-green-700">
                                        ₱{getUpgradePrice(subscription.plan, targetPlan)}
                                    </p>
                                    <p className="text-xs text-green-600 font-poppins mt-1">
                                        Difference from current plan
                                    </p>
                                </div>

                                <p className="text-xs text-gray-500 font-poppins text-center">
                                    Your plan will be upgraded immediately. New features will be available right away.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                                <Button
                                    onClick={() => proceedToCheckout(targetPlan, true)}
                                    disabled={loading === targetPlan}
                                    className="w-full rounded-full h-12 bg-green-600 text-white hover:bg-green-700 font-poppins"
                                >
                                    {loading === targetPlan ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <ArrowBigUp className="w-4 h-4 mr-2" />
                                    )}
                                    Upgrade for ₱{getUpgradePrice(subscription.plan, targetPlan)}
                                </Button>
                                <Button
                                    onClick={() => setShowUpgradeModal(false)}
                                    variant="outline"
                                    className="w-full rounded-full h-12 border-gray-200 font-poppins"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Subscription Modal */}
            <AnimatePresence>
                {showManageModal && subscription && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setShowManageModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-caladea text-gray-900">Manage Subscription</h2>
                                    <button
                                        onClick={() => setShowManageModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="bg-[#5B79A6]/10 rounded-2xl p-4">
                                    <p className="text-sm text-gray-600 font-poppins mb-2">Current Plan</p>
                                    <p className="text-2xl font-caladea text-[#5B79A6]">
                                        {PLAN_CONFIGS[subscription.plan].name}
                                    </p>
                                    <p className="text-sm text-gray-500 font-poppins mt-1">
                                        ₱{PLAN_CONFIGS[subscription.plan].pricePHP}/month
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <p className="text-sm text-gray-600 font-poppins mb-1">Valid Until</p>
                                    <p className="text-lg font-caladea text-gray-900">
                                        {formatDate(subscription.current_period_end)}
                                    </p>
                                </div>

                                {targetPlan && PLAN_CONFIGS[targetPlan].pricePHP < PLAN_CONFIGS[subscription.plan].pricePHP && (
                                    <p className="text-sm text-gray-500 font-poppins text-center">
                                        To switch to a lower plan, you need to cancel your current subscription first.
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                                <Button
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                    variant="outline"
                                    className="w-full rounded-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-poppins"
                                >
                                    {cancelling ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Cancel Subscription
                                </Button>
                                <Button
                                    onClick={() => setShowManageModal(false)}
                                    className="w-full rounded-full h-12 bg-gray-900 text-white hover:bg-gray-800 font-poppins"
                                >
                                    Keep Current Plan
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
