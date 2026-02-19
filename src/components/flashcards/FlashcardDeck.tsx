"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ResumeSessionModal } from "@/components/ui/resume-session-modal";
import { HonestyReminderModal, useHonestyReminder } from "@/components/ui/honesty-reminder-modal";
import { FlashcardCard } from "./FlashcardCard";
import { ProgressBar } from "./ProgressBar";
import {
    Play,
    Pause,
    Shuffle,
    ArrowLeft,
    ArrowRight,
    LibraryBigIcon,
    Rotate3D,
    Timer,
    TimerOff,
    Check,
    X,
    UserRoundSearch,
    Loader2,
    ArrowUpRight,
    FolderPlus,
    Folder,
} from "lucide-react";
import { toast } from "sonner";
import { useFlashcardSession } from "@/hooks/useSession";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Flashcard } from "@/types/database.types";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";

// Timer constants for scored mode
const QUESTION_TIME = 15; // 15 seconds for question
const ANSWER_TIME = 5; // 5 seconds for answer

interface Friend {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
}

interface FolderOption {
    id: string;
    name: string;
    color: string;
}

interface FlashcardDeckProps {
    flashcards: Flashcard[];
    bookId: string;
    bookTitle: string;
    onComplete: (results: { correct: number; incorrect: number }) => void;
    onBack: () => void;
}

export function FlashcardDeck({
    flashcards: initialFlashcards,
    bookId,
    bookTitle,
    onComplete,
    onBack
}: FlashcardDeckProps) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [isShuffled, setIsShuffled] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [isScoredMode, setIsScoredMode] = useState(false);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [scoredStartTime, setScoredStartTime] = useState<number | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [answeredCards, setAnsweredCards] = useState<Set<string>>(new Set());
    const [wasScoredSession, setWasScoredSession] = useState(false);
    const [cardReviews, setCardReviews] = useState<Map<string, number>>(new Map()); // cardId -> quality (0-5)
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
    const scoredTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Share modal state
    const [showShareModal, setShowShareModal] = useState(false);
    const [cardToShare, setCardToShare] = useState<Flashcard | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [sharingTo, setSharingTo] = useState<string | null>(null);
    const [searchFriend, setSearchFriend] = useState("");

    // Folder modal state
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [cardForFolder, setCardForFolder] = useState<Flashcard | null>(null);
    const [folders, setFolders] = useState<FolderOption[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [addingToFolder, setAddingToFolder] = useState<string | null>(null);

    const { user } = useAuth();

    // Honesty reminder modal
    const { shouldShow: shouldShowHonestyReminder, isChecking: isCheckingReminder, hideForever: hideHonestyForever, dismiss: dismissHonesty } = useHonestyReminder();
    const [honestyModalDismissed, setHonestyModalDismissed] = useState(false);

    // Session management
    const {
        session,
        showResumeModal,
        setShowResumeModal,
        startNewSession,
        resumeSession,
        endSession,
        setCurrentIndex: saveCurrentIndex,
        setShuffled: saveShuffled,
    } = useFlashcardSession(bookId, bookTitle);

    // Initialize or resume session
    useEffect(() => {
        if (session && !showResumeModal) {
            setCurrentIndex(session.currentIndex);
            setIsShuffled(session.isShuffled);
        } else if (!session && !showResumeModal) {
            startNewSession(initialFlashcards.length);
        }
    }, [session, showResumeModal, initialFlashcards.length, startNewSession]);

    // Save progress when currentIndex changes
    useEffect(() => {
        if (currentIndex > 0 && !completed) {
            saveCurrentIndex(currentIndex);
        }
    }, [currentIndex, saveCurrentIndex, completed]);

    // Fetch friends when share modal opens
    useEffect(() => {
        const fetchFriends = async () => {
            if (!showShareModal || !user) return;
            setLoadingFriends(true);
            try {
                const res = await fetch(`/api/friends?userId=${user.id}&type=accepted`);
                const data = await res.json();
                if (data.friendships) {
                    // Transform friendships to Friend format
                    const friendsList = data.friendships.map((f: {
                        requester_id: string;
                        addressee_id: string;
                        friend_profile: { id: string; display_name: string | null; avatar_url: string | null }
                    }) => ({
                        id: f.requester_id === user.id ? f.addressee_id : f.requester_id,
                        display_name: f.friend_profile?.display_name,
                        avatar_url: f.friend_profile?.avatar_url,
                    }));
                    setFriends(friendsList);
                }
            } catch (error) {
                console.error("Error fetching friends:", error);
            } finally {
                setLoadingFriends(false);
            }
        };
        fetchFriends();
    }, [showShareModal, user]);

    // Fetch folders when folder modal opens
    useEffect(() => {
        const fetchFolders = async () => {
            if (!showFolderModal || !user) return;
            setLoadingFolders(true);
            try {
                const res = await fetch(`/api/folders?userId=${user.id}`);
                const data = await res.json();
                if (data.folders) {
                    setFolders(data.folders.map((f: { id: string; name: string; color: string }) => ({
                        id: f.id,
                        name: f.name,
                        color: f.color,
                    })));
                }
            } catch (error) {
                console.error("Error fetching folders:", error);
            } finally {
                setLoadingFolders(false);
            }
        };
        fetchFolders();
    }, [showFolderModal, user]);

    // Handle adding card to folder
    const handleAddToFolder = async (folderId: string) => {
        if (!user || !cardForFolder) return;
        setAddingToFolder(folderId);
        try {
            const res = await fetch("/api/folders/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId,
                    userId: user.id,
                    itemType: "flashcard",
                    itemId: cardForFolder.id,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.error === "Item already in folder") {
                    toast.error("This card is already in that folder!");
                } else {
                    throw new Error(data.error);
                }
            } else {
                toast.success("Card added to folder!");
                setShowFolderModal(false);
                setCardForFolder(null);
            }
        } catch (error) {
            console.error("Error adding to folder:", error);
            toast.error("Couldn't add to folder - try again!");
        } finally {
            setAddingToFolder(null);
        }
    };

    const currentCard = flashcards[currentIndex];

    const handleNext = useCallback(() => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setIsFlipped(false);
        } else {
            setCompleted(true);
            setIsAutoPlaying(false);
            onComplete({ correct: flashcards.length, incorrect: 0 });
        }
    }, [currentIndex, flashcards.length, onComplete]);

    // Auto-play functionality
    useEffect(() => {
        if (isAutoPlaying && !completed) {
            autoPlayRef.current = setInterval(() => {
                if (isFlipped) {
                    setCurrentIndex((prev) => {
                        if (prev < flashcards.length - 1) {
                            return prev + 1;
                        } else {
                            setCompleted(true);
                            setIsAutoPlaying(false);
                            onComplete({ correct: flashcards.length, incorrect: 0 });
                            return prev;
                        }
                    });
                    setIsFlipped(false);
                } else {
                    setIsFlipped(true);
                }
            }, 4000);
        }

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [isAutoPlaying, isFlipped, completed, flashcards.length, onComplete]);

    // Scored mode timer
    useEffect(() => {
        if (isScoredMode && !completed) {
            setTimeLeft(isFlipped ? ANSWER_TIME : QUESTION_TIME);

            scoredTimerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        if (!isFlipped) {
                            setIsFlipped(true);
                            return ANSWER_TIME;
                        } else {
                            if (currentIndex < flashcards.length - 1) {
                                setCurrentIndex((prevIdx) => prevIdx + 1);
                                setIsFlipped(false);
                                return QUESTION_TIME;
                            } else {
                                setCompleted(true);
                                setIsScoredMode(false);
                                onComplete({ correct: flashcards.length, incorrect: 0 });
                                return 0;
                            }
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (scoredTimerRef.current) {
                clearInterval(scoredTimerRef.current);
            }
        };
    }, [isScoredMode, isFlipped, currentIndex, completed, flashcards.length, onComplete]);

    // Reset timer when manually changing cards in scored mode
    useEffect(() => {
        if (isScoredMode) {
            setTimeLeft(isFlipped ? ANSWER_TIME : QUESTION_TIME);
        }
    }, [currentIndex, isScoredMode, isFlipped]);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            setIsFlipped(false);
        }
    };

    const handleToggleAutoPlay = () => {
        if (isScoredMode) {
            setIsScoredMode(false);
        }
        setIsAutoPlaying(!isAutoPlaying);
        if (!isAutoPlaying) {
            toast.success("Sit back and relax - auto-play is on!");
        }
    };

    const handleToggleScoredMode = () => {
        if (isAutoPlaying) {
            setIsAutoPlaying(false);
        }
        const newState = !isScoredMode;
        setIsScoredMode(newState);
        if (newState) {
            setScoredStartTime(Date.now());
            setCorrectCount(0);
            setIncorrectCount(0);
            setAnsweredCards(new Set());
            setWasScoredSession(true);
            setTimeLeft(isFlipped ? ANSWER_TIME : QUESTION_TIME);
            toast.success("Game on - Scored Mode activated!");
        } else {
            setScoredStartTime(null);
            toast.info("Scored Mode turned off - no pressure!");
        }
    };

    const handleShuffle = () => {
        const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
        setFlashcards(shuffled);
        setCurrentIndex(0);
        setIsFlipped(false);
        const newShuffleState = !isShuffled;
        setIsShuffled(newShuffleState);
        saveShuffled(newShuffleState);
        toast.success("Cards all mixed up - time to test yourself!");
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setCompleted(false);
        setIsAutoPlaying(false);
        setIsScoredMode(false);
        setTimeLeft(QUESTION_TIME);
        setCorrectCount(0);
        setIncorrectCount(0);
        setAnsweredCards(new Set());
        setCardReviews(new Map());
        setScoredStartTime(null);
        setWasScoredSession(false);
        startNewSession(flashcards.length);
    };

    // Save scored session to database and update spaced repetition scheduler
    const saveStudySession = useCallback(async () => {
        if (!user || !scoredStartTime) return;

        const timeSpent = Math.round((Date.now() - scoredStartTime) / 1000);
        const totalAnswered = correctCount + incorrectCount;
        const scorePercentage = totalAnswered > 0
            ? Math.round((correctCount / totalAnswered) * 100)
            : 0;
        const skippedCount = flashcards.length - totalAnswered;

        try {
            // Save the study session
            await supabase.from("study_sessions").insert({
                user_id: user.id,
                book_id: bookId,
                mode: "scored",
                total_cards: flashcards.length,
                correct_count: correctCount,
                incorrect_count: incorrectCount,
                skipped_count: skippedCount,
                score_percentage: scorePercentage,
                time_spent_seconds: timeSpent,
            });

            // Update spaced repetition scheduler with card reviews
            if (cardReviews.size > 0) {
                const reviews = Array.from(cardReviews.entries()).map(([flashcardId, quality]) => ({
                    flashcardId,
                    quality,
                }));

                await fetch("/api/scheduler", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.id,
                        reviews,
                    }),
                });
            }

            toast.success(`Awesome session saved! You scored ${scorePercentage} percent!`);
        } catch (error) {
            console.error("Error saving study session:", error);
        }
    }, [user, scoredStartTime, correctCount, incorrectCount, flashcards.length, bookId, cardReviews]);

    const handleComplete = useCallback(() => {
        endSession(flashcards.length);
        onComplete({ correct: correctCount, incorrect: incorrectCount });
    }, [endSession, flashcards.length, onComplete, correctCount, incorrectCount]);

    // Save session when completed in scored mode
    useEffect(() => {
        if (completed && wasScoredSession && scoredStartTime) {
            saveStudySession();
        }
    }, [completed, wasScoredSession, scoredStartTime, saveStudySession]);

    // Answer handlers for scored mode
    const handleMarkCorrect = useCallback(() => {
        const cardId = currentCard?.id;
        if (!cardId || answeredCards.has(cardId)) return;

        setAnsweredCards(prev => new Set(prev).add(cardId));
        setCorrectCount(prev => prev + 1);
        // Track review with quality 4 (correct after hesitation in SM-2 terms)
        setCardReviews(prev => new Map(prev).set(cardId, 4));

        if (currentIndex < flashcards.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setIsFlipped(false);
            }, 300);
        } else {
            setCompleted(true);
            setIsScoredMode(false);
        }
    }, [currentCard?.id, answeredCards, currentIndex, flashcards.length]);

    const handleMarkIncorrect = useCallback(() => {
        const cardId = currentCard?.id;
        if (!cardId || answeredCards.has(cardId)) return;

        setAnsweredCards(prev => new Set(prev).add(cardId));
        setIncorrectCount(prev => prev + 1);
        // Track review with quality 1 (incorrect but remembered upon seeing answer)
        setCardReviews(prev => new Map(prev).set(cardId, 1));

        // Still update immediately for backward compatibility
        supabase
            .from("flashcards")
            .update({ mastered: false, review_count: (currentCard?.review_count || 0) + 1 })
            .eq("id", cardId);

        if (currentIndex < flashcards.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setIsFlipped(false);
            }, 300);
        } else {
            setCompleted(true);
            setIsScoredMode(false);
        }
    }, [currentCard, answeredCards, currentIndex, flashcards.length]);

    const handleFavoriteChange = (id: string, isFavorite: boolean) => {
        setFlashcards((prev) =>
            prev.map((card) =>
                card.id === id ? { ...card, is_favorite: isFavorite } : card
            )
        );
    };

    // Share functionality
    const handleShareCard = (flashcard: Flashcard) => {
        setCardToShare(flashcard);
        setShowShareModal(true);
        setSearchFriend("");
    };

    const handleShareToFriend = async (friendId: string) => {
        if (!user || !cardToShare) return;

        setSharingTo(friendId);
        try {
            const res = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flashcardId: cardToShare.id,
                    senderId: user.id,
                    recipientId: friendId,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to share");
            }

            // Also duplicate the flashcard for the recipient so they own it permanently
            const { error: duplicateError } = await supabase.from("flashcards").insert({
                user_id: friendId,
                book_id: cardToShare.book_id,
                question: cardToShare.question,
                choices: cardToShare.choices || [], // Required field
                correct_answer: cardToShare.correct_answer,
                explanation: cardToShare.explanation,
                hint: cardToShare.hint,
                topic: cardToShare.topic,
                is_favorite: false,
                mastered: null,
                review_count: 0,
            });

            if (duplicateError) {
                console.error("Error duplicating flashcard:", duplicateError);
            }

            toast.success("Card sent to your friend - sharing is caring!");
            setShowShareModal(false);
            setCardToShare(null);
        } catch (error) {
            console.error("Error sharing:", error);
            toast.error(error instanceof Error ? error.message : "Hmm, couldn't share that card. Try again!");
        } finally {
            setSharingTo(null);
        }
    };

    const filteredFriends = friends.filter(f =>
        !searchFriend || f.display_name?.toLowerCase().includes(searchFriend.toLowerCase())
    );

    if (completed) {
        const totalAnswered = correctCount + incorrectCount;
        const scorePercentage = totalAnswered > 0
            ? Math.round((correctCount / totalAnswered) * 100)
            : 0;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center min-h-[50vh] px-4"
            >
                <div className="group w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-100 text-center">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto mb-6 sm:mb-8">
                        <Image
                            src="/Star4-96px.svg"
                            alt="Completion Star"
                            fill
                            className="object-contain group-hover:scale-110 transition-transform duration-300 ease-in-out"
                        />
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-caladea text-gray-900 mb-3">
                        Session Complete!
                    </h2>

                    {wasScoredSession ? (
                        <>
                            <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-2 font-poppins">
                                {scorePercentage}%
                            </div>
                            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6 flex-wrap">
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="font-medium font-poppins text-sm sm:text-base">{correctCount} correct</span>
                                </div>
                                <div className="flex items-center gap-2 text-red-500">
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="font-medium font-poppins text-sm sm:text-base">{incorrectCount} wrong</span>
                                </div>
                            </div>
                            <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-lg font-poppins">
                                {flashcards.length - totalAnswered > 0 &&
                                    `${flashcards.length - totalAnswered} skipped • `
                                }
                                {flashcards.length} total cards
                            </p>
                        </>
                    ) : (
                        <p className="text-gray-500 mb-8 sm:mb-10 text-sm sm:text-lg font-poppins">
                            You reviewed all {flashcards.length} flashcards
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={handleRestart}
                            className="flex-1 h-12 sm:h-14 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 text-sm sm:text-base"
                        >
                            <Rotate3D className="w-4 h-4 mr-2" />
                            Review Again
                        </Button>
                        <Button
                            onClick={() => {
                                handleComplete();
                                onBack();
                            }}
                            className="flex-1 h-12 sm:h-14 rounded-full bg-gray-900 text-white hover:bg-gray-800 text-sm sm:text-base shadow-lg shadow-gray-900/10"
                        >
                            <LibraryBigIcon className="w-4 h-4 mr-2" />
                            Library
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-28 sm:pb-24 px-4 sm:px-0">
            {/* Progress Bar */}
            <ProgressBar current={currentIndex + 1} total={flashcards.length} />

            {/* Card Counter, Timer & Score */}
            <div className="text-center flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-xs sm:text-sm font-medium text-gray-400 font-poppins">
                    {currentIndex + 1} / {flashcards.length}
                </span>
                {isScoredMode && (
                    <>
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${timeLeft <= 5 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"} transition-colors`}>
                            <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="font-mono font-bold text-sm sm:text-lg tabular-nums">
                                {timeLeft}s
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1 rounded-full bg-gray-100">
                            <span className="flex items-center gap-1 text-green-600 font-medium font-poppins text-xs sm:text-sm">
                                <Check className="w-3 h-3 sm:w-4 sm:h-4" /> {correctCount}
                            </span>
                            <span className="flex items-center gap-1 text-red-500 font-medium font-poppins text-xs sm:text-sm">
                                <X className="w-3 h-3 sm:w-4 sm:h-4" /> {incorrectCount}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Flashcard */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                >
                    <FlashcardCard
                        flashcard={currentCard}
                        isFlipped={isFlipped}
                        onFlip={handleFlip}
                        onFavoriteChange={handleFavoriteChange}
                        onShare={handleShareCard}
                        onAddToFolder={(card) => {
                            setCardForFolder(card);
                            setShowFolderModal(true);
                        }}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Answer Buttons (Scored Mode) */}
            {isScoredMode && isFlipped && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-3 sm:gap-4 mt-4"
                >
                    <Button
                        onClick={handleMarkIncorrect}
                        disabled={answeredCards.has(currentCard?.id || "")}
                        className={`flex-1 max-w-32 sm:max-w-40 h-12 sm:h-14 rounded-full text-base sm:text-lg font-medium font-poppins transition-all duration-300 ${answeredCards.has(currentCard?.id || "")
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                            }`}
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        Wrong
                    </Button>
                    <Button
                        onClick={handleMarkCorrect}
                        disabled={answeredCards.has(currentCard?.id || "")}
                        className={`flex-1 max-w-32 sm:max-w-40 h-12 sm:h-14 rounded-full text-base sm:text-lg font-medium font-poppins transition-all duration-300 ${answeredCards.has(currentCard?.id || "")
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/30"
                            }`}
                    >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        Correct
                    </Button>
                </motion.div>
            )}

            {/* Control Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 sm:py-4 px-4 sm:px-6 z-50 safe-area-pb">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    {/* Play/Pause */}
                    <button
                        onClick={handleToggleAutoPlay}
                        className={`p-2.5 sm:p-3 rounded-full transition-all ${isAutoPlaying
                            ? "text-indigo-600 bg-indigo-50"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        title={isAutoPlaying ? "Pause" : "Play"}
                    >
                        {isAutoPlaying ? (
                            <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                    </button>

                    {/* Navigation */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className={`p-2.5 sm:p-3 rounded-full transition-all ${currentIndex === 0
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            title="Previous"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="p-2.5 sm:p-3 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
                            title="Next"
                        >
                            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Mode toggles */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={handleToggleScoredMode}
                            className={`p-2.5 sm:p-3 rounded-full transition-all ${isScoredMode
                                ? "text-orange-600 bg-orange-50"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            title={isScoredMode ? "Stop scored mode" : "Start scored mode"}
                        >
                            {isScoredMode ? (
                                <TimerOff className="w-5 h-5 sm:w-6 sm:h-6" />
                            ) : (
                                <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
                            )}
                        </button>
                        <button
                            onClick={handleShuffle}
                            className={`p-2.5 sm:p-3 rounded-full transition-all ${isShuffled
                                ? "text-indigo-600 bg-indigo-50"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            title="Shuffle"
                        >
                            <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-blue-50/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-xl border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl font-caladea text-gray-900">Share Flashcard</h3>
                            <button
                                onClick={() => {
                                    setShowShareModal(false);
                                    setCardToShare(null);
                                }}
                                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Card preview */}
                        {cardToShare && (
                            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-poppins">{cardToShare.topic}</p>
                                <p className="text-sm font-medium text-gray-900 line-clamp-2 font-poppins">{cardToShare.question}</p>
                            </div>
                        )}

                        {/* Search friends */}
                        <div className="relative mb-4">
                            <UserRoundSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search friends..."
                                value={searchFriend}
                                onChange={(e) => setSearchFriend(e.target.value)}
                                className="pl-10 h-10 sm:h-11 rounded-xl border-gray-200 font-poppins text-sm"
                            />
                        </div>

                        {/* Friends list */}
                        <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2">
                            {loadingFriends ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 font-poppins text-sm">
                                        {friends.length === 0 ? "No friends yet" : "No friends match your search"}
                                    </p>
                                </div>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserAvatar
                                                avatarUrl={friend.avatar_url}
                                                displayName={friend.display_name}
                                                clickable={false}
                                                size="md"
                                            />
                                            <span className="font-medium text-gray-900 font-poppins text-sm sm:text-base">
                                                {friend.display_name || "Unknown"}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleShareToFriend(friend.id)}
                                            disabled={sharingTo === friend.id}
                                            className="rounded-full bg-gray-900 text-white h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
                                        >
                                            {sharingTo === friend.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                                    Share
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Folder Selection Modal */}
            {showFolderModal && cardForFolder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-50">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-600 flex items-center justify-center">
                                    <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <h3 className="text-base sm:text-lg font-caladea text-gray-900">Add to Folder</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowFolderModal(false);
                                    setCardForFolder(null);
                                }}
                                className="text-gray-400 hover:text-gray-900 font-poppins text-xs sm:text-sm"
                            >
                                Close
                            </Button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto">
                            {loadingFolders ? (
                                <div className="flex items-center justify-center py-8 sm:py-12">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-gray-400" />
                                </div>
                            ) : folders.length === 0 ? (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                        <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-poppins text-sm sm:text-base">No folders yet</p>
                                    <p className="text-gray-400 font-poppins text-xs sm:text-sm mt-1">Create a folder from the Folders page</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    {folders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            onClick={() => handleAddToFolder(folder.id)}
                                            disabled={addingToFolder === folder.id}
                                            className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                <div
                                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
                                                    style={{ backgroundColor: `${folder.color}20` }}
                                                >
                                                    <Folder
                                                        className="w-4 h-4 sm:w-5 sm:h-5"
                                                        style={{ color: folder.color }}
                                                    />
                                                </div>
                                                <span className="font-medium text-gray-900 font-poppins text-sm sm:text-base">
                                                    {folder.name}
                                                </span>
                                            </div>
                                            {addingToFolder === folder.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            ) : (
                                                <FolderPlus className="w-4 h-4 text-gray-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Resume Session Modal */}
            <ResumeSessionModal
                isOpen={showResumeModal}
                onClose={() => {
                    setShowResumeModal(false);
                    startNewSession(flashcards.length);
                }}
                onResume={() => {
                    resumeSession();
                    if (session) {
                        setCurrentIndex(session.currentIndex);
                        setIsShuffled(session.isShuffled);
                    }
                }}
                onStartFresh={() => {
                    setShowResumeModal(false);
                    startNewSession(flashcards.length);
                }}
                session={session}
            />

            {/* Honesty Reminder Modal */}
            <HonestyReminderModal
                isOpen={shouldShowHonestyReminder && !honestyModalDismissed && !isCheckingReminder && !showResumeModal}
                onClose={() => {
                    dismissHonesty();
                    setHonestyModalDismissed(true);
                }}
                onDontShowAgain={hideHonestyForever}
            />
        </div>
    );
}
