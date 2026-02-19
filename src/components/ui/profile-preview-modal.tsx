"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, GalleryVerticalEnd, Loader2 } from "lucide-react";
import { UserAvatar } from "./user-avatar";

interface PublicProfile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
}

interface ProfileStats {
    books: number;
    flashcards: number;
}

interface ProfilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export function ProfilePreviewModal({
    isOpen,
    onClose,
    userId,
}: ProfilePreviewModalProps) {
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [stats, setStats] = useState<ProfileStats>({ books: 0, flashcards: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!isOpen || !userId) return;

            setLoading(true);
            try {
                const res = await fetch(`/api/users/public?userId=${userId}`);
                const data = await res.json();

                if (res.ok && data.profile) {
                    setProfile(data.profile);
                    setStats(data.stats || { books: 0, flashcards: 0 });
                }
            } catch (error) {
                console.error("Error fetching public profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [isOpen, userId]);

    const formatJoinDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        });
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
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : profile ? (
                        <>
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Avatar and Name */}
                            <div className="flex flex-col items-center text-center mb-6">
                                <UserAvatar
                                    avatarUrl={profile.avatar_url}
                                    displayName={profile.display_name}
                                    size="xl"
                                    className="mb-4"
                                />
                                <h2 className="text-xl font-caladea text-gray-900">
                                    {profile.display_name || "Anonymous"}
                                </h2>
                                {profile.bio && (
                                    <p className="text-sm text-gray-500 font-poppins mt-1 max-w-[250px]">
                                        {profile.bio}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 font-poppins mt-2">
                                    Joined {formatJoinDate(profile.created_at)}
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 border border-gray-100">
                                        <BookOpen className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <span className="text-2xl font-caladea text-gray-900">{stats.books}</span>
                                    <span className="text-xs text-gray-500 font-poppins">Books</span>
                                </div>
                                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 border border-gray-100">
                                        <GalleryVerticalEnd className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <span className="text-2xl font-caladea text-gray-900">{stats.flashcards}</span>
                                    <span className="text-xs text-gray-500 font-poppins">Flashcards</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <p className="font-poppins">Profile not found</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
