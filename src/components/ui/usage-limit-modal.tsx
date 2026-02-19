"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Crown } from "lucide-react";
import { Button } from "./button";

interface UsageLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade?: () => void;
}

export function UsageLimitModal({
    isOpen,
    onClose,
    onUpgrade,
}: UsageLimitModalProps) {
    if (!isOpen) return null;

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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
                    >
                        <div className="bg-[#FDFBF9] rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="p-8 pt-12 text-center">
                                {/* Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-6">
                                    <Zap className="w-8 h-8 text-white" />
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl sm:text-3xl font-caladea text-gray-900 mb-3">
                                    Limit Reached
                                </h2>

                                {/* Message */}
                                <p className="text-gray-500 text-base mb-8 leading-relaxed">
                                    You&apos;ve used all your free credits.
                                    <br />
                                    <span className="text-gray-400">Upgrade for unlimited access.</span>
                                </p>

                                {/* CTA */}
                                <Button
                                    onClick={() => {
                                        onUpgrade?.();
                                        onClose();
                                    }}
                                    className="w-full h-14 rounded-full bg-gray-900 text-white hover:bg-gray-800 text-base font-medium shadow-lg shadow-gray-900/10 transition-all"
                                >
                                    <Crown className="w-5 h-5 mr-2" />
                                    Upgrade to Pro
                                </Button>

                                {/* Secondary Action */}
                                <button
                                    onClick={onClose}
                                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Helper to detect rate limit errors
export function isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("429") ||
            message.includes("resource_exhausted") ||
            message.includes("quota") ||
            message.includes("rate limit") ||
            message.includes("too many requests")
        );
    }
    return false;
}
