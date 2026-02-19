"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRoundPlus, UsersRound, MailOpen, ArrowLeft, CheckCheck, XCircle, Eraser, Search, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Flashcard, UserProfile } from "@/types/database.types";

interface Friend {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    is_incoming: boolean;
    friend_profile: UserProfile;
}

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

type TabType = "friends" | "inbox";

export default function FriendsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("friends");
    const [friendships, setFriendships] = useState<Friend[]>([]);
    const [sharedCards, setSharedCards] = useState<SharedFlashcard[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchFriendships = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/friends?userId=${user.id}`);
            const data = await res.json();
            if (data.friendships) setFriendships(data.friendships);
        } catch (error) {
            console.error("Error:", error);
        }
    }, [user]);

    const fetchSharedCards = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/share?userId=${user.id}&type=received`);
            const data = await res.json();
            if (data.sharedFlashcards) setSharedCards(data.sharedFlashcards);
        } catch (error) {
            console.error("Error:", error);
        }
    }, [user]);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        await Promise.all([fetchFriendships(), fetchSharedCards()]);
        setLoading(false);
    }, [user, fetchFriendships, fetchSharedCards]);

    useEffect(() => {
        if (!authLoading && !user) router.push("/");
    }, [user, authLoading, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(`/api/users?q=${encodeURIComponent(query)}&userId=${user?.id}`);
            const data = await res.json();
            setSearchResults(data.users || []);
        } catch {
            console.error("Search error");
        } finally {
            setIsSearching(false);
        }
    }, [user?.id]);

    useEffect(() => {
        const timer = setTimeout(() => searchUsers(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    const sendRequest = async (targetId: string, displayName: string) => {
        setProcessing(targetId);
        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requesterId: user?.id, addresseeEmail: displayName }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("Request sent - fingers crossed!");
            setSearchResults((prev) => prev.filter((u) => u.id !== targetId));
            fetchFriendships();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong. Let us try that again!");
        } finally {
            setProcessing(null);
        }
    };

    const handleRequest = async (friendshipId: string, status: "accepted" | "declined") => {
        setProcessing(friendshipId);
        try {
            const res = await fetch("/api/friends", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendshipId, status, userId: user?.id }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(status === "accepted" ? "New study buddy unlocked - time to learn together!" : "Request declined. Onwards!");
            fetchFriendships();
        } catch {
            toast.error("Couldn't process that - give it another shot!");
        } finally {
            setProcessing(null);
        }
    };

    const removeFriend = async (friendshipId: string) => {
        setProcessing(friendshipId);
        try {
            await fetch(`/api/friends?friendshipId=${friendshipId}&userId=${user?.id}`, { method: "DELETE" });
            toast.success("Friend removed - you have got this solo!");
            fetchFriendships();
        } catch {
            toast.error("Hmm, that didn't work. Try again!");
        } finally {
            setProcessing(null);
        }
    };

    const deleteShared = async (sharedId: string) => {
        setProcessing(sharedId);
        try {
            await fetch(`/api/share?sharedId=${sharedId}&userId=${user?.id}`, { method: "DELETE" });
            fetchSharedCards();
        } catch {
            toast.error("Something went sideways - try again!");
        } finally {
            setProcessing(null);
        }
    };

    const openSharedCard = async (shared: SharedFlashcard) => {
        // Mark as read if not already read
        if (!shared.is_read) {
            try {
                await fetch("/api/share", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sharedId: shared.id, userId: user?.id }),
                });
                // Update local state
                setSharedCards((prev) =>
                    prev.map((s) => (s.id === shared.id ? { ...s, is_read: true } : s))
                );
            } catch {
                // Silently fail - we still want to navigate
            }
        }
        // Navigate to flashcards page with the flashcard ID
        router.push(`/flashcards?flashcardId=${shared.flashcard_id}`);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    const pendingRequests = friendships.filter((f) => f.status === "pending" && f.is_incoming);
    const acceptedFriends = friendships.filter((f) => f.status === "accepted");
    const unreadCount = sharedCards.filter((s) => !s.is_read).length;

    return (
        <div className="min-h-screen bg-[#FDFBF9] selection:bg-gray-900 selection:text-white">
            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-white/70 backdrop-blur-xl border-b border-gray-100"
            >
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all duration-300 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                </div>
            </motion.nav>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <h1 className="text-4xl md:text-5xl font-caladea text-gray-900 tracking-tight leading-tight">
                        Friends
                    </h1>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={loadData}
                            className="rounded-full w-12 h-12 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="h-12 rounded-full bg-gray-900 text-white px-8 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10"
                        >
                            <UserRoundPlus className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium font-poppins">Add Friend</span>
                        </Button>
                    </div>
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-8"
                >
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab("friends")}
                            className={`relative px-6 py-3 rounded-full text-sm font-medium font-poppins transition-all ${activeTab === "friends"
                                ? "bg-gray-900 text-white"
                                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                                }`}
                        >
                            <UsersRound className="w-4 h-4 inline mr-2" />
                            Friends
                            {pendingRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("inbox")}
                            className={`relative px-6 py-3 rounded-full text-sm font-medium font-poppins transition-all ${activeTab === "inbox"
                                ? "bg-gray-900 text-white"
                                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                                }`}
                        >
                            <MailOpen className="w-4 h-4 inline mr-2" />
                            Shared Cards
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === "friends" ? (
                    <div className="space-y-6">
                        {/* Pending Requests */}
                        {pendingRequests.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 font-poppins">
                                    Pending Requests
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {pendingRequests.map((req) => (
                                        <div key={req.id} className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm">
                                            <div className="flex items-center gap-4 mb-4">
                                                <UserAvatar
                                                    avatarUrl={req.friend_profile?.avatar_url}
                                                    displayName={req.friend_profile?.display_name}
                                                    clickable={false}
                                                    size="lg"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900 font-poppins">{req.friend_profile?.display_name}</p>
                                                    <p className="text-sm text-gray-500 font-poppins">wants to be friends</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleRequest(req.id, "declined")}
                                                    disabled={processing === req.id}
                                                    className="flex-1 rounded-full border-gray-200 text-gray-600 hover:border-gray-300 font-poppins"
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Decline
                                                </Button>
                                                <Button
                                                    onClick={() => handleRequest(req.id, "accepted")}
                                                    disabled={processing === req.id}
                                                    className="flex-1 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins"
                                                >
                                                    {processing === req.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCheck className="w-4 h-4 mr-1" />
                                                            Accept
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Friends List */}
                        {acceptedFriends.length > 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 font-poppins">
                                    Your Friends
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {acceptedFriends.map((friend) => (
                                        <div key={friend.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:border-gray-200 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <UserAvatar
                                                        avatarUrl={friend.friend_profile?.avatar_url}
                                                        displayName={friend.friend_profile?.display_name}
                                                        userId={friend.friend_profile?.id}
                                                        size="lg"
                                                    />
                                                    <p className="font-medium text-gray-900 font-poppins">{friend.friend_profile?.display_name}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFriend(friend.id)}
                                                    disabled={processing === friend.id}
                                                    className="w-10 h-10 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                >
                                                    {processing === friend.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Eraser className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : pendingRequests.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                        <UsersRound className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-caladea text-gray-900 mb-2">No friends yet</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-8 font-poppins">
                                        Add friends to share flashcards and study together.
                                    </p>
                                    <Button
                                        onClick={() => setShowAddModal(true)}
                                        className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 transition-all font-poppins"
                                    >
                                        Add Friend
                                    </Button>
                                </Empty>
                            </motion.div>
                        ) : null}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sharedCards.length > 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sharedCards.map((shared) => (
                                        <div
                                            key={shared.id}
                                            onClick={() => openSharedCard(shared)}
                                            className={`bg-white rounded-3xl p-6 border shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] ${!shared.is_read ? "border-blue-300" : "border-gray-100 hover:border-gray-200"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        avatarUrl={shared.sender?.avatar_url}
                                                        displayName={shared.sender?.display_name}
                                                        clickable={false}
                                                        size="md"
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-900 font-poppins text-sm">{shared.sender?.display_name}</p>
                                                        {!shared.is_read && (
                                                            <span className="text-xs text-blue-600 font-poppins">New</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteShared(shared.id);
                                                    }}
                                                    disabled={processing === shared.id}
                                                    className="w-8 h-8 rounded-full text-gray-400 hover:text-red-500"
                                                >
                                                    {processing === shared.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Eraser className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>

                                            {shared.message && (
                                                <p className="text-sm text-gray-500 font-poppins italic mb-3">
                                                    &quot;{shared.message}&quot;
                                                </p>
                                            )}

                                            <div className="bg-gray-50 rounded-2xl p-4">
                                                <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide mb-1">Question</p>
                                                <p className="text-sm font-medium text-gray-900 font-poppins line-clamp-2">
                                                    {shared.flashcard?.question}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                        <MailOpen className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-caladea text-gray-900 mb-2">No shared cards</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto font-poppins">
                                        Cards shared by friends will appear here.
                                    </p>
                                </Empty>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Friend Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-transparent backdrop-blur-xs flex items-center justify-center z-50 p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-50">
                            <h2 className="text-lg font-caladea tracking-wide text-gray-900">Add Friend</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-900 font-poppins"
                            >
                                Close
                            </Button>
                        </div>
                        <div className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name"
                                    className="pl-12 h-12 rounded-full border-gray-200 bg-white focus:ring-gray-900/10 focus:border-gray-300 font-poppins"
                                />
                            </div>

                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
                                {isSearching ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-3">
                                        {searchResults.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        avatarUrl={u.avatar_url}
                                                        displayName={u.display_name}
                                                        clickable={false}
                                                        size="md"
                                                    />
                                                    <span className="font-medium text-gray-900 font-poppins">{u.display_name}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => sendRequest(u.id, u.display_name || "")}
                                                    disabled={processing === u.id}
                                                    className="rounded-full bg-gray-900 hover:bg-gray-800"
                                                >
                                                    {processing === u.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <UserRoundPlus className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.length >= 2 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 font-poppins">No users found</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                        <p className="text-gray-400 font-poppins">Search for users to add</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
