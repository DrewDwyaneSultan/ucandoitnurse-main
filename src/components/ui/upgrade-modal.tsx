"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/credits";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan?: SubscriptionPlan;
    creditsRemaining?: number;
}

export function UpgradeModal({ isOpen, onClose, creditsRemaining = 0 }: UpgradeModalProps) {
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
