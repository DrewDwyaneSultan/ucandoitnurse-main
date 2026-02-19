"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProfilePreviewModal } from "./profile-preview-modal";
import Image from "next/image";

interface UserAvatarProps {
    avatarUrl?: string | null;
    displayName?: string | null;
    email?: string | null;
    userId?: string; // If provided, makes avatar clickable to show profile
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    clickable?: boolean; // Explicitly enable/disable clicking
}

const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl",
};

export function UserAvatar({
    avatarUrl,
    displayName,
    email,
    userId,
    size = "md",
    className,
    clickable = true,
}: UserAvatarProps) {
    const [showProfile, setShowProfile] = useState(false);
    const initial = displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "?";
    const isClickable = clickable && userId;

    const handleClick = (e: React.MouseEvent) => {
        if (isClickable) {
            e.stopPropagation();
            setShowProfile(true);
        }
    };

    return (
        <>
            <div
                onClick={handleClick}
                className={cn(
                    "rounded-full flex-shrink-0 overflow-hidden",
                    sizeClasses[size],
                    isClickable && "cursor-pointer hover:ring-2 hover:ring-gray-200 hover:ring-offset-1 transition-all",
                    className
                )}
            >
                {avatarUrl ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={avatarUrl}
                            alt={displayName || "User avatar"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full bg-[#5B79A6] flex items-center justify-center text-white font-caladea">
                        {initial}
                    </div>
                )}
            </div>

            {isClickable && (
                <ProfilePreviewModal
                    isOpen={showProfile}
                    onClose={() => setShowProfile(false)}
                    userId={userId}
                />
            )}
        </>
    );
}

