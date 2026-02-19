"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
    ArrowLeft,
    AtSign,
    CalendarClock,
    Gem,
    PenLine,
    CheckCheck,
    XCircle,
    Loader2,
    Activity,
    FileStack,
    GalleryVerticalEnd,
    Workflow,
    ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { UserProfile } from "@/types/database.types";


export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState({ books: 0, flashcards: 0, sessions: 0 });
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBio, setEditBio] = useState("");
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    // Available avatar options
    const avatarOptions = [
        "/pfp/pfp1.svg",
        "/pfp/pfp2.svg",
        "/pfp/pfp3.svg",
        "/pfp/pfp4.svg",
        "/pfp/pfp5.svg",
    ];

    const fetchProfile = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch user profile
            const { data: profileData } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                setEditName(profileData.display_name || "");
                setEditBio(profileData.bio || "");
                setSelectedAvatar(profileData.avatar_url || null);
            }

            // subscription/credits logic removed - not needed any more

            // Fetch stats
            const [booksRes, flashcardsRes, sessionsRes] = await Promise.all([
                supabase.from("books").select("id", { count: "exact" }).eq("user_id", user.id),
                supabase.from("flashcards").select("id", { count: "exact" }).eq("user_id", user.id),
                supabase.from("study_sessions").select("id", { count: "exact" }).eq("user_id", user.id),
            ]);

            setStats({
                books: booksRes.count || 0,
                flashcards: flashcardsRes.count || 0,
                sessions: sessionsRes.count || 0,
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user, fetchProfile]);

    const handleSaveProfile = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    displayName: editName,
                    bio: editBio,
                    avatarUrl: selectedAvatar,
                }),
            });

            if (!res.ok) throw new Error("Failed to update");

            const data = await res.json();
            setProfile(data.profile);
            setEditing(false);
            toast.success("Looking good - profile updated!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Couldn't update profile - give it another shot!");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        );
    }

    if (!user) return null;


    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            {/* Header */}
            <nav className="sticky top-0 z-50 flex items-center px-4 sm:px-6 py-4 bg-white border-b border-gray-100">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="ml-4 text-lg font-caladea text-gray-900 sm:hidden">Profile</h1>
            </nav>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {loading ? (
                    <div className="space-y-4 sm:space-y-6">
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-5 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
                                <div className="space-y-2 text-center sm:text-left w-full sm:w-auto">
                                    <Skeleton className="h-6 w-32 sm:w-40 mx-auto sm:mx-0" />
                                    <Skeleton className="h-4 w-48 sm:w-60 mx-auto sm:mx-0" />
                                </div>
                            </div>
                        </div>
                        <Skeleton className="h-36 sm:h-40 w-full rounded-2xl sm:rounded-3xl" />
                        <Skeleton className="h-36 sm:h-40 w-full rounded-2xl sm:rounded-3xl" />
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-5 sm:p-8">
                            {/* Mobile: Stacked layout, Desktop: Side-by-side */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5 sm:mb-6">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                    {/* Avatar */}
                                    <button
                                        onClick={() => editing && setShowAvatarModal(true)}
                                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex-shrink-0 overflow-hidden ${editing ? "cursor-pointer ring-2 ring-gray-200 ring-offset-2 hover:ring-gray-400" : ""}`}
                                        disabled={!editing}
                                    >
                                        {selectedAvatar || profile?.avatar_url ? (
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={selectedAvatar || profile?.avatar_url || ""}
                                                    alt="Avatar"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-[#5B79A6] flex items-center justify-center text-white text-xl sm:text-2xl font-caladea">
                                                {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                        {editing && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <PenLine className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {editing ? (
                                        <div className="space-y-3 w-full sm:w-auto">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                placeholder="Display name"
                                                className="h-10 rounded-xl font-poppins text-center sm:text-left"
                                            />
                                            <Input
                                                value={editBio}
                                                onChange={(e) => setEditBio(e.target.value)}
                                                placeholder="Bio (optional)"
                                                className="h-10 rounded-xl font-poppins text-center sm:text-left"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-center sm:text-left">
                                            <h2 className="text-xl sm:text-2xl font-caladea text-gray-900">
                                                {profile?.display_name || "Set your name"}
                                            </h2>
                                            {profile?.bio && (
                                                <p className="text-gray-500 font-poppins text-sm mt-1">
                                                    {profile.bio}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Edit buttons - centered on mobile */}
                                <div className="flex justify-center sm:justify-start">
                                    {editing ? (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    setEditing(false);
                                                    setEditName(profile?.display_name || "");
                                                    setEditBio(profile?.bio || "");
                                                }}
                                                className="rounded-full w-10 h-10"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                onClick={handleSaveProfile}
                                                disabled={saving}
                                                className="rounded-full w-10 h-10 bg-gray-900"
                                            >
                                                {saving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCheck className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setEditing(true)}
                                            className="rounded-full w-10 h-10"
                                        >
                                            <PenLine className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* User Info */}
                            <div className="space-y-2 sm:space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex items-center justify-center sm:justify-start gap-3 text-gray-600">
                                    <AtSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    <span className="font-poppins text-sm truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center justify-center sm:justify-start gap-3 text-gray-600">
                                    <CalendarClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                    <span className="font-poppins text-sm">
                                        Joined {profile?.created_at ? formatDate(profile.created_at) : "recently"}
                                    </span>
                                </div>
                            </div>
                        </div>


                        {/* Stats Card */}
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-5 sm:p-8">
                            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <h3 className="text-base sm:text-lg font-caladea text-gray-900">Your Progress</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2 border border-gray-100">
                                        <FileStack className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-caladea text-gray-900">{stats.books}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-poppins">Books</p>
                                </div>
                                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2 border border-gray-100">
                                        <GalleryVerticalEnd className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-caladea text-gray-900">{stats.flashcards}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-poppins">Cards</p>
                                </div>
                                <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-1.5 sm:mb-2 border border-gray-100">
                                        <Workflow className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-caladea text-gray-900">{stats.sessions}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-poppins">Sessions</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Avatar Selection Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-caladea text-gray-900 mb-4 text-center">Choose Avatar</h3>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {avatarOptions.map((avatar, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setSelectedAvatar(avatar);
                                        setShowAvatarModal(false);
                                    }}
                                    className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${selectedAvatar === avatar
                                        ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2"
                                        : "border-gray-200 hover:border-gray-400"
                                        }`}
                                >
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={avatar}
                                            alt={`Avatar ${index + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowAvatarModal(false)}
                                className="flex-1 rounded-full h-10 font-poppins"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    setSelectedAvatar(null);
                                    setShowAvatarModal(false);
                                }}
                                variant="outline"
                                className="flex-1 rounded-full h-10 font-poppins text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
