"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Send, Loader2, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Flashcard, UserProfile } from "@/types/database.types";

interface Friend {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    friend_profile: UserProfile;
}

interface ShareCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    flashcard: Flashcard | null;
    userId: string;
    friends: Friend[];
}

export function ShareCardModal({
    isOpen,
    onClose,
    flashcard,
    userId,
    friends,
}: ShareCardModalProps) {
    const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleShare = async () => {
        if (!flashcard || !selectedFriend) return;

        setIsSending(true);
        try {
            const res = await fetch("/api/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flashcardId: flashcard.id,
                    senderId: userId,
                    recipientId: selectedFriend,
                    message: message.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to share card");
            }

            toast.success("Card sent - sharing is caring!");
            onClose();
            setSelectedFriend(null);
            setMessage("");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Whoops, card got shy. Give it another try!"
            );
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen || !flashcard) return null;

    const acceptedFriends = friends.filter((f) => f.status === "accepted");

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Share2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Share Card
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Card Preview */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                        <p className="text-sm text-gray-500 mb-1">Question:</p>
                        <p className="font-medium text-gray-900 line-clamp-2">
                            {flashcard.question}
                        </p>
                    </div>

                    {/* Friend Selection */}
                    {acceptedFriends.length > 0 ? (
                        <>
                            <p className="text-sm font-medium text-gray-700 mb-3">
                                Share with:
                            </p>
                            <div className="space-y-2 max-h-[180px] overflow-y-auto mb-4">
                                {acceptedFriends.map((friend) => {
                                    const friendId =
                                        friend.requester_id === userId
                                            ? friend.addressee_id
                                            : friend.requester_id;

                                    return (
                                        <motion.button
                                            key={friend.id}
                                            onClick={() => setSelectedFriend(friendId)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedFriend === friendId
                                                ? "bg-blue-50 border-2 border-blue-500"
                                                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                                                }`}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <UserAvatar
                                                avatarUrl={friend.friend_profile?.avatar_url}
                                                displayName={friend.friend_profile?.display_name}
                                                clickable={false}
                                                size="md"
                                            />
                                            <span className="font-medium text-gray-900">
                                                {friend.friend_profile?.display_name}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Message */}
                            <div className="relative mb-4">
                                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Add a message (optional)"
                                    className="pl-10 min-h-[80px] rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-blue-200 resize-none"
                                />
                            </div>

                            <Button
                                onClick={handleShare}
                                disabled={!selectedFriend || isSending}
                                className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600"
                            >
                                {isSending ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Send className="w-5 h-5 mr-2" />
                                )}
                                Share Card
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <Users className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-center">
                                Add friends first to share cards with them!
                            </p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
