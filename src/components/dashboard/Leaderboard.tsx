"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, RotateCw, UserPlus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";
import Image from "next/image";

interface LeaderboardEntry {
    userId: string;
    displayName: string;
    totalCards: number;
    rank: number;
}

interface UserDetails {
    id: string;
    displayName: string;
    email?: string;
    bio?: string;
    totalCards: number;
    rank: number;
    joinedAt?: string;
}

export function Leaderboard() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [sendingRequest, setSendingRequest] = useState(false);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/leaderboard");
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
            }
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const handleUserClick = (entry: LeaderboardEntry) => {
        // Don't show popup for current user
        if (user?.id === entry.userId) return;

        setSelectedUser({
            id: entry.userId,
            displayName: entry.displayName,
            totalCards: entry.totalCards,
            rank: entry.rank
        });
    };

    const sendFriendRequest = async () => {
        if (!selectedUser || !user) return;

        setSendingRequest(true);
        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterId: user.id,
                    addresseeId: selectedUser.id
                })
            });

            if (res.ok) {
                toast.success(`Friend request sent to ${selectedUser.displayName}!`);
                setSelectedUser(null);
            } else {
                const data = await res.json();
                toast.error(data.error || "Couldn't send request");
            }
        } catch (error) {
            console.error("Error sending request:", error);
            toast.error("Something went wrong");
        } finally {
            setSendingRequest(false);
        }
    };

    const getRankDisplay = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="w-5 h-5 text-amber-400" />;
            case 2:
                return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">2</span>;
            case 3:
                return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-amber-600">3</span>;
            default:
                return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">{rank}</span>;
        }
    };

    const getRankBg = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-amber-50";
            case 2:
                return "bg-gray-50";
            case 3:
                return "bg-orange-50";
            default:
                return "bg-gray-50";
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-3xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
            >
                {/* Background SVG */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/assets/lb-bg.svg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                    }}
                />

                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-white/85" />

                {/* Content */}
                <div className="relative p-6 md:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Image src="/assets/medal.svg" alt="Medal" width={40} height={40} />
                            <div>
                                <h3 className="text-lg font-caladea font-medium text-gray-900">Leaderboard</h3>
                                <p className="text-sm text-gray-500 font-poppins">Top learners worldwide</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchLeaderboard}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    {/* Leaderboard List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-8">
                            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 font-poppins">No scores yet</p>
                            <p className="text-xs text-gray-400 font-poppins">Start studying in scored mode!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaderboard.map((entry, index) => {
                                const isCurrentUser = user?.id === entry.userId;

                                return (
                                    <motion.div
                                        key={entry.userId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleUserClick(entry)}
                                        className={`flex items-center gap-3 p-3 rounded-xl ${getRankBg(entry.rank)} ${isCurrentUser ? "ring-2 ring-gray-900 ring-offset-1" : "cursor-pointer hover:ring-1 hover:ring-gray-200"
                                            }`}
                                    >
                                        {/* Rank */}
                                        <div className="w-8 flex justify-center">
                                            {getRankDisplay(entry.rank)}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-poppins truncate ${isCurrentUser ? "font-semibold text-gray-900" : "text-gray-700"
                                                }`}>
                                                {entry.displayName}
                                                {isCurrentUser && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900 font-poppins">
                                                {entry.totalCards.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-400 font-poppins ml-1">cards</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* User Profile Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            {/* Close button */}
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* User Info */}
                            <div className="text-center mb-6">
                                <UserAvatar userId={selectedUser.id} size="lg" className="mx-auto mb-4" />
                                <h3 className="text-xl font-caladea text-gray-900 mb-1">
                                    {selectedUser.displayName}
                                </h3>
                                <p className="text-sm text-gray-400 font-poppins">
                                    Rank #{selectedUser.rank} • {selectedUser.totalCards.toLocaleString()} cards studied
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 font-poppins">
                                            {selectedUser.totalCards.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400 font-poppins">Cards Studied</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900 font-poppins">
                                            #{selectedUser.rank}
                                        </p>
                                        <p className="text-xs text-gray-400 font-poppins">Global Rank</p>
                                    </div>
                                </div>
                            </div>

                            {/* Add Friend Button */}
                            <Button
                                onClick={sendFriendRequest}
                                disabled={sendingRequest}
                                className="w-full rounded-full bg-gray-900 text-white h-12 font-poppins"
                            >
                                {sendingRequest ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add Friend
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
