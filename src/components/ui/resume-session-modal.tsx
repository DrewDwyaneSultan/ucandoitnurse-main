"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RotateCcw } from "lucide-react";
import { Button } from "./button";
import type { FlashcardSession } from "@/lib/cookies";

interface ResumeSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onResume: () => void;
    onStartFresh: () => void;
    session: FlashcardSession | null;
}

export function ResumeSessionModal({
    isOpen,
    onClose,
    onResume,
    onStartFresh,
    session,
}: ResumeSessionModalProps) {
    if (!isOpen || !session) return null;

    const progress = Math.round((session.currentIndex / session.totalCards) * 100);
    const lastAccessedDate = new Date(session.lastAccessed);
    const timeAgo = getTimeAgo(lastAccessedDate);

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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
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
                            <div className="p-8 pt-12">
                                {/* Progress Circle */}
                                <div className="w-20 h-20 rounded-full border-4 border-gray-200 flex items-center justify-center mx-auto mb-6 relative">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle
                                            cx="40"
                                            cy="40"
                                            r="36"
                                            strokeWidth="4"
                                            stroke="#111"
                                            fill="none"
                                            strokeDasharray={`${progress * 2.26} 226`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="text-lg font-medium text-gray-900">{progress}%</span>
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl font-caladea text-gray-900 text-center mb-2">
                                    Welcome Back
                                </h2>

                                {/* Info */}
                                <p className="text-gray-500 text-center text-sm mb-2">
                                    {session.bookTitle}
                                </p>
                                <p className="text-gray-400 text-center text-xs mb-6">
                                    Card {session.currentIndex + 1} of {session.totalCards} • {timeAgo}
                                </p>

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <Button
                                        onClick={onResume}
                                        className="w-full h-14 rounded-full bg-gray-900 text-white hover:bg-gray-800 text-base font-medium"
                                    >
                                        <Play className="w-5 h-5 mr-2" />
                                        Resume Studying
                                    </Button>
                                    <Button
                                        onClick={onStartFresh}
                                        variant="outline"
                                        className="w-full h-12 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Start Over
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
        return "Just now";
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays === 1) {
        return "Yesterday";
    } else {
        return `${diffDays} days ago`;
    }
}
