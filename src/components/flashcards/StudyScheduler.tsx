"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronRight, RotateCw } from "lucide-react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

interface StudySession {
    score_percentage: number;
    completed_at: string;
}

interface DataPoint {
    label: string;
    yourScore: number | null;
    expected: number;
}

const chartConfig = {
    yourScore: {
        label: "Your Score",
        color: "#111",
    },
    expected: {
        label: "Expected",
        color: "#5B79A6",
    },
} satisfies ChartConfig;

function buildChartData(sessions: StudySession[]): DataPoint[] {
    const now = new Date();
    const intervals = [0, 1, 3, 7, 14];
    const labels = ["Today", "1 day", "3 days", "1 week", "2 weeks"];

    // Calculate memory strength from your scores
    const avgScore = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.score_percentage, 0) / sessions.length
        : 70;
    const strength = Math.max(2, (avgScore / 100) * 15);

    const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    const data: DataPoint[] = [];

    for (let i = 0; i < intervals.length; i++) {
        const days = intervals[i];

        // Expected score (memory naturally decreases over time)
        const expected = Math.round(100 * Math.pow(1 + days / (9 * strength), -1));

        // Your actual score
        let yourScore: number | null = null;

        const matching = sortedSessions.filter(s => {
            const daysSince = Math.floor(
                (now.getTime() - new Date(s.completed_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return Math.abs(daysSince - days) <= 1;
        });

        if (matching.length > 0) {
            yourScore = Math.round(matching.reduce((sum, s) => sum + s.score_percentage, 0) / matching.length);
        } else if (days === 0 && sortedSessions.length > 0) {
            yourScore = sortedSessions[0].score_percentage;
        }

        data.push({ label: labels[i], yourScore, expected });
    }

    return data;
}

export function StudyScheduler() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [dueCount, setDueCount] = useState(0);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [sessionsRes, scheduleRes] = await Promise.all([
                fetch(`/api/study-sessions?userId=${user.id}&limit=30`),
                fetch(`/api/scheduler?userId=${user.id}`)
            ]);

            if (sessionsRes.ok) {
                const data = await sessionsRes.json();
                setSessions(data.sessions || []);
            }
            if (scheduleRes.ok) {
                const data = await scheduleRes.json();
                setDueCount(data.sessionHealth?.cardsToReviewToday || 0);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const chartData = useMemo(() => buildChartData(sessions), [sessions]);
    const currentScore = chartData[0]?.yourScore;

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-24 bg-gray-50 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                <h3 className="text-base font-caladea text-gray-900">How You&apos;re Doing</h3>
                <button
                    onClick={fetchData}
                    className="p-2 rounded-full hover:bg-gray-50 text-gray-400"
                >
                    <RotateCw className="w-4 h-4" />
                </button>
            </div>

            {/* Legend */}
            <div className="px-5 pb-2 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-gray-900 rounded-full" />
                    <span className="text-xs text-gray-700 font-poppins font-semibold">Your Score</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-[#5B79A6] rounded-full" />
                    <span className="text-xs text-gray-500 font-poppins font-medium">Expected</span>
                </div>
            </div>

            {/* Chart */}
            <div className="px-2 h-32">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                    >
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#374151", fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
                            tickMargin={8}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#374151", fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
                            domain={[0, 100]}
                            ticks={[0, 50, 100]}
                            tickFormatter={(v) => `${v}%`}
                            tickMargin={4}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) => [
                                        value !== null ? `${value}%` : "No data",
                                        name === "yourScore" ? "Your Score" : "Expected"
                                    ]}
                                />
                            }
                        />
                        {/* Expected line (blue) */}
                        <Line
                            type="monotone"
                            dataKey="expected"
                            stroke="#5B79A6"
                            strokeWidth={2}
                            dot={{ fill: "#5B79A6", r: 3 }}
                        />
                        {/* Your score line (dark) */}
                        <Line
                            type="monotone"
                            dataKey="yourScore"
                            stroke="#111"
                            strokeWidth={2.5}
                            dot={{ fill: "#111", stroke: "#fff", strokeWidth: 2, r: 4 }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ChartContainer>
            </div>

            {/* Simple Stats */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                    <span className="text-2xl font-light text-gray-900 font-caladea">
                        {currentScore !== null ? `${currentScore}%` : "—"}
                    </span>
                    <p className="text-xs text-gray-400 font-poppins">Your score</p>
                </div>
                <div className="text-right">
                    <span className={`text-2xl font-light font-caladea ${dueCount > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {dueCount}
                    </span>
                    <p className="text-xs text-gray-400 font-poppins">Cards to review</p>
                </div>
            </div>

            {/* Button */}
            <div className="p-4 pt-0">
                <Button
                    onClick={() => router.push("/tasks")}
                    className="w-full h-11 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins text-sm"
                >
                    {dueCount > 0 ? "Review Now" : "View All"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
