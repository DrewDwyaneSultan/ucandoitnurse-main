"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, Crown, Star, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIGS, type SubscriptionPlan } from "@/lib/credits";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: SubscriptionPlan;
    creditsRemaining?: number;
}

export function UpgradeModal({ isOpen, onClose, currentPlan = "free", creditsRemaining = 0 }: UpgradeModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState<SubscriptionPlan | null>(null);

    const handleUpgrade = async (plan: SubscriptionPlan) => {
        if (!user) {
            toast.error("Hold up - you need to log in first to upgrade!");
            return;
        }

        if (plan === "free") {
            toast.info("You're already rocking the free plan!");
            return;
        }

        setLoading(plan);

        try {
            const response = await fetch("/api/payments/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    plan,
                    email: user.email,
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                toast.error(data.error || "Hmm, something went wrong with payment setup!");
                setLoading(null);
                return;
            }

            window.location.href = data.checkoutUrl;
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Oops, something went sideways. Give it another shot!");
            setLoading(null);
        }
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

        const Icon = plan === "unlimited" ? Crown
            : plan === "pro" ? Sparkles
                : plan === "starter" ? Star
                    : Zap;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`
                    rounded-[2rem] p-6 relative
                    ${isCurrent
                        ? "bg-gray-100 border-2 border-gray-200"
                        : isPopular
                            ? "bg-gray-900 text-white"
                            : "bg-white border border-gray-100"
                    }
                    ${isPopular ? "shadow-2xl scale-105 z-10" : "shadow-sm"}
                `}
            >
                {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5B79A6] text-white text-[10px] px-4 py-1 rounded-full font-poppins uppercase tracking-widest">
                        Popular
                    </span>
                )}

                <div className="flex items-center gap-2 mb-4">
                    <Icon className={`w-5 h-5 ${isPopular ? "text-white" : "text-gray-400"}`} />
                    <h3 className={`text-xl font-caladea ${isPopular ? "text-white" : "text-gray-900"}`}>
                        {config.name}
                    </h3>
                    {isCurrent && (
                        <span className="ml-auto text-[10px] bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full font-poppins uppercase tracking-wide">
                            Current
                        </span>
                    )}
                </div>

                <div className="mb-2">
                    <span className={`text-4xl font-caladea tracking-tight ${isPopular ? "text-white" : "text-gray-900"}`}>
                        ₱{config.pricePHP}
                    </span>
                    <span className={`text-sm font-poppins ${isPopular ? "text-gray-300" : "text-gray-400"}`}>/mo</span>
                </div>
                {config.price > 0 && (
                    <p className={`text-xs font-poppins mb-4 ${isPopular ? "text-gray-400" : "text-gray-400"}`}>
                        ${config.price} USD
                    </p>
                )}
                {config.price === 0 && <div className="h-5 mb-4" />}

                <ul className="space-y-2 mb-6">
                    {config.features.map((feature, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm font-poppins ${isPopular ? "text-gray-300" : "text-gray-600"}`}>
                            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPopular ? "text-white" : "text-[#5B79A6]"}`} />
                            {feature}
                        </li>
                    ))}
                </ul>

                <Button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isCurrent || isLoading || loading !== null}
                    className={`
                        w-full rounded-full py-6 font-poppins text-sm tracking-wide transition-all duration-300
                        ${isPopular
                            ? "bg-white text-gray-900 hover:bg-gray-100 hover:scale-105"
                            : isCurrent
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-gray-900 text-white hover:bg-gray-800 hover:scale-105"
                        }
                    `}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                        "Current Plan"
                    ) : plan === "free" ? (
                        "Downgrade"
                    ) : (
                        `Get ${config.name}`
                    )}
                </Button>
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-4 z-50 flex items-center justify-center"
                    >
                        <div className="bg-[#FDFBF9] rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="relative px-8 md:px-12 pt-12 pb-8">
                                <button
                                    onClick={onClose}
                                    className="absolute top-6 right-6 p-3 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>

                                <span className="text-xs font-bold tracking-widest text-[#5B79A6] uppercase mb-4 block font-poppins">
                                    {creditsRemaining === 0 ? "Upgrade Required" : "Choose Your Plan"}
                                </span>

                                <h2 className="text-4xl md:text-5xl font-caladea text-gray-900 tracking-tight leading-tight mb-2">
                                    {creditsRemaining === 0
                                        ? <>{"You've used all"}<br /><span className="text-gray-400">your daily credits</span></>
                                        : <>Unlock <span className="text-gray-400 italic">more</span> power</>
                                    }
                                </h2>

                                <p className="text-gray-500 font-poppins text-sm mt-4">
                                    Pay with GCash, GrabPay, Maya, or Card
                                </p>
                            </div>

                            {/* No pricing – all features unlocked */}
                            <div className="px-8 md:px-12 pb-12 text-center">
                                <p className="text-lg text-gray-700">
                                    Good news: the app is completely free now. No need to upgrade.</p>
                            </div>

                            {/* Footer */}
                            <div className="px-8 md:px-12 py-6 border-t border-gray-100 bg-white/50 rounded-b-[3rem]">
                                <p className="text-xs text-gray-400 font-poppins text-center tracking-wide">
                                    Secure payment via PayMongo • Credits reset daily at midnight • Cancel anytime
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
