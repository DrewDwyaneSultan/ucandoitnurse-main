"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Inbox,
    Eye,
    Trash2,
    Loader2,
    MessageSquare,
    Clock,
    Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Flashcard, UserProfile } from "@/types/database.types";

interface SharedFlashcard {
    id: string;
    flashcard_id: string;
    sender_id: string;
    recipient_id: string;
    message: string | null;
    is_read: boolean;
    created_at: string;
    flashcard: Flashcard;
    sender: UserProfile;
}

interface SharedCardsListProps {
    sharedCards: SharedFlashcard[];
    userId: string;
    onRefresh: () => void;
    onViewCard: (flashcard: Flashcard) => void;
}

export function SharedCardsList({
    sharedCards,
    userId,
    onRefresh,
    onViewCard,
}: SharedCardsListProps) {
    const [processing, setProcessing] = useState<string | null>(null);

    const markAsRead = async (sharedId: string) => {
        try {
            await fetch("/api/share", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sharedId, userId }),
            });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const handleView = async (shared: SharedFlashcard) => {
        if (!shared.is_read) {
            await markAsRead(shared.id);
            onRefresh();
        }
        onViewCard(shared.flashcard);
    };

    const handleDelete = async (sharedId: string) => {
        setProcessing(sharedId);
        try {
            const res = await fetch(
                `/api/share?sharedId=${sharedId}&userId=${userId}`,
                { method: "DELETE" }
            );

            if (!res.ok) {
                throw new Error("Failed to delete");
            }

            toast.success("Card cleared from your inbox - fresh start!");
            onRefresh();
        } catch {
            toast.error("Hmm, that card is being stubborn. Try again!");
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (sharedCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Inbox className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No shared cards yet</p>
                <p className="text-sm text-gray-400 mt-1">
                    Cards shared by friends will appear here
                </p>
            </div>
        );
    }

    const unreadCount = sharedCards.filter((s) => !s.is_read).length;

    return (
        <div className="space-y-4">
            {unreadCount > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <Star className="w-4 h-4 fill-blue-600" />
                    {unreadCount} new card{unreadCount > 1 ? "s" : ""}
                </div>
            )}

            <AnimatePresence mode="popLayout">
                {sharedCards.map((shared, index) => (
                    <motion.div
                        key={shared.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative p-4 rounded-2xl border transition-all ${shared.is_read
                            ? "bg-white border-gray-100"
                            : "bg-blue-50/50 border-blue-200 shadow-sm"
                            }`}
                    >
                        {/* Unread indicator */}
                        {!shared.is_read && (
                            <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                        )}

                        {/* Sender info */}
                        <div className="flex items-center gap-3 mb-3">
                            <UserAvatar
                                avatarUrl={shared.sender?.avatar_url}
                                displayName={shared.sender?.display_name}
                                clickable={false}
                                size="md"
                            />
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                    {shared.sender?.display_name}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(shared.created_at)}
                                </div>
                            </div>
                        </div>

                        {/* Message if present */}
                        {shared.message && (
                            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-gray-50">
                                <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600 italic">
                                    &quot;{shared.message}&quot;
                                </p>
                            </div>
                        )}

                        {/* Card preview */}
                        <div className="p-3 rounded-xl bg-gray-100 mb-3">
                            <p className="text-sm text-gray-500 mb-1">Question:</p>
                            <p className="font-medium text-gray-900 line-clamp-2">
                                {shared.flashcard?.question}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => handleView(shared)}
                                className="flex-1 rounded-xl h-10"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Card
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(shared.id)}
                                disabled={processing === shared.id}
                                className="rounded-xl h-10 border-red-200 text-red-500 hover:bg-red-50"
                            >
                                {processing === shared.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
