import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// SM-2 Algorithm Constants
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

interface CardReviewResult {
    flashcardId: string;
    quality: number; // 0-5 (0=blackout, 5=perfect)
}

interface SchedulerResponse {
    success: boolean;
    updated: number;
    schedule: {
        cardId: string;
        nextReview: string;
        interval: number;
        easeFactor: number;
        difficulty: string;
    }[];
    sessionHealth: {
        score: number; // 0-100
        status: "excellent" | "good" | "needs_work" | "struggling";
        recommendation: string;
        cardsToReviewToday: number;
        cardsToReviewThisWeek: number;
    };
}

/**
 * Calculate next review based on SM-2 algorithm
 */
function calculateSM2Review(
    currentInterval: number,
    currentEaseFactor: number,
    consecutiveCorrect: number,
    quality: number // 0-5
): { interval: number; easeFactor: number; nextReview: Date } {
    let newInterval: number;
    let newEaseFactor = currentEaseFactor;

    // Update ease factor based on quality (SM-2 formula)
    newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

    if (quality < 3) {
        // Failed - reset to beginning
        newInterval = 1;
    } else {
        // Success - calculate new interval
        if (consecutiveCorrect === 0) {
            newInterval = 1;
        } else if (consecutiveCorrect === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(currentInterval * newEaseFactor);
        }
    }

    // Cap interval at 365 days
    newInterval = Math.min(365, newInterval);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    nextReview.setHours(0, 0, 0, 0);

    return {
        interval: newInterval,
        easeFactor: Math.round(newEaseFactor * 100) / 100,
        nextReview,
    };
}

/**
 * Determine card difficulty based on performance history
 */
function calculateDifficulty(
    totalReviews: number,
    consecutiveCorrect: number,
    easeFactor: number
): "easy" | "normal" | "hard" | "very_hard" {
    if (totalReviews < 3) return "normal";

    const correctRatio = consecutiveCorrect / Math.max(1, totalReviews);

    if (easeFactor >= 2.5 && correctRatio >= 0.8) return "easy";
    if (easeFactor >= 2.0 && correctRatio >= 0.6) return "normal";
    if (easeFactor >= 1.5 || correctRatio >= 0.4) return "hard";
    return "very_hard";
}

/**
 * Analyze session health based on recent performance
 */
function analyzeSessionHealth(
    sessions: { score_percentage: number; completed_at: string }[],
    dueCardsToday: number,
    dueCardsThisWeek: number
): SchedulerResponse["sessionHealth"] {
    if (sessions.length === 0) {
        return {
            score: 50,
            status: "needs_work",
            recommendation: "Start your first study session to build a learning routine!",
            cardsToReviewToday: dueCardsToday,
            cardsToReviewThisWeek: dueCardsThisWeek,
        };
    }

    // Calculate average score from recent sessions (last 7)
    const recentSessions = sessions.slice(0, 7);
    const avgScore = recentSessions.reduce((sum, s) => sum + s.score_percentage, 0) / recentSessions.length;

    // Calculate trend
    let trend = 0;
    if (recentSessions.length >= 2) {
        const firstHalf = recentSessions.slice(0, Math.ceil(recentSessions.length / 2));
        const secondHalf = recentSessions.slice(Math.ceil(recentSessions.length / 2));
        const firstAvg = firstHalf.reduce((sum, s) => sum + s.score_percentage, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s.score_percentage, 0) / secondHalf.length;
        trend = firstAvg - secondAvg;
    }

    // Calculate health score (0-100)
    let healthScore = avgScore;

    // Adjust based on trend
    if (trend > 5) healthScore += 10; // Improving
    else if (trend < -5) healthScore -= 10; // Declining

    // Adjust based on consistency (sessions in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sessionsThisWeek = sessions.filter(s => new Date(s.completed_at) >= weekAgo).length;
    if (sessionsThisWeek >= 5) healthScore += 5;
    else if (sessionsThisWeek <= 1) healthScore -= 10;

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Determine status and recommendation
    let status: "excellent" | "good" | "needs_work" | "struggling";
    let recommendation: string;

    if (healthScore >= 85) {
        status = "excellent";
        recommendation = trend > 0
            ? "You're on fire! Keep up this amazing momentum!"
            : "Excellent performance! Maintain your consistent study habits.";
    } else if (healthScore >= 70) {
        status = "good";
        recommendation = trend > 0
            ? "Great progress! You're improving steadily."
            : "Good performance! Try focusing on your weaker cards.";
    } else if (healthScore >= 50) {
        status = "needs_work";
        recommendation = dueCardsToday > 10
            ? `You have ${dueCardsToday} cards due today. Tackle them in smaller batches!`
            : "Practice makes perfect! Review your difficult cards more frequently.";
    } else {
        status = "struggling";
        recommendation = "Let's get back on track! Start with just 5-10 cards daily to rebuild your momentum.";
    }

    return {
        score: healthScore,
        status,
        recommendation,
        cardsToReviewToday: dueCardsToday,
        cardsToReviewThisWeek: dueCardsThisWeek,
    };
}

// POST: Update card schedules after a study session
export async function POST(request: NextRequest) {
    const supabase = createServerClient();

    try {
        const { userId, reviews } = await request.json() as {
            userId: string;
            reviews: CardReviewResult[];
        };

        if (!userId || !reviews || reviews.length === 0) {
            return NextResponse.json(
                { error: "User ID and reviews are required" },
                { status: 400 }
            );
        }

        const schedule: SchedulerResponse["schedule"] = [];

        // Process each card review
        for (const review of reviews) {
            // Get current card state
            const { data: card, error: cardError } = await supabase
                .from("flashcards")
                .select("ease_factor, interval_days, total_reviews, consecutive_correct")
                .eq("id", review.flashcardId)
                .eq("user_id", userId)
                .single();

            if (cardError || !card) continue;

            const currentEaseFactor = card.ease_factor || DEFAULT_EASE_FACTOR;
            const currentInterval = card.interval_days || 0;
            const totalReviews = (card.total_reviews || 0) + 1;
            const consecutiveCorrect = review.quality >= 3
                ? (card.consecutive_correct || 0) + 1
                : 0;

            // Calculate next review
            const { interval, easeFactor, nextReview } = calculateSM2Review(
                currentInterval,
                currentEaseFactor,
                consecutiveCorrect,
                review.quality
            );

            // Calculate difficulty
            const difficulty = calculateDifficulty(totalReviews, consecutiveCorrect, easeFactor);

            // Update card
            await supabase
                .from("flashcards")
                .update({
                    ease_factor: easeFactor,
                    interval_days: interval,
                    next_review_at: nextReview.toISOString(),
                    total_reviews: totalReviews,
                    consecutive_correct: consecutiveCorrect,
                    difficulty,
                    mastered: review.quality >= 4 ? true : review.quality < 3 ? false : null,
                    last_reviewed_at: new Date().toISOString(),
                    review_count: (card.total_reviews || 0) + 1,
                })
                .eq("id", review.flashcardId);

            schedule.push({
                cardId: review.flashcardId,
                nextReview: nextReview.toISOString(),
                interval,
                easeFactor,
                difficulty,
            });
        }

        // Get session health data
        const now = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        // Get recent sessions
        const { data: sessions } = await supabase
            .from("study_sessions")
            .select("score_percentage, completed_at")
            .eq("user_id", userId)
            .order("completed_at", { ascending: false })
            .limit(10);

        // Get due cards count
        const { count: dueToday } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("next_review_at", now.toISOString());

        const { count: dueThisWeek } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("next_review_at", weekFromNow.toISOString());

        const sessionHealth = analyzeSessionHealth(
            sessions || [],
            dueToday || 0,
            dueThisWeek || 0
        );

        return NextResponse.json({
            success: true,
            updated: schedule.length,
            schedule,
            sessionHealth,
        } as SchedulerResponse);

    } catch (error) {
        console.error("Error updating card schedules:", error);
        return NextResponse.json(
            { error: "Failed to update schedules" },
            { status: 500 }
        );
    }
}

// GET: Get study schedule and session health
export async function GET(request: NextRequest) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const bookId = searchParams.get("bookId");

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        );
    }

    try {
        const now = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        // Build query for due cards
        let query = supabase
            .from("flashcards")
            .select("id, question, topic, difficulty, next_review_at, ease_factor, interval_days, consecutive_correct, book_id")
            .eq("user_id", userId)
            .or(`next_review_at.is.null,next_review_at.lte.${now.toISOString()}`);

        if (bookId) {
            query = query.eq("book_id", bookId);
        }

        const { data: dueCards, error: dueError } = await query
            .order("next_review_at", { ascending: true, nullsFirst: true })
            .limit(50);

        if (dueError) throw dueError;

        // Get upcoming cards (next 7 days)
        let upcomingQuery = supabase
            .from("flashcards")
            .select("id, question, topic, difficulty, next_review_at, book_id")
            .eq("user_id", userId)
            .gt("next_review_at", now.toISOString())
            .lte("next_review_at", weekFromNow.toISOString());

        if (bookId) {
            upcomingQuery = upcomingQuery.eq("book_id", bookId);
        }

        const { data: upcomingCards } = await upcomingQuery
            .order("next_review_at", { ascending: true })
            .limit(50);

        // Get sessions for health analysis
        const { data: sessions } = await supabase
            .from("study_sessions")
            .select("score_percentage, completed_at")
            .eq("user_id", userId)
            .order("completed_at", { ascending: false })
            .limit(10);

        // Count cards by difficulty
        const { data: difficultyStats } = await supabase
            .from("flashcards")
            .select("difficulty")
            .eq("user_id", userId);

        const difficultyCounts = {
            easy: 0,
            normal: 0,
            hard: 0,
            very_hard: 0,
        };

        difficultyStats?.forEach(card => {
            const d = card.difficulty as keyof typeof difficultyCounts;
            if (d && difficultyCounts[d] !== undefined) {
                difficultyCounts[d]++;
            }
        });

        const sessionHealth = analyzeSessionHealth(
            sessions || [],
            dueCards?.length || 0,
            (dueCards?.length || 0) + (upcomingCards?.length || 0)
        );

        // Group due cards by priority
        const prioritizedCards = {
            overdue: dueCards?.filter(c => c.next_review_at && new Date(c.next_review_at) < now) || [],
            dueToday: dueCards?.filter(c => !c.next_review_at ||
                (new Date(c.next_review_at).toDateString() === now.toDateString())) || [],
            newCards: dueCards?.filter(c => !c.next_review_at) || [],
        };

        return NextResponse.json({
            success: true,
            dueCards: dueCards || [],
            upcomingCards: upcomingCards || [],
            prioritizedCards,
            difficultyCounts,
            sessionHealth,
            studyRecommendation: generateStudyRecommendation(
                prioritizedCards,
                difficultyCounts,
                sessionHealth
            ),
        });

    } catch (error) {
        console.error("Error fetching schedule:", error);
        return NextResponse.json(
            { error: "Failed to fetch schedule" },
            { status: 500 }
        );
    }
}

function generateStudyRecommendation(
    prioritizedCards: { overdue: unknown[]; dueToday: unknown[]; newCards: unknown[] },
    difficultyCounts: { easy: number; normal: number; hard: number; very_hard: number },
    sessionHealth: SchedulerResponse["sessionHealth"]
): string {
    const overdueCount = prioritizedCards.overdue.length;
    const dueTodayCount = prioritizedCards.dueToday.length;
    const hardCount = difficultyCounts.hard + difficultyCounts.very_hard;

    if (sessionHealth.status === "struggling") {
        return "Start small! Review just 5-10 cards to get back into the groove.";
    }

    if (overdueCount > 10) {
        return `You have ${overdueCount} overdue cards. Tackle them first to stay on track!`;
    }

    if (hardCount > 20) {
        return `You have ${hardCount} difficult cards. Focus on mastering these with shorter intervals.`;
    }

    if (dueTodayCount > 0) {
        return `${dueTodayCount} cards are ready for review. Complete them to maintain your streak!`;
    }

    if (prioritizedCards.newCards.length > 0) {
        return `Great progress! You have ${prioritizedCards.newCards.length} new cards to explore.`;
    }

    return "All caught up! Check back later for more reviews.";
}
