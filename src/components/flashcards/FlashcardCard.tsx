"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Volume2, Star, VolumeX, Vote, BookmarkX, Check, Circle, Share2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Flashcard } from "@/types/database.types";

interface FlashcardCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
    onFavoriteChange?: (id: string, isFavorite: boolean) => void;
    onMarkIncorrect?: (id: string, needsReview: boolean) => void;
    onShare?: (flashcard: Flashcard) => void;
    onAddToFolder?: (flashcard: Flashcard) => void;
}

export function FlashcardCard({
    flashcard,
    isFlipped,
    onFlip,
    onFavoriteChange,
    onMarkIncorrect,
    onShare,
    onAddToFolder,
}: FlashcardCardProps) {
    const [isFavorite, setIsFavorite] = useState(flashcard.is_favorite || false);
    const [showHint, setShowHint] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    // Database: null = neutral (never set), true = mastered, false = needs review
    // UI State: null = neutral, false = mastered, true = needs review
    // Mapping: DB null -> UI null, DB true -> UI false, DB false -> UI true
    const [reviewStatus, setReviewStatus] = useState<boolean | null>(() => {
        if (flashcard.mastered === null || flashcard.mastered === undefined) {
            return null; // Neutral - user hasn't decided
        }
        return flashcard.mastered === true ? false : true; // true in DB = mastered (false in UI), false in DB = review (true in UI)
    });
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Reset states when card changes
    useEffect(() => {
        setShowHint(false);
        setShowExplanation(false);
        setIsFavorite(flashcard.is_favorite || false);
        // Reset review status based on database value
        if (flashcard.mastered === null || flashcard.mastered === undefined) {
            setReviewStatus(null); // Neutral
        } else {
            setReviewStatus(flashcard.mastered === true ? false : true);
        }
        // Stop any ongoing speech when card changes
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [flashcard.id, flashcard.is_favorite, flashcard.mastered]);

    // Reset explanation visibility when flipped back to front
    useEffect(() => {
        if (!isFlipped) {
            const timer = setTimeout(() => setShowExplanation(false), 300); // Wait for transition
            return () => clearTimeout(timer);
        }
    }, [isFlipped]);

    const handleFavorite = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newFavoriteState = !isFavorite;
        setIsFavorite(newFavoriteState);

        try {
            await supabase
                .from("flashcards")
                .update({ is_favorite: newFavoriteState })
                .eq("id", flashcard.id);

            onFavoriteChange?.(flashcard.id, newFavoriteState);
            toast.success(newFavoriteState ? "Nice pick - added to favorites!" : "Removed from favorites");
        } catch (error) {
            console.error("Error updating favorite:", error);
            setIsFavorite(!newFavoriteState); // Revert on error
        }
    };

    const handleGetHint = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (flashcard.hint) {
            setShowHint(!showHint);
        } else {
            toast.info("No hint available for this one - you've got this!");
        }
    };

    const handleSpeak = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.speechSynthesis) {
            toast.error("Oops, your browser doesn't support text-to-speech!");
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const textToSpeak = isFlipped
            ? `The answer is: ${flashcard.explanation || flashcard.correct_answer}`
            : flashcard.question;

        speechRef.current = new SpeechSynthesisUtterance(textToSpeak);
        speechRef.current.rate = 0.9;
        speechRef.current.pitch = 1;

        speechRef.current.onend = () => {
            setIsSpeaking(false);
        };

        speechRef.current.onerror = () => {
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(speechRef.current);
        setIsSpeaking(true);
    };

    const handleVoteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowExplanation((prev) => !prev); // Toggle between answer and explanation
    };

    // Cycle through states: null (neutral) → true (needs review) → false (mastered) → null
    const handleCycleReviewStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Determine next state in cycle
        let newStatus: boolean | null;
        if (reviewStatus === null) {
            newStatus = true; // neutral → needs review
        } else if (reviewStatus === true) {
            newStatus = false; // needs review → mastered
        } else {
            newStatus = null; // mastered → neutral
        }

        setReviewStatus(newStatus);

        try {
            await supabase
                .from("flashcards")
                .update({
                    mastered: newStatus === false ? true : newStatus === true ? false : null,
                    review_count: flashcard.review_count + 1,
                    last_reviewed_at: new Date().toISOString()
                })
                .eq("id", flashcard.id);

            onMarkIncorrect?.(flashcard.id, newStatus === true);

            if (newStatus === true) {
                toast.success("Added to your review list - keep practicing!");
            } else if (newStatus === false) {
                toast.success("You nailed it - marked as mastered!");
            } else {
                toast.success("Status cleared - fresh slate!");
            }
        } catch (error) {
            console.error("Error updating review status:", error);
            setReviewStatus(reviewStatus); // Revert on error
        }
    };

    // Dynamic text size based on content length
    const getTextSizeClass = (text: string) => {
        const length = text.length;
        if (length > 300) return "text-sm sm:text-base md:text-lg";
        if (length > 200) return "text-base sm:text-lg md:text-xl";
        if (length > 100) return "text-lg sm:text-xl md:text-2xl";
        return "text-xl sm:text-2xl md:text-3xl";
    };

    return (
        <div className="w-full max-w-2xl mx-auto perspective-1000">
            <motion.div
                className="relative w-full aspect-[3/4] sm:aspect-[4/3] md:aspect-[16/10]"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            >
                {/* Front of Card (Question) */}
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <div className={`h-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 border flex flex-col overflow-hidden group transition-colors ${reviewStatus === true ? "border-red-300 shadow-red-100/50" : reviewStatus === false ? "border-green-300 shadow-green-100/50" : "border-gray-100 hover:border-gray-200"}`}>
                        {/* Top Bar */}
                        <div className="flex items-center justify-between p-4 md:p-6 flex-shrink-0">
                            <button
                                onClick={handleGetHint}
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${showHint ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Lightbulb className="w-4 h-4" />
                                <span>Get a hint</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSpeak}
                                    className={`p-2 rounded-full transition-colors ${isSpeaking
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {isSpeaking ? (
                                        <VolumeX className="w-5 h-5" />
                                    ) : (
                                        <Volume2 className="w-5 h-5" />
                                    )}
                                </button>
                                {onShare && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onShare(flashcard);
                                        }}
                                        className="p-2 rounded-full transition-colors text-gray-400 hover:text-blue-500"
                                        title="Share with friend"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                )}
                                {onAddToFolder && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddToFolder(flashcard);
                                        }}
                                        className="p-2 rounded-full transition-colors text-gray-400 hover:text-green-500"
                                        title="Add to folder"
                                    >
                                        <FolderPlus className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleFavorite}
                                    className={`p-2 rounded-full transition-colors ${isFavorite
                                        ? "text-yellow-500"
                                        : "text-gray-400 hover:text-yellow-500"
                                        }`}
                                >
                                    <Star
                                        className={`w-5 h-5 ${isFavorite ? "fill-yellow-500" : ""}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div
                            className="flex-1 w-full flex flex-col items-center justify-center px-6 md:px-12 min-h-0 cursor-pointer"
                            onClick={onFlip}
                        >
                            <div className="w-full max-h-full overflow-y-auto scrollbar-hide flex flex-col items-center justify-center py-4">
                                <AnimatePresence mode="wait">
                                    {!showHint ? (
                                        // Show Question
                                        <motion.div
                                            key="question"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-center"
                                        >
                                            <h2 className={`${getTextSizeClass(flashcard.question)} font-poppins font-medium text-gray-900 leading-relaxed`}>
                                                {flashcard.question}
                                            </h2>
                                        </motion.div>
                                    ) : (
                                        // Show Hint
                                        <motion.div
                                            key="hint"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-center"
                                        >
                                            <div className="inline-flex items-center gap-2 mb-4">
                                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                                <span className="text-sm font-medium text-amber-600 uppercase tracking-wide">Hint</span>
                                            </div>
                                            <p className="text-sm sm:text-base md:text-lg font-poppins text-gray-600 leading-relaxed">
                                                {flashcard.hint}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="p-4 md:p-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <span className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center block">
                                Click to flip
                            </span>
                        </div>
                    </div>
                </div>

                {/* Back of Card (Answer) */}
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <div className={`h-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 border flex flex-col overflow-hidden group transition-colors ${reviewStatus === true ? "border-red-300 shadow-red-100/50" : reviewStatus === false ? "border-green-300 shadow-green-100/50" : "border-gray-100"}`}>
                        {/* Top Bar */}
                        <div className="flex items-center justify-end p-4 md:p-6 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                {/* Review Status - Cycles through: neutral → needs review → mastered */}
                                <button
                                    onClick={handleCycleReviewStatus}
                                    className={`p-2 rounded-full transition-all ${reviewStatus === true
                                        ? "text-red-500 bg-red-50"
                                        : reviewStatus === false
                                            ? "text-green-500 bg-green-50"
                                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                        }`}
                                    title={
                                        reviewStatus === null
                                            ? "Click to mark for review"
                                            : reviewStatus === true
                                                ? "Click to mark as mastered"
                                                : "Click to clear status"
                                    }
                                >
                                    {reviewStatus === null ? (
                                        <Circle className="w-5 h-5" />
                                    ) : reviewStatus === true ? (
                                        <BookmarkX className="w-5 h-5 fill-red-100" />
                                    ) : (
                                        <Check className="w-5 h-5 stroke-[3]" />
                                    )}
                                </button>
                                <button
                                    onClick={handleSpeak}
                                    className={`p-2 rounded-full transition-colors ${isSpeaking
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {isSpeaking ? (
                                        <VolumeX className="w-5 h-5" />
                                    ) : (
                                        <Volume2 className="w-5 h-5" />
                                    )}
                                </button>
                                {onShare && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onShare(flashcard);
                                        }}
                                        className="p-2 rounded-full transition-colors text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                                        title="Share with friend"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                )}
                                {/* Vote button to show explanation */}
                                {flashcard.explanation && (
                                    <button
                                        onClick={handleVoteClick}
                                        className={`p-2 rounded-full transition-colors ${showExplanation
                                            ? "text-indigo-600 bg-indigo-50"
                                            : "text-gray-400 hover:text-indigo-600 hover:bg-gray-50"
                                            }`}
                                        title="Show explanation"
                                    >
                                        <Vote className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={handleFavorite}
                                    className={`p-2 rounded-full transition-colors ${isFavorite
                                        ? "text-yellow-500"
                                        : "text-gray-400 hover:text-yellow-500"
                                        }`}
                                >
                                    <Star
                                        className={`w-5 h-5 ${isFavorite ? "fill-yellow-500" : ""}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Main Content - Answer OR Explanation */}
                        <div
                            className="flex-1 w-full flex items-center justify-center px-6 md:px-12 min-h-0 cursor-pointer"
                            onClick={onFlip}
                        >
                            <div className="w-full max-h-full overflow-y-auto scrollbar-hide flex flex-col items-center justify-center py-4">
                                <AnimatePresence mode="wait">
                                    {!showExplanation ? (
                                        // Show Answer
                                        <motion.div
                                            key="answer"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-center"
                                        >
                                            <p className={`${getTextSizeClass(flashcard.correct_answer)} font-poppins font-medium text-gray-900 leading-relaxed`}>
                                                {flashcard.correct_answer}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        // Show Explanation
                                        <motion.div
                                            key="explanation"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-center"
                                        >
                                            <p className="text-sm sm:text-base md:text-lg font-poppins text-gray-600 leading-relaxed">
                                                {flashcard.explanation}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="p-4 md:p-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <span className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center block">
                                Click to flip back
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
