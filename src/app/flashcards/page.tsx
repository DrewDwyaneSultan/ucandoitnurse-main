"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { AIErrorModal, parseAIError, type AIErrorType } from "@/components/ui/ai-overload-modal";
import { useModelPreference } from "@/components/ui/model-selector";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ArrowLeft, FileStack } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Flashcard, Book } from "@/types/database.types";

function FlashcardsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const bookId = searchParams.get("bookId");
    const flashcardId = searchParams.get("flashcardId"); // For viewing a single shared flashcard
    const setId = searchParams.get("setId"); // For viewing a flashcard set
    const mode = searchParams.get("mode") || "study"; // "generate" or "study"
    const filter = searchParams.get("filter"); // "mastered", "review", "favorites", or null for all
    const fromPage = searchParams.get("from"); // "tasks" or null

    const [book, setBook] = useState<Book | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [setName, setSetName] = useState<string | null>(null); // For set title display
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showAIError, setShowAIError] = useState(false);
    const [aiErrorType, setAiErrorType] = useState<AIErrorType>("overloaded");
    const [retryAfter, setRetryAfter] = useState<number | undefined>();
    const [retryBookId, setRetryBookId] = useState<string | null>(null);
    const [isSharedView, setIsSharedView] = useState(false); // Track if viewing a shared card
    const [isSetView, setIsSetView] = useState(false); // Track if viewing a set
    const { selectedModel } = useModelPreference();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const generateFlashcards = useCallback(async (currentBookId: string) => {
        setGenerating(true);

        try {
            const response = await fetch("/api/flashcards/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: "Key Concepts and Nursing Practice",
                    bookId: currentBookId,
                    userId: user?.id,
                    count: 10,
                    modelId: selectedModel, // Pass selected AI model
                }),
            });

            const data = await response.json();

            // Handle NO_CREDITS error - out of credits
            if (response.status === 402 || data.error === "NO_CREDITS") {
                toast.error("Oops, you are out of credits! But don't worry – everything is free now.");
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate flashcards");
            }

            // Set the newly generated flashcards
            setFlashcards(data.flashcards);
            toast.success(`Nice! ${data.flashcards.length} fresh cards ready to study!`);
        } catch (error) {
            console.error("Generate error:", error);
            const errorMessage = error instanceof Error ? error.message : "Generation failed";

            // Parse error to determine type
            const { type, retryAfter: retry } = parseAIError(errorMessage);

            // Show modal for AI-related errors
            if (type === "quota" || type === "overloaded" ||
                errorMessage.includes("503") || errorMessage.includes("429") ||
                errorMessage.includes("unavailable") || errorMessage.includes("overloaded")) {
                setRetryBookId(currentBookId);
                setAiErrorType(type);
                setRetryAfter(retry);
                setShowAIError(true);
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    }, [user?.id, selectedModel, router]);


    const fetchData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Case 1: View a flashcard set by ID
        if (setId && !bookId && !flashcardId) {
            try {
                const response = await fetch(`/api/folders/sets?setId=${setId}&userId=${user.id}`);
                const data = await response.json();

                if (response.ok && data.set) {
                    setFlashcards(data.set.flashcards || []);
                    setSetName(data.set.name || "Flashcard Set");
                    setIsSetView(true);
                }
            } catch (error) {
                console.error("Error fetching flashcard set:", error);
            }
            setLoading(false);
            return;
        }

        // Case 2: View a single shared flashcard by ID (uses API to bypass RLS)
        if (flashcardId && !bookId) {
            try {
                const response = await fetch(`/api/share/${flashcardId}?userId=${user.id}`);
                const data = await response.json();

                if (response.ok && data.flashcard) {
                    setFlashcards([data.flashcard]);
                    setIsSharedView(data.isShared);
                    if (data.book) {
                        setBook(data.book);
                    }

                    // If coming from tasks, mark the card as reviewed
                    if (fromPage === "tasks") {
                        const nextReview = new Date();
                        nextReview.setDate(nextReview.getDate() + 1); // Schedule for tomorrow

                        await supabase
                            .from("flashcards")
                            .update({
                                next_review_at: nextReview.toISOString(),
                                last_reviewed_at: new Date().toISOString(),
                                review_count: (data.flashcard.review_count || 0) + 1
                            })
                            .eq("id", flashcardId)
                            .eq("user_id", user.id);
                    }
                }
            } catch (error) {
                console.error("Error fetching shared flashcard:", error);
            }
            setLoading(false);
            return;
        }

        // Case 2: View flashcards by bookId (existing logic)
        if (!bookId) {
            setLoading(false);
            return;
        }

        // Fetch book info
        const { data: bookData } = await supabase
            .from("books")
            .select("*")
            .eq("id", bookId)
            .single();

        if (bookData) {
            setBook(bookData);
        } else {
            setLoading(false);
            return; // Book not found
        }

        // Different behavior based on mode
        if (mode === "generate") {
            // Generate mode: immediately start generating new cards
            generateFlashcards(bookId);
        } else {
            // Study mode: fetch existing flashcards with optional filtering
            const { data: cardsData } = await supabase
                .from("flashcards")
                .select("*")
                .eq("book_id", bookId)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (cardsData && cardsData.length > 0) {
                // Apply filter if specified
                let filteredCards = cardsData;

                if (filter === "mastered") {
                    filteredCards = cardsData.filter(c => c.mastered === true);
                } else if (filter === "review") {
                    filteredCards = cardsData.filter(c => c.mastered === false);
                } else if (filter === "favorites") {
                    filteredCards = cardsData.filter(c => c.is_favorite === true);
                }

                setFlashcards(filteredCards);
                setLoading(false);
            } else {
                // No cards found in study mode
                setFlashcards([]);
                setLoading(false);
            }
        }
    }, [bookId, flashcardId, setId, user, mode, filter, generateFlashcards, fromPage]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    // Log activity when user opens flashcards
    useEffect(() => {
        const logActivity = async () => {
            if (!user || !bookId) return;

            try {
                await supabase.from("activity_logs").insert({
                    user_id: user.id,
                    activity_type: "flashcard_open",
                    book_id: bookId,
                    metadata: { mode, filter },
                });
            } catch (error) {
                // Silently fail - activity logging should not break the app
                console.log("Activity logging failed:", error);
            }
        };

        logActivity();
    }, [user, bookId, mode, filter]);

    const handleStudyComplete = async (results: { correct: number; incorrect: number }) => {
        toast.success(
            `Great session! ${results.correct} correct, ${results.incorrect} to review. Keep it up!`
        );
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full" />
            </div>
        );
    }

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    if (loading || generating) {
        return (
            <div className="min-h-screen bg-[#FDFBF9] p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-md text-center">
                    {/* Animated loader */}
                    <div className="w-20 h-20 mx-auto mb-8 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-[#5B79A6] animate-spin" />
                    </div>

                    <h2 className="text-xl font-caladea text-gray-900 mb-2">
                        {generating ? "Generating Flashcards" : "Loading"}
                    </h2>

                    {generating && (
                        <>
                            <p className="text-gray-500 text-sm font-poppins mb-2">
                                AI is creating your personalized study deck
                            </p>
                            <div className="flex items-center justify-center gap-1">
                                <span className="w-2 h-2 bg-[#5B79A6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 bg-[#5B79A6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 bg-[#5B79A6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </>
                    )}

                    {!generating && (
                        <p className="text-gray-500 text-sm font-poppins">
                            Preparing your flashcards
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Only show "no book selected" if we don't have bookId, flashcardId, setId, or loaded flashcards
    // For shared cards/sets, we can proceed even without book data (using fallback title)
    if ((!bookId && !flashcardId && !setId) || (!book && !isSharedView && !isSetView) || ((flashcardId || setId) && flashcards.length === 0 && !loading)) {
        return (
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-6">
                <Empty className="max-w-md bg-white rounded-3xl border border-gray-100 p-12">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-6 mx-auto">
                        <FileStack className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-caladea text-gray-900 mb-2">
                        {flashcardId ? "Card not found" : "No book selected"}
                    </h3>
                    <p className="text-gray-500 text-sm mb-6">
                        {flashcardId
                            ? "This flashcard might have been deleted or is no longer available."
                            : "Please select a book from your library to start studying."}
                    </p>
                    <Button
                        onClick={() => router.push(flashcardId ? "/friends" : "/books")}
                        className="rounded-full bg-gray-900 text-white w-full h-12"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {flashcardId ? "Back to Friends" : "Go to Library"}
                    </Button>
                </Empty>
            </div>
        );
    }

    // Study mode with no flashcards (or no cards matching filter)
    if (mode === "study" && flashcards.length === 0 && !loading && !generating) {
        // Determine appropriate message based on filter
        const getEmptyMessage = () => {
            switch (filter) {
                case "mastered":
                    return {
                        title: "No mastered cards",
                        description: "You haven't mastered any cards yet. Keep studying!",
                        showGenerate: false,
                    };
                case "review":
                    return {
                        title: "No cards to review",
                        description: "Great job! You don't have any cards marked for review.",
                        showGenerate: false,
                    };
                case "favorites":
                    return {
                        title: "No favorite cards",
                        description: "Star cards while studying to add them here.",
                        showGenerate: false,
                    };
                default:
                    return {
                        title: "No flashcards yet",
                        description: "Generate some flashcards first to start studying.",
                        showGenerate: true,
                    };
            }
        };

        const emptyMessage = getEmptyMessage();

        return (
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-6">
                <Empty className="max-w-md bg-white rounded-3xl border border-gray-100 p-12">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-6 mx-auto">
                        <FileStack className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-caladea text-gray-900 mb-2">{emptyMessage.title}</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        {emptyMessage.description}
                    </p>
                    {emptyMessage.showGenerate ? (
                        <Button
                            onClick={() => router.push(`/flashcards?bookId=${bookId}&mode=generate`)}
                            className="rounded-full bg-gray-900 text-white w-full h-12"
                        >
                            Generate Flashcards
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push(`/books/${bookId}`)}
                            className="rounded-full bg-gray-900 text-white w-full h-12"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Book
                        </Button>
                    )}
                </Empty>
            </div>
        );
    }

    // Determine back navigation and title based on view type
    const getBackPath = () => {
        if (fromPage === "tasks") return "/tasks";
        if (isSetView) return "/folders";
        if (isSharedView) return "/friends";
        return `/books/${bookId}`;
    };

    const getTitle = () => {
        if (isSetView) return setName || "Flashcard Set";
        return book?.title || "Flashcards";
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] selection:bg-gray-900 selection:text-white">
            <div className="container mx-auto px-6 py-8 max-w-5xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto mb-10 flex items-center justify-between"
                >
                    <button
                        onClick={() => router.push(getBackPath())}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all duration-300 shadow-sm"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="text-right">
                        {isSharedView && (
                            <span className="text-xs text-blue-600 font-poppins mb-1 block">Shared Card</span>
                        )}
                        {isSetView && (
                            <span className="text-xs text-gray-500 font-poppins mb-1 block">Flashcard Set</span>
                        )}
                        <h1 className="font-caladea text-xl md:text-2xl text-gray-600 truncate max-w-[70%] leading-none">
                            {getTitle()}
                        </h1>
                    </div>
                </motion.div>

                {/* Main Content */}
                <FlashcardDeck
                    flashcards={flashcards}
                    bookId={book?.id || bookId || ""}
                    bookTitle={getTitle()}
                    onComplete={handleStudyComplete}
                    onBack={() => router.push(getBackPath())}
                />
            </div>

            {/* AI Error Modal */}
            <AIErrorModal
                isOpen={showAIError}
                errorType={aiErrorType}
                retryAfter={retryAfter}
                onClose={() => setShowAIError(false)}
                onRetry={() => {
                    setShowAIError(false);
                    if (retryBookId) {
                        generateFlashcards(retryBookId);
                    }
                }}
            />
        </div>
    );
}

export default function FlashcardsPage() {
    return (
        <ErrorBoundary>
            <Suspense
                fallback={
                    <div className="min-h-screen bg-[#FDFBF9] p-6 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 relative">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-gray-900 animate-spin" />
                        </div>
                    </div>
                }
            >
                <FlashcardsContent />
            </Suspense>
        </ErrorBoundary>
    );
}
