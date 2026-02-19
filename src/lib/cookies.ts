// Cookie utility functions for session management

const COOKIE_PREFIX = "ucandoit_";
const DEFAULT_EXPIRY_DAYS = 30;

export interface FlashcardSession {
    bookId: string;
    bookTitle: string;
    currentIndex: number;
    totalCards: number;
    isShuffled: boolean;
    lastAccessed: string;
}

export interface UserPreferences {
    autoPlaySpeed: number; // seconds
    theme: "light" | "dark";
    soundEnabled: boolean;
}

export interface StudyStats {
    totalCardsStudied: number;
    totalTimeSpent: number; // minutes
    lastStudyDate: string;
    streakDays: number;
}

// Set a cookie with optional expiry
export function setCookie(name: string, value: string, days: number = DEFAULT_EXPIRY_DAYS): void {
    if (typeof document === "undefined") return;

    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
}

// Get a cookie value
export function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;

    const cookieName = `${COOKIE_PREFIX}${name}=`;
    const cookies = document.cookie.split(";");

    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(cookieName)) {
            return decodeURIComponent(cookie.substring(cookieName.length));
        }
    }
    return null;
}

// Delete a cookie
export function deleteCookie(name: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Set JSON data as cookie
export function setJsonCookie<T>(name: string, data: T, days?: number): void {
    setCookie(name, JSON.stringify(data), days);
}

// Get JSON data from cookie
export function getJsonCookie<T>(name: string): T | null {
    const value = getCookie(name);
    if (!value) return null;

    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

// ============================================
// Cookie Consent Check
// ============================================

const CONSENT_COOKIE_NAME = "cookie_consent";

interface CookieConsentPrefs {
    necessary: boolean;
    analytics: boolean;
    preferences: boolean;
}

// Check if preference cookies are allowed
export function isPreferencesCookiesAllowed(): boolean {
    const consent = getCookie(CONSENT_COOKIE_NAME);
    if (!consent) return false; // No consent given yet

    try {
        const prefs = JSON.parse(consent) as CookieConsentPrefs;
        return prefs.preferences === true;
    } catch {
        return false;
    }
}

// Check if analytics cookies are allowed
export function isAnalyticsCookiesAllowed(): boolean {
    const consent = getCookie(CONSENT_COOKIE_NAME);
    if (!consent) return false;

    try {
        const prefs = JSON.parse(consent) as CookieConsentPrefs;
        return prefs.analytics === true;
    } catch {
        return false;
    }
}

// ============================================
// Flashcard Session Management
// ============================================

const SESSION_KEY = "flashcard_session";
const PREFERENCES_KEY = "user_preferences";
const STATS_KEY = "study_stats";
const LAST_BOOK_KEY = "last_book";

// Save flashcard session progress (requires preference cookies consent)
export function saveFlashcardSession(session: FlashcardSession): void {
    // Only save if user consented to preference cookies
    if (!isPreferencesCookiesAllowed()) {
        console.log("Session not saved - preference cookies not allowed");
        return;
    }

    session.lastAccessed = new Date().toISOString();
    setJsonCookie(SESSION_KEY, session);
}

// Get flashcard session progress
export function getFlashcardSession(): FlashcardSession | null {
    return getJsonCookie<FlashcardSession>(SESSION_KEY);
}

// Clear flashcard session
export function clearFlashcardSession(): void {
    deleteCookie(SESSION_KEY);
}

// Check if there's an active session for a specific book
export function hasActiveSession(bookId: string): boolean {
    const session = getFlashcardSession();
    return session?.bookId === bookId && session.currentIndex > 0;
}

// ============================================
// Last Book Tracking
// ============================================

export function saveLastBook(bookId: string, bookTitle: string): void {
    // Only save if user consented to preference cookies
    if (!isPreferencesCookiesAllowed()) return;

    setJsonCookie(LAST_BOOK_KEY, { bookId, bookTitle, timestamp: new Date().toISOString() });
}

export function getLastBook(): { bookId: string; bookTitle: string; timestamp: string } | null {
    return getJsonCookie(LAST_BOOK_KEY);
}

// ============================================
// User Preferences
// ============================================

const DEFAULT_PREFERENCES: UserPreferences = {
    autoPlaySpeed: 4,
    theme: "light",
    soundEnabled: true,
};

export function saveUserPreferences(preferences: Partial<UserPreferences>): void {
    // Only save if user consented to preference cookies
    if (!isPreferencesCookiesAllowed()) return;

    const current = getUserPreferences();
    setJsonCookie(PREFERENCES_KEY, { ...current, ...preferences });
}

export function getUserPreferences(): UserPreferences {
    return getJsonCookie<UserPreferences>(PREFERENCES_KEY) || DEFAULT_PREFERENCES;
}

// ============================================
// Study Statistics
// ============================================

export function getStudyStats(): StudyStats {
    return getJsonCookie<StudyStats>(STATS_KEY) || {
        totalCardsStudied: 0,
        totalTimeSpent: 0,
        lastStudyDate: "",
        streakDays: 0,
    };
}

export function updateStudyStats(cardsStudied: number, timeSpentMinutes: number): void {
    // Only save if user consented to analytics cookies
    if (!isAnalyticsCookiesAllowed()) return;

    const stats = getStudyStats();
    const today = new Date().toISOString().split("T")[0];

    // Update streak
    if (stats.lastStudyDate) {
        const lastDate = new Date(stats.lastStudyDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            stats.streakDays += 1;
        } else if (diffDays > 1) {
            stats.streakDays = 1;
        }
        // If same day, streak stays the same
    } else {
        stats.streakDays = 1;
    }

    stats.totalCardsStudied += cardsStudied;
    stats.totalTimeSpent += timeSpentMinutes;
    stats.lastStudyDate = today;

    setJsonCookie(STATS_KEY, stats);
}

// ============================================
// Session Recovery Helper
// ============================================

export interface SessionRecoveryInfo {
    hasSession: boolean;
    session: FlashcardSession | null;
    canResume: boolean;
    message: string;
}

export function checkSessionRecovery(bookId: string): SessionRecoveryInfo {
    const session = getFlashcardSession();

    if (!session || session.bookId !== bookId) {
        return {
            hasSession: false,
            session: null,
            canResume: false,
            message: "No previous session found.",
        };
    }

    // Check if session is from today or yesterday (still relevant)
    const lastAccessed = new Date(session.lastAccessed);
    const now = new Date();
    const hoursSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60);

    if (hoursSinceAccess > 48) {
        return {
            hasSession: true,
            session,
            canResume: false,
            message: "Previous session expired.",
        };
    }

    return {
        hasSession: true,
        session,
        canResume: true,
        message: `Resume from card ${session.currentIndex + 1} of ${session.totalCards}?`,
    };
}
