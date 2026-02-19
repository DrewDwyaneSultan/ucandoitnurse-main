"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCw, Flame, Star, Zap, Trophy, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduledCard {
    id: string;
    question: string;
    topic: string;
    next_review_at: string | null;
    review_count: number;
    mastered: boolean | null;
}

const ITEMS_PER_PAGE = 10;

function TasksContent() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [cards, setCards] = useState<ScheduledCard[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const fetchCards = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("flashcards")
                .select("id, question, topic, next_review_at, review_count, mastered")
                .eq("user_id", user.id)
                .or("next_review_at.is.null,next_review_at.lte." + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
                .order("next_review_at", { ascending: true, nullsFirst: true });

            if (error) throw error;
            setCards(data || []);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchCards();
        }
    }, [user, fetchCards]);

    // Stats
    const overdueCount = cards.filter(c => {
        if (!c.next_review_at) return false;
        return new Date(c.next_review_at) < new Date();
    }).length;
    const todayCount = cards.filter(c => {
        if (!c.next_review_at) return false;
        const d = new Date(c.next_review_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;
    const masteredCount = cards.filter(c => c.mastered === true).length;

    // Pagination
    const totalPages = Math.ceil(cards.length / ITEMS_PER_PAGE);
    const paginatedCards = cards.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 md:py-6 bg-white/70 backdrop-blur-xl border-b border-gray-100"
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchCards}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                >
                    <RotateCw className="w-4 h-4" />
                </Button>
            </motion.nav>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-6"
                >
                    <h1 className="text-3xl sm:text-4xl font-caladea text-gray-900 tracking-tight">
                        Your Schedule
                    </h1>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-3 mb-6"
                >
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-2">
                            <Flame className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 font-poppins">{overdueCount}</span>
                        <p className="text-xs text-gray-400 font-poppins">Overdue</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-2">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 font-poppins">{todayCount}</span>
                        <p className="text-xs text-gray-400 font-poppins">Today</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-2">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 font-poppins">{masteredCount}</span>
                        <p className="text-xs text-gray-400 font-poppins">Mastered</p>
                    </div>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : cards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                            <Star className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-caladea text-gray-900 mb-2">All caught up!</h2>
                        <p className="text-gray-500 font-poppins text-sm mb-6">
                            Great job! No cards to review.
                        </p>
                        <Button
                            onClick={() => router.push("/books")}
                            className="rounded-full bg-gray-900 text-white px-8 font-poppins"
                        >
                            Keep learning
                        </Button>
                    </motion.div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {paginatedCards.map((card, index) => {
                                const now = new Date();
                                const reviewDate = card.next_review_at ? new Date(card.next_review_at) : null;
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                                let dateLabel = "New";
                                let dateStyle = "bg-[#5B79A6] text-white";

                                if (reviewDate) {
                                    const cardDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                                    const diffDays = Math.floor((cardDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                    if (diffDays < 0) {
                                        dateLabel = "Overdue";
                                        dateStyle = "bg-red-500 text-white";
                                    } else if (diffDays === 0) {
                                        dateLabel = "Today";
                                        dateStyle = "bg-amber-500 text-white";
                                    } else if (diffDays === 1) {
                                        dateLabel = "Tomorrow";
                                        dateStyle = "bg-gray-400 text-white";
                                    } else {
                                        dateLabel = reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                        dateStyle = "bg-gray-200 text-gray-600";
                                    }
                                }

                                // Streak indicator based on review count
                                const streakLevel = Math.min(5, Math.floor((card.review_count || 0) / 2));

                                return (
                                    <motion.div
                                        key={card.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        onClick={() => router.push(`/flashcards?flashcardId=${card.id}&from=tasks`)}
                                        className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4"
                                    >
                                        {/* Streak indicator */}
                                        <div className="flex flex-col items-center gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${i < streakLevel ? "bg-emerald-500" : "bg-gray-200"
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 font-poppins line-clamp-1">
                                                {card.question}
                                            </p>
                                            <p className="text-xs text-gray-400 font-poppins mt-0.5">
                                                {card.topic}
                                            </p>
                                        </div>

                                        {/* Date badge */}
                                        <div className={`px-3 py-1.5 rounded-full ${dateStyle}`}>
                                            <span className="text-xs font-medium font-poppins">
                                                {dateLabel}
                                            </span>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-40"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>

                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-full font-poppins text-sm font-medium transition-all ${currentPage === page
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-500 hover:bg-gray-100"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-40"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function TasksPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        }>
            <TasksContent />
        </Suspense>
    );
}
