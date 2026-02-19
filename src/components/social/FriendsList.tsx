"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, MessageCircle, MoreHorizontal, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserProfile } from "@/types/database.types";

interface Friend {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    friend_profile: UserProfile;
    created_at: string;
}

interface FriendsListProps {
    friends: Friend[];
    userId: string;
    onRefresh: () => void;
    onShareCard: (friendId: string) => void;
}

export function FriendsList({
    friends,
    userId,
    onRefresh,
}: FriendsListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);

    const acceptedFriends = friends.filter((f) => f.status === "accepted");

    const removeFriend = async (friendshipId: string) => {
        setRemoving(friendshipId);
        try {
            const res = await fetch(
                `/api/friends?friendshipId=${friendshipId}&userId=${userId}`,
                { method: "DELETE" }
            );

            if (!res.ok) {
                throw new Error("Failed to remove friend");
            }

            toast.success("Friend removed - you've got this solo!");
            onRefresh();
        } catch {
            toast.error("Oops, couldn't remove friend. Give it another shot!");
        } finally {
            setRemoving(null);
            setExpandedId(null);
        }
    };

    if (acceptedFriends.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No friends yet</p>
                <p className="text-sm text-gray-400 mt-1">
                    Add friends to share and study together!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-500">
                {acceptedFriends.length} friend{acceptedFriends.length !== 1 ? "s" : ""}
            </p>

            <AnimatePresence mode="popLayout">
                {acceptedFriends.map((friend, index) => (
                    <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
                    >
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <UserAvatar
                                    avatarUrl={friend.friend_profile?.avatar_url}
                                    displayName={friend.friend_profile?.display_name}
                                    userId={friend.friend_profile?.id}
                                    size="lg"
                                />
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {friend.friend_profile?.display_name}
                                    </p>
                                    {friend.friend_profile?.bio && (
                                        <p className="text-sm text-gray-500 line-clamp-1">
                                            {friend.friend_profile.bio}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    setExpandedId(expandedId === friend.id ? null : friend.id)
                                }
                                className="rounded-full w-10 h-10 p-0"
                            >
                                <MoreHorizontal className="w-5 h-5 text-gray-400" />
                            </Button>
                        </div>

                        {/* Expanded Actions */}
                        <AnimatePresence>
                            {expandedId === friend.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 px-4 pb-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 rounded-xl h-10"
                                        >
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Message
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => removeFriend(friend.id)}
                                            disabled={removing === friend.id}
                                            className="rounded-xl h-10 border-red-200 text-red-500 hover:bg-red-50"
                                        >
                                            {removing === friend.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserMinus className="w-4 h-4 mr-2" />
                                                    Remove
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
