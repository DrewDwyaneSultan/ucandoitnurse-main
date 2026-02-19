"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
    current: number;
    total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
    const progressPercent = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="w-full">
            <Progress value={progressPercent} className="h-1.5 bg-gray-100" indicatorClassName="bg-gray-900 transition-all duration-500 ease-out" />
        </div>
    );
}
