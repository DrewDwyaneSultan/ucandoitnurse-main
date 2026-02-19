"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Check, X, Search, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserProfile } from "@/types/database.types";

interface FriendRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onRequestSent: () => void;
}

export function FriendRequestModal({
    isOpen,
    onClose,
    userId,
    onRequestSent,
}: FriendRequestModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sendingTo, setSendingTo] = useState<string | null>(null);

    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(
                `/api/users?q=${encodeURIComponent(query)}&userId=${userId}`
            );
            const data = await res.json();
            setSearchResults(data.users || []);
        } catch {
            console.error("Error searching users");
        } finally {
            setIsSearching(false);
        }
    }, [userId]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery, searchUsers]);

    const sendFriendRequest = async (addresseeId: string) => {
        setSendingTo(addresseeId);
        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterId: userId,
                    addresseeEmail: searchResults.find((u) => u.id === addresseeId)
                        ?.display_name,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send request");
            }

            toast.success("Request sent - fingers crossed!");
            onRequestSent();
            setSearchResults((prev) => prev.filter((u) => u.id !== addresseeId));
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Couldn't send that request - give it another shot!"
            );
        } finally {
            setSendingTo(null);
        }
    };

    if (!isOpen) return null;

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
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-gray-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Add Friend
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name..."
                            className="pl-10 h-12 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
                        {isSearching ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-2">
                                {searchResults.map((user) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserAvatar
                                                avatarUrl={user.avatar_url}
                                                displayName={user.display_name}
                                                clickable={false}
                                                size="md"
                                            />
                                            <span className="font-medium text-gray-900">
                                                {user.display_name}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => sendFriendRequest(user.id)}
                                            disabled={sendingTo === user.id}
                                            className="rounded-full"
                                        >
                                            {sendingTo === user.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : searchQuery.length >= 2 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <Users className="w-12 h-12 mb-3 text-gray-300" />
                                <p>No users found</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <Search className="w-12 h-12 mb-3 text-gray-300" />
                                <p>Search for users to add</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

interface FriendRequest {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    is_incoming: boolean;
    friend_profile: UserProfile;
}

interface FriendRequestsListProps {
    requests: FriendRequest[];
    userId: string;
    onAction: () => void;
}

export function FriendRequestsList({
    requests,
    userId,
    onAction,
}: FriendRequestsListProps) {
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAction = async (friendshipId: string, status: "accepted" | "declined") => {
        setProcessing(friendshipId);
        try {
            const res = await fetch("/api/friends", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendshipId, status, userId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success(
                status === "accepted" ? "New study buddy unlocked - time to learn together!" : "Request declined. Onwards and upwards!"
            );
            onAction();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Oops, something went wonky. Try again!"
            );
        } finally {
            setProcessing(null);
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Pending Requests
            </h3>
            {requests.map((request) => (
                <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <UserAvatar
                            avatarUrl={request.friend_profile?.avatar_url}
                            displayName={request.friend_profile?.display_name}
                            clickable={false}
                            size="lg"
                        />
                        <div>
                            <p className="font-medium text-gray-900">
                                {request.friend_profile?.display_name}
                            </p>
                            <p className="text-sm text-gray-500">
                                {request.is_incoming ? "Wants to be friends" : "Request sent"}
                            </p>
                        </div>
                    </div>

                    {request.is_incoming && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(request.id, "declined")}
                                disabled={processing === request.id}
                                className="rounded-full w-10 h-10 p-0 border-red-200 text-red-500 hover:bg-red-50"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleAction(request.id, "accepted")}
                                disabled={processing === request.id}
                                className="rounded-full w-10 h-10 p-0 bg-green-500 hover:bg-green-600"
                            >
                                {processing === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
