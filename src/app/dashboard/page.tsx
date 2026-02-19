"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileUp, FolderOpen, UsersRound, CircleUserRound, Star, LogOutIcon } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FavoriteFlashcardsList } from "@/components/dashboard/FavoriteFlashcardsList";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { StudyScheduler } from "@/components/flashcards/StudyScheduler";
import { ReminderNotification } from "@/components/ReminderNotification";

const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading, signOut } = useAuth();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
                    <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Loading</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#FDFBF9] selection:bg-gray-900 selection:text-white overflow-x-hidden">
            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 }}
                className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 md:py-6 bg-white backdrop-blur-xl border-b border-gray-100"
            >
                <Link href="/" className="flex items-center gap-3">
                    <Image src="/logo/hly.svg" alt="HLY Logo" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10" />
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <ReminderNotification />
                    <Button
                        variant="outline"
                        onClick={() => router.push("/profile")}
                        className="rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    >
                        <CircleUserRound className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSignOut}
                        className="rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    >
                        <LogOutIcon className="w-4 h-4" />
                    </Button>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative px-4 sm:px-6 md:px-12 pt-8 sm:pt-12 md:pt-20 pb-8 sm:pb-12 md:pb-16">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="max-w-7xl mx-auto"
                >
                    <motion.div variants={fadeInUp} className="mb-6 sm:mb-8">
                        <span className="text-xs font-bold tracking-widest text-[#5B79A6] uppercase">
                            Welcome back, {user.email?.split("@")[0]}
                        </span>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-12">
                        <div>
                            <h1 className="text-[10vw] sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter text-gray-900 font-caladea leading-[0.9]">
                                Your
                            </h1>
                            <h1 className="text-[10vw] sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tighter text-gray-400 font-caladea leading-[0.9]">
                                <span>Safe</span> <span className="text-gray-900">Space</span>
                            </h1>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Content Section */}
            <section className="relative px-4 sm:px-6 md:px-12 pb-12 md:pb-24">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                                Quick Actions
                            </h2>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {/* Quick Action: Upload PDF */}
                                <div
                                    onClick={() => router.push('/books')}
                                    className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 cursor-pointer hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:scale-110 transition-all duration-300">
                                        <FileUp className="w-5 h-5 sm:w-7 sm:h-7 text-gray-900 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-sm sm:text-xl font-caladea text-gray-900 tracking-tight text-center">Books</span>
                                </div>

                                {/* Quick Action: Friends */}
                                <div
                                    onClick={() => router.push('/friends')}
                                    className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 cursor-pointer hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:scale-110 transition-all duration-300">
                                        <UsersRound className="w-5 h-5 sm:w-7 sm:h-7 text-gray-900 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-sm sm:text-xl font-caladea text-gray-900 tracking-tight text-center">Friends</span>
                                </div>

                                {/* Quick Action: Folders */}
                                <div
                                    onClick={() => router.push('/folders')}
                                    className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 cursor-pointer hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:scale-110 transition-all duration-300">
                                        <FolderOpen className="w-5 h-5 sm:w-7 sm:h-7 text-gray-900 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-sm sm:text-xl font-caladea text-gray-900 tracking-tight text-center">Folders</span>
                                </div>

                                {/* Quick Action: Favorites */}
                                <div
                                    onClick={() => router.push('/favorite-flashcards')}
                                    className="group bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 cursor-pointer hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-900 group-hover:scale-110 transition-all duration-300">
                                        <Star className="w-5 h-5 sm:w-7 sm:h-7 text-gray-900 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-sm sm:text-xl font-caladea text-gray-900 tracking-tight text-center">Favorites</span>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="mt-6">
                                <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">
                                    Leaderboard
                                </h2>
                                <Leaderboard />
                            </div>
                        </motion.div>

                        {/* Right Column - Study Scheduler & Favorites */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Study Scheduler */}
                            <div>
                                <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">
                                    Study Schedule
                                </h2>
                                <StudyScheduler />
                            </div>

                            {/* Favorites */}
                            <div>
                                <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">
                                    Favorites
                                </h2>
                                <FavoriteFlashcardsList userId={user.id} />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}