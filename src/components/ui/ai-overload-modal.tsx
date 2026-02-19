"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Cloud, AlertTriangle, Timer, RefreshCw } from "lucide-react";
import { Button } from "./button";

export type AIErrorType = "overloaded" | "quota" | "unavailable";

interface AIErrorModalProps {
    isOpen: boolean;
    errorType: AIErrorType;
    retryAfter?: number; // seconds
    onClose: () => void;
    onRetry: () => void;
}

const errorConfig = {
    overloaded: {
        icon: Cloud,
        iconBg: "bg-orange-500",
        title: "AI is Busy",
        message: "Our servers are handling many requests. Please try again in a moment.",
    },
    quota: {
        icon: Timer,
        iconBg: "bg-red-500",
        title: "Daily Limit Reached",
        message: "You've reached the daily generation limit. Try again in a few minutes.",
    },
    unavailable: {
        icon: AlertTriangle,
        iconBg: "bg-gray-500",
        title: "Service Unavailable",
        message: "AI service is temporarily down. Please try again later.",
    },
};

export function AIErrorModal({ isOpen, errorType, retryAfter, onClose, onRetry }: AIErrorModalProps) {
    if (!isOpen) return null;

    const config = errorConfig[errorType] || errorConfig.unavailable;
    const IconComponent = config.icon;

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
                        <div className="bg-[#FDFBF9] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-8 text-center">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Icon */}
                            <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center mx-auto mb-6`}>
                                <IconComponent className="w-8 h-8 text-white" />
                            </div>

                            {/* Content */}
                            <h2 className="text-xl font-caladea text-gray-900 mb-2">
                                {config.title}
                            </h2>
                            <p className="text-gray-500 text-sm mb-2 font-poppins">
                                {config.message}
                            </p>

                            {/* Retry timer hint */}
                            {retryAfter && retryAfter > 0 && (
                                <p className="text-xs text-gray-400 mb-4 font-poppins">
                                    Try again in ~{Math.ceil(retryAfter)} seconds
                                </p>
                            )}

                            {!retryAfter && <div className="mb-4" />}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1 h-11 rounded-full border-gray-200"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={onRetry}
                                    className="flex-1 h-11 rounded-full bg-gray-900 text-white hover:bg-gray-800"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Retry
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Helper to parse error and determine type
export function parseAIError(errorMessage: string): { type: AIErrorType; retryAfter?: number } {
    const lowerMessage = errorMessage.toLowerCase();

    // Check for quota/rate limit errors (429)
    if (lowerMessage.includes("429") ||
        lowerMessage.includes("quota") ||
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("resource_exhausted")) {

        // Try to extract retry time
        const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
        const retryAfter = retryMatch ? parseFloat(retryMatch[1]) : 60;

        return { type: "quota", retryAfter };
    }

    // Check for overloaded errors (503)
    if (lowerMessage.includes("503") ||
        lowerMessage.includes("overloaded") ||
        lowerMessage.includes("service unavailable")) {
        return { type: "overloaded" };
    }

    // Default to unavailable
    return { type: "unavailable" };
}
