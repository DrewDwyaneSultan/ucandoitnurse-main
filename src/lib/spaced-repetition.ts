/**
 * Simplified Spaced Repetition Algorithm (SM-2 inspired)
 * 
 * Quality ratings:
 * 0 - Complete blackout, wrong answer
 * 1 - Incorrect, but upon seeing correct answer, remembered
 * 2 - Incorrect, but correct answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct after hesitation
 * 5 - Perfect response
 * 
 * For our simplified version:
 * - "Wrong" (mastered = false) → quality 1
 * - "Neutral" (mastered = null) → not reviewed yet
 * - "Mastered" (mastered = true) → quality 4
 */

import type { Flashcard } from "@/types/database.types";

export interface ReviewSchedule {
    nextReviewDate: Date;
    interval: number; // days
    easeFactor: number;
}

// Default ease factor for new cards
const _DEFAULT_EASE_FACTOR = 2.5; // eslint-disable-line @typescript-eslint/no-unused-vars
const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate the next review schedule based on current performance
 */
export function calculateNextReview(
    currentInterval: number,
    currentEaseFactor: number,
    quality: number // 0-5
): ReviewSchedule {
    let newInterval: number;
    let newEaseFactor = currentEaseFactor;

    if (quality < 3) {
        // Failed - reset to beginning
        newInterval = 1;
    } else {
        // Success - increase interval
        if (currentInterval === 0) {
            newInterval = 1;
        } else if (currentInterval === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(currentInterval * currentEaseFactor);
        }
    }

    // Update ease factor based on quality
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        nextReviewDate,
        interval: newInterval,
        easeFactor: newEaseFactor,
    };
}

/**
 * Convert mastered status to quality rating
 */
export function masteredToQuality(mastered: boolean | null): number {
    if (mastered === null) return 0; // Never reviewed
    if (mastered === false) return 1; // Marked for review (wrong)
    return 4; // Mastered (correct)
}

/**
 * Calculate when a card is due for review based on last_reviewed_at and mastered status
 * Cards marked for review are always due
 * Cards mastered have intervals based on review count
 * Cards never reviewed are also due
 */
export function isCardDueForReview(flashcard: Flashcard): boolean {
    // Cards marked for review (mastered = false) are always due
    if (flashcard.mastered === false) {
        return true;
    }

    // Cards never reviewed are due
    if (!flashcard.last_reviewed_at) {
        return true;
    }

    // Cards that are mastered - check if enough time has passed
    if (flashcard.mastered === true) {
        const lastReview = new Date(flashcard.last_reviewed_at);
        const now = new Date();
        const daysSinceReview = Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate interval based on review count (simplified SM-2)
        // More reviews = longer intervals
        let interval: number;
        if (flashcard.review_count <= 1) {
            interval = 1; // 1 day
        } else if (flashcard.review_count === 2) {
            interval = 3; // 3 days
        } else if (flashcard.review_count === 3) {
            interval = 7; // 1 week
        } else if (flashcard.review_count === 4) {
            interval = 14; // 2 weeks
        } else if (flashcard.review_count === 5) {
            interval = 30; // 1 month
        } else {
            interval = 60; // 2 months max
        }

        return daysSinceReview >= interval;
    }

    // Neutral cards (never marked) are due if never reviewed or older than 1 day
    if (flashcard.mastered === null) {
        if (!flashcard.last_reviewed_at) return true;
        const lastReview = new Date(flashcard.last_reviewed_at);
        const daysSinceReview = Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceReview >= 1;
    }

    return false;
}

/**
 * Get the priority score for a card (higher = should study first)
 * Cards marked for review get highest priority
 * Overdue mastered cards get medium priority
 * New/neutral cards get lower priority
 */
export function getCardPriority(flashcard: Flashcard): number {
    // Marked for review - highest priority
    if (flashcard.mastered === false) {
        return 100;
    }

    // Never reviewed - high priority
    if (!flashcard.last_reviewed_at) {
        return 80;
    }

    const lastReview = new Date(flashcard.last_reviewed_at);
    const daysSinceReview = Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24));

    // Mastered but overdue
    if (flashcard.mastered === true) {
        // More overdue = higher priority
        return Math.min(70, 30 + daysSinceReview * 5);
    }

    // Neutral/other
    return Math.min(50, 20 + daysSinceReview * 3);
}

/**
 * Sort cards by priority for optimal studying
 */
export function sortCardsByPriority(cards: Flashcard[]): Flashcard[] {
    return [...cards].sort((a, b) => getCardPriority(b) - getCardPriority(a));
}

/**
 * Get cards due for review, sorted by priority
 */
export function getDueCards(cards: Flashcard[]): Flashcard[] {
    const dueCards = cards.filter(isCardDueForReview);
    return sortCardsByPriority(dueCards);
}

/**
 * Get study recommendation based on card status
 */
export function getStudyRecommendation(cards: Flashcard[]): {
    dueCount: number;
    reviewCount: number;  // Cards marked for review
    newCount: number;     // Never reviewed
    overdueCount: number; // Mastered but overdue
    suggestion: string;
} {
    const dueCards = getDueCards(cards);
    const reviewCount = cards.filter(c => c.mastered === false).length;
    const newCount = cards.filter(c => !c.last_reviewed_at).length;
    const overdueCount = dueCards.filter(c => c.mastered === true).length;

    let suggestion: string;
    if (reviewCount > 0) {
        suggestion = `Focus on ${reviewCount} card${reviewCount > 1 ? 's' : ''} you marked for review`;
    } else if (overdueCount > 0) {
        suggestion = `Review ${overdueCount} mastered card${overdueCount > 1 ? 's' : ''} to keep them fresh`;
    } else if (newCount > 0) {
        suggestion = `Start with ${newCount} new card${newCount > 1 ? 's' : ''} you haven't studied yet`;
    } else {
        suggestion = "Great job! All caught up for today";
    }

    return {
        dueCount: dueCards.length,
        reviewCount,
        newCount,
        overdueCount,
        suggestion,
    };
}

// ===== AI-POWERED SPACED REPETITION =====

export interface StudySession {
    id: string;
    user_id: string;
    book_id: string;
    mode: string;
    total_cards: number;
    correct_count: number;
    incorrect_count: number;
    skipped_count: number;
    score_percentage: number;
    time_spent_seconds: number;
    completed_at: string;
}

export interface BookPerformance {
    bookId: string;
    bookTitle: string;
    averageScore: number;
    lastScore: number;
    totalSessions: number;
    lastStudied: Date | null;
    performanceTrend: "improving" | "declining" | "stable" | "new";
    urgencyScore: number; // 0-100, higher = more urgent
    recommendedInterval: number; // days until next review
    recommendedDate: Date;
    // New prediction metrics
    actualImprovementRate: number; // Average % improvement per session
    predictedNextScore: number; // Predicted score if studied today
    confidenceLevel: "high" | "medium" | "low"; // Based on data quantity
    scoreHistory: number[]; // Last 5 scores for trend visualization
}

export interface AITaskRecommendation {
    bookId: string;
    bookTitle: string;
    date: Date;
    priority: "high" | "medium" | "low";
    reason: string;
    expectedImprovement: number; // percentage - now based on actual data
    predictedScore: number; // What we predict user will score
    confidenceLevel: "high" | "medium" | "low";
}

/**
 * Calculate performance metrics for a book based on study sessions
 */
export function calculateBookPerformance(
    bookId: string,
    bookTitle: string,
    sessions: StudySession[],
    _flashcardCount: number // eslint-disable-line @typescript-eslint/no-unused-vars
): BookPerformance {
    const bookSessions = sessions
        .filter(s => s.book_id === bookId && s.mode === "scored")
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    const now = new Date();

    if (bookSessions.length === 0) {
        return {
            bookId,
            bookTitle,
            averageScore: 0,
            lastScore: 0,
            totalSessions: 0,
            lastStudied: null,
            performanceTrend: "new",
            urgencyScore: 50, // Medium urgency for new books
            recommendedInterval: 1,
            recommendedDate: now,
            // New prediction metrics for new books
            actualImprovementRate: 0,
            predictedNextScore: 50, // Assume 50% for first attempt
            confidenceLevel: "low",
            scoreHistory: [],
        };
    }

    // Calculate statistics
    const totalSessions = bookSessions.length;
    const averageScore = bookSessions.reduce((sum, s) => sum + s.score_percentage, 0) / totalSessions;
    const lastScore = bookSessions[0].score_percentage;
    const lastStudied = new Date(bookSessions[0].completed_at);

    // Get score history (last 5 sessions, oldest first for visualization)
    const scoreHistory = bookSessions
        .slice(0, 5)
        .map(s => s.score_percentage)
        .reverse();

    // Calculate ACTUAL improvement rate based on real session data
    let actualImprovementRate = 0;
    if (totalSessions >= 2) {
        // Calculate improvement between consecutive sessions
        let totalImprovement = 0;
        let improvements = 0;
        for (let i = 0; i < bookSessions.length - 1; i++) {
            const currentScore = bookSessions[i].score_percentage;
            const previousScore = bookSessions[i + 1].score_percentage;
            totalImprovement += currentScore - previousScore;
            improvements++;
        }
        actualImprovementRate = improvements > 0 ? totalImprovement / improvements : 0;
    }

    // Calculate performance trend
    let performanceTrend: "improving" | "declining" | "stable" | "new";
    if (totalSessions < 2) {
        performanceTrend = "new";
    } else {
        const recentAvg = bookSessions.slice(0, Math.min(3, totalSessions))
            .reduce((sum, s) => sum + s.score_percentage, 0) / Math.min(3, totalSessions);
        const olderAvg = bookSessions.slice(Math.min(3, totalSessions))
            .reduce((sum, s) => sum + s.score_percentage, 0) / Math.max(1, totalSessions - Math.min(3, totalSessions));

        const diff = recentAvg - olderAvg;
        if (diff > 5) performanceTrend = "improving";
        else if (diff < -5) performanceTrend = "declining";
        else performanceTrend = "stable";
    }

    // Calculate urgency score (0-100)
    // Factors: low scores, declining trend, time since last study
    const daysSinceStudy = Math.floor((now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyScore = 0;

    // Score-based urgency (lower score = higher urgency)
    urgencyScore += Math.max(0, (100 - lastScore) * 0.4);

    // Time-based urgency (longer time = higher urgency)
    urgencyScore += Math.min(30, daysSinceStudy * 3);

    // Trend-based urgency
    if (performanceTrend === "declining") urgencyScore += 20;
    else if (performanceTrend === "stable") urgencyScore += 5;
    else if (performanceTrend === "improving") urgencyScore -= 10;

    urgencyScore = Math.max(0, Math.min(100, Math.round(urgencyScore)));

    // Calculate recommended interval based on performance
    // Better scores = longer intervals (SM-2 inspired)
    let recommendedInterval: number;
    if (lastScore >= 90) {
        recommendedInterval = Math.min(14, 3 + Math.floor(totalSessions * 1.5)); // 3-14 days
    } else if (lastScore >= 70) {
        recommendedInterval = Math.min(7, 2 + Math.floor(totalSessions)); // 2-7 days
    } else if (lastScore >= 50) {
        recommendedInterval = Math.min(3, 1 + Math.floor(totalSessions * 0.5)); // 1-3 days
    } else {
        recommendedInterval = 1; // Daily review needed
    }

    // Adjust for declining performance
    if (performanceTrend === "declining") {
        recommendedInterval = Math.max(1, Math.floor(recommendedInterval * 0.5));
    }

    const recommendedDate = new Date(lastStudied);
    recommendedDate.setDate(recommendedDate.getDate() + recommendedInterval);

    // If recommended date is in the past, set to today
    if (recommendedDate < now) {
        recommendedDate.setTime(now.getTime());
    }

    // === SOPHISTICATED PREDICTION ALGORITHM ===

    // 1. Calculate predicted next score with time decay
    // Memory decay model: retention decreases over time without review
    const retentionDecayRate = 0.02; // 2% decay per day
    const timeDecay = Math.min(30, daysSinceStudy) * retentionDecayRate;

    // Base prediction on last score with time decay
    let predictedNextScore = lastScore - (timeDecay * lastScore / 100 * 10);

    // Adjust based on trend
    if (performanceTrend === "improving" && actualImprovementRate > 0) {
        // Expect continued improvement (but diminishing returns near 100%)
        const improvementPotential = (100 - lastScore) / 100;
        predictedNextScore += actualImprovementRate * improvementPotential * 0.7;
    } else if (performanceTrend === "declining") {
        // Expect continued decline (but studying helps reverse it)
        predictedNextScore -= Math.abs(actualImprovementRate) * 0.3;
    }

    // Studying today helps - add learning boost
    const studyBoost = Math.min(10, (100 - lastScore) * 0.15);
    predictedNextScore += studyBoost;

    // Clamp to valid range
    predictedNextScore = Math.max(0, Math.min(100, Math.round(predictedNextScore * 10) / 10));

    // 2. Calculate confidence level based on data quantity
    let confidenceLevel: "high" | "medium" | "low";
    if (totalSessions >= 5) {
        confidenceLevel = "high";
    } else if (totalSessions >= 2) {
        confidenceLevel = "medium";
    } else {
        confidenceLevel = "low";
    }

    return {
        bookId,
        bookTitle,
        averageScore,
        lastScore,
        totalSessions,
        lastStudied,
        performanceTrend,
        urgencyScore,
        recommendedInterval,
        recommendedDate,
        actualImprovementRate: Math.round(actualImprovementRate * 10) / 10,
        predictedNextScore,
        confidenceLevel,
        scoreHistory,
    };
}

/**
 * Generate AI task recommendations for a specific date
 */
export function generateAITasksForDate(
    targetDate: Date,
    performances: BookPerformance[]
): AITaskRecommendation[] {
    const targetDateStr = formatDateForComparison(targetDate);
    const recommendations: AITaskRecommendation[] = [];

    for (const perf of performances) {
        const recommendedDateStr = formatDateForComparison(perf.recommendedDate);

        // Check if this book should be studied on the target date
        if (recommendedDateStr === targetDateStr || perf.recommendedDate <= targetDate) {
            let priority: "high" | "medium" | "low";
            let reason: string;
            let expectedImprovement: number;

            // Calculate expected improvement based ONLY on ACTUAL data from database
            // NO hardcoded estimates - if there's no data, show 0
            if (perf.totalSessions >= 2 && perf.actualImprovementRate !== 0) {
                // Use actual improvement rate from history
                if (perf.actualImprovementRate > 0) {
                    // Diminishing returns as score approaches 100%
                    const roomToGrow = 100 - perf.lastScore;
                    expectedImprovement = Math.min(
                        roomToGrow * 0.3, // Max 30% of remaining room
                        Math.abs(perf.actualImprovementRate) * 1.2 // 120% of historical rate
                    );
                } else {
                    // Declining trend - studying can reverse it
                    expectedImprovement = Math.min(10, Math.abs(perf.actualImprovementRate) * 0.5);
                }
            } else {
                // Not enough data to calculate improvement - don't show estimate
                expectedImprovement = 0;
            }

            // Round to 1 decimal place
            expectedImprovement = Math.round(expectedImprovement * 10) / 10;

            if (perf.urgencyScore >= 70) {
                priority = "high";
                if (perf.performanceTrend === "declining" && expectedImprovement > 0) {
                    reason = `Score declining. Review can help recover +${expectedImprovement.toFixed(1)}%.`;
                } else if (perf.lastScore < 50 && perf.totalSessions > 0) {
                    reason = `Low score (${perf.lastScore.toFixed(0)}%). Intensive review recommended.`;
                } else if (perf.lastStudied) {
                    reason = `Overdue for review. Last studied ${getDaysAgo(perf.lastStudied)}.`;
                } else {
                    reason = "Start studying this book!";
                }
            } else if (perf.urgencyScore >= 40) {
                priority = "medium";
                if (perf.totalSessions === 0) {
                    reason = "New book - start your learning journey!";
                } else if (expectedImprovement > 0) {
                    reason = `Scheduled review. Predicted: ${perf.predictedNextScore.toFixed(0)}% → ${Math.min(100, perf.predictedNextScore + expectedImprovement).toFixed(0)}%`;
                } else {
                    reason = `Scheduled review. Current score: ${perf.lastScore.toFixed(0)}%`;
                }
            } else {
                priority = "low";
                if (perf.totalSessions > 0) {
                    reason = `Maintenance review. Last score: ${perf.lastScore.toFixed(0)}%`;
                } else {
                    reason = "Optional review available.";
                }
            }

            recommendations.push({
                bookId: perf.bookId,
                bookTitle: perf.bookTitle,
                date: targetDate,
                priority,
                reason,
                expectedImprovement,
                predictedScore: perf.predictedNextScore,
                confidenceLevel: perf.confidenceLevel,
            });
        }
    }

    // Sort by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
}

/**
 * Get all AI-recommended tasks for the calendar view (next 30 days)
 */
export function generateCalendarRecommendations(
    performances: BookPerformance[],
    daysAhead: number = 30
): Map<string, AITaskRecommendation[]> {
    const calendar = new Map<string, AITaskRecommendation[]>();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < daysAhead; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        const dateStr = formatDateForComparison(date);

        const tasks = generateAITasksForDate(date, performances);
        if (tasks.length > 0) {
            calendar.set(dateStr, tasks);
        }
    }

    return calendar;
}

/**
 * Generate a study plan message based on performance analysis
 */
export function generateStudyPlanSuggestion(performances: BookPerformance[]): string {
    if (performances.length === 0) {
        return "Upload some books to get personalized study recommendations!";
    }

    const highUrgency = performances.filter(p => p.urgencyScore >= 70);
    const declining = performances.filter(p => p.performanceTrend === "declining");
    const newBooks = performances.filter(p => p.totalSessions === 0);

    if (highUrgency.length > 0) {
        const book = highUrgency[0];
        return `Focus on "${book.bookTitle}" today. ${book.performanceTrend === "declining"
            ? "Your scores are declining - let's turn that around!"
            : "A focused review session can boost your score significantly."}`;
    }

    if (declining.length > 0) {
        return `"${declining[0].bookTitle}" needs attention. Your scores have been dropping - a review session today can help!`;
    }

    if (newBooks.length > 0) {
        return `Start studying "${newBooks[0].bookTitle}" to build your knowledge foundation!`;
    }

    const avgScore = performances.reduce((sum, p) => sum + p.averageScore, 0) / performances.length;
    if (avgScore >= 80) {
        return "Great progress! Keep up the consistent studying to maintain your high scores.";
    }

    return "Stay consistent with your daily reviews to improve your scores over time.";
}

// Helper functions
function formatDateForComparison(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDaysAgo(date: Date | null): string {
    if (!date) return "never";
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
}
