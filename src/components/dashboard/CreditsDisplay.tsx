"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Sparkles, Crown, Star, ChevronRight } from "lucide-react";
import { getUserCredits, type UserCredits, PLAN_CONFIGS } from "@/lib/credits";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface CreditsDisplayProps {
    userId: string;
}

export function CreditsDisplay({ userId }: CreditsDisplayProps) {
    const [credits, setCredits] = useState<UserCredits | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCredits = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const data = await getUserCredits(userId);
                setCredits(data);
            } catch (error) {
                console.error("Error fetching credits:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCredits();
    }, [userId]);

    if (loading) {
        return (
            <div className="bg-white rounded-[2rem] p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-2 w-full rounded-full" />
            </div>
        );
    }

    if (!credits) return null;

    const percentage = credits.creditsLimit > 0
        ? Math.min(100, (credits.creditsRemaining / credits.creditsLimit) * 100)
        : 0;

    const isLow = credits.creditsRemaining <= 2;
    const isEmpty = credits.creditsRemaining === 0;

    const PlanIcon = credits.plan === "unlimited"
        ? Crown
        : credits.plan === "pro"
            ? Sparkles
            : credits.plan === "starter"
                ? Star
                : Zap;

    const planColor = credits.plan === "unlimited"
        ? "text-amber-500"
        : credits.plan === "pro"
            ? "text-[#5B79A6]"
            : credits.plan === "starter"
                ? "text-blue-500"
                : "text-gray-400";

    return (
        <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-white rounded-[2rem] p-6 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-left group cursor-pointer"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl bg-gray-50 ${planColor}`}>
                            <PlanIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 font-poppins">
                                {PLAN_CONFIGS[credits.plan].name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-poppins uppercase tracking-wide">
                                Daily Credits
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>

                {/* Credits Counter */}
                <div className="flex items-baseline gap-1 mb-3">
                    <span className={`text-4xl font-caladea tracking-tight ${isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-gray-900"
                        }`}>
                        {credits.creditsRemaining}
                    </span>
                    <span className="text-gray-400 font-poppins text-sm">
                        / {credits.creditsLimit === 9999 ? "∞" : credits.creditsLimit}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full ${isEmpty
                            ? "bg-red-500"
                            : isLow
                                ? "bg-amber-500"
                                : "bg-[#5B79A6]"
                            }`}
                    />
                </div>

                {/* Upgrade hint */}
                {(isEmpty || isLow) && (
                    <p className={`text-xs font-poppins mt-3 ${isEmpty ? "text-red-500" : "text-amber-500"}`}>
                        {isEmpty ? "Upgrade now →" : "Low credits →"}
                    </p>
                )}
            </motion.div>
        </Link>
    );
}
