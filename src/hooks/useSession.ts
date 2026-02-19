"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FlashcardSession,
    saveFlashcardSession,
    clearFlashcardSession,
    checkSessionRecovery,
    saveLastBook,
    getLastBook,
    updateStudyStats,
    getStudyStats,
    getUserPreferences,
    saveUserPreferences,
    UserPreferences,
    StudyStats,
} from "@/lib/cookies";

export function useFlashcardSession(bookId: string, bookTitle: string) {
    const [session, setSession] = useState<FlashcardSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [startTime] = useState(Date.now());

    // Check for existing session on mount
    useEffect(() => {
        const recovery = checkSessionRecovery(bookId);

        if (recovery.canResume && recovery.session) {
            setSession(recovery.session);
            setShowResumeModal(true);
        }

        setIsLoading(false);
    }, [bookId]);

    // Save session whenever it changes
    const updateSession = useCallback((updates: Partial<FlashcardSession>) => {
        setSession((prev) => {
            const newSession: FlashcardSession = {
                bookId,
                bookTitle,
                currentIndex: updates.currentIndex ?? prev?.currentIndex ?? 0,
                totalCards: updates.totalCards ?? prev?.totalCards ?? 0,
                isShuffled: updates.isShuffled ?? prev?.isShuffled ?? false,
                lastAccessed: new Date().toISOString(),
            };

            saveFlashcardSession(newSession);
            return newSession;
        });
    }, [bookId, bookTitle]);

    // Start fresh session
    const startNewSession = useCallback((totalCards: number) => {
        const newSession: FlashcardSession = {
            bookId,
            bookTitle,
            currentIndex: 0,
            totalCards,
            isShuffled: false,
            lastAccessed: new Date().toISOString(),
        };

        setSession(newSession);
        saveFlashcardSession(newSession);
        saveLastBook(bookId, bookTitle);
        setShowResumeModal(false);
    }, [bookId, bookTitle]);

    // Resume from saved session
    const resumeSession = useCallback(() => {
        setShowResumeModal(false);
    }, []);

    // Clear session (on complete or manual)
    const endSession = useCallback((cardsStudied?: number) => {
        // Calculate time spent
        const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);

        // Update stats
        if (cardsStudied && cardsStudied > 0) {
            updateStudyStats(cardsStudied, timeSpentMinutes);
        }

        clearFlashcardSession();
        setSession(null);
    }, [startTime]);

    // Update current card index
    const setCurrentIndex = useCallback((index: number) => {
        updateSession({ currentIndex: index });
    }, [updateSession]);

    // Toggle shuffle state
    const setShuffled = useCallback((isShuffled: boolean) => {
        updateSession({ isShuffled });
    }, [updateSession]);

    return {
        session,
        isLoading,
        showResumeModal,
        setShowResumeModal,
        startNewSession,
        resumeSession,
        endSession,
        setCurrentIndex,
        setShuffled,
        updateSession,
    };
}

// Hook for user preferences
export function useUserPreferences() {
    const [preferences, setPreferences] = useState<UserPreferences>({
        autoPlaySpeed: 4,
        theme: "light",
        soundEnabled: true,
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setPreferences(getUserPreferences());
        setIsLoaded(true);
    }, []);

    const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
        setPreferences((prev) => {
            const newPrefs = { ...prev, ...updates };
            saveUserPreferences(newPrefs);
            return newPrefs;
        });
    }, []);

    return { preferences, updatePreferences, isLoaded };
}

// Hook for study statistics
export function useStudyStats() {
    const [stats, setStats] = useState<StudyStats>({
        totalCardsStudied: 0,
        totalTimeSpent: 0,
        lastStudyDate: "",
        streakDays: 0,
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setStats(getStudyStats());
        setIsLoaded(true);
    }, []);

    const refreshStats = useCallback(() => {
        setStats(getStudyStats());
    }, []);

    return { stats, refreshStats, isLoaded };
}

// Hook for last visited book
export function useLastBook() {
    const [lastBook, setLastBook] = useState<{ bookId: string; bookTitle: string } | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const book = getLastBook();
        if (book) {
            setLastBook({ bookId: book.bookId, bookTitle: book.bookTitle });
        }
        setIsLoaded(true);
    }, []);

    return { lastBook, isLoaded };
}
