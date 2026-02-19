"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { ModelSelector, useModelPreference } from "@/components/ui/model-selector";
// credits logic removed, no imports needed
import { ArrowLeft, Wand2, Loader2, Eraser, SquareStack, Star, RotateCw, CircleCheckBig } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Book, Flashcard } from "@/types/database.types";
import Link from "next/link";

export default function BookDetailPage() {
    const router = useRouter();
    const params = useParams();
    const bookId = params.bookId as string;

    const { user, loading: authLoading } = useAuth();
    const { selectedModel, setModel } = useModelPreference();
    const [book, setBook] = useState<Book | null>(null);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [flashcardsLoading, setFlashcardsLoading] = useState(true);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchBook = useCallback(async () => {
        if (!user || !bookId) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("books")
            .select("*")
            .eq("id", bookId)
            .eq("user_id", user.id)
            .single();

        if (error) {
            console.error("Error fetching book:", error);
            toast.error("Hmm, can't find that book anywhere!");
            router.push("/books");
        } else {
            setBook(data);
        }
        setLoading(false);
    }, [user, bookId, router]);

    const fetchFlashcards = useCallback(async () => {
        if (!user || !bookId) return;

        setFlashcardsLoading(true);
        const { data, error } = await supabase
            .from("flashcards")
            .select("*")
            .eq("book_id", bookId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching flashcards:", error);
        } else {
            setFlashcards(data || []);
        }
        setFlashcardsLoading(false);
    }, [user, bookId]);

    const loadData = useCallback(async () => {
        if (user && bookId) {
            await fetchBook();
            await fetchFlashcards();
        }
    }, [user, bookId, fetchBook, fetchFlashcards]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGenerateFlashcards = () => {
        router.push(`/flashcards?bookId=${bookId}&mode=generate`);
    };

    const handleStudyFlashcards = (filter: string = "all") => {
        router.push(`/flashcards?bookId=${bookId}&mode=study&filter=${filter}`);
    };

    const handleDelete = async () => {
        if (!book) return;

        setIsDeleting(true);
        try {
            await supabase.storage.from("books").remove([book.file_path]);
            await supabase.from("books").delete().eq("id", bookId);
            toast.success("Gone forever - time for new cards!");
            router.push("/books");
        } catch (error) {
            console.error("Error deleting book:", error);
            toast.error("Oops, that didn't work. Give it another try!");
            setIsDeleting(false);
        }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDFBF9]">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-24">
                    <Skeleton className="h-10 w-3/4 mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-48 rounded-3xl" />
                        <Skeleton className="h-48 rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
                <Empty className="text-center p-12 bg-white rounded-3xl border border-gray-100">
                    <h3 className="text-xl font-caladea text-gray-900 mb-2">Not found</h3>
                    <Button onClick={() => router.push("/books")} className="rounded-full mt-4">
                        Back
                    </Button>
                </Empty>
            </div>
        );
    }

    const isReady = book.status === "ready";
    const hasFlashcards = flashcards.length > 0;
    const masteredCount = flashcards.filter(f => f.mastered === true).length;
    const reviewCount = flashcards.filter(f => f.mastered === false).length;
    const favoriteCount = flashcards.filter(f => f.is_favorite).length;

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
                        onClick={() => router.push("/books")}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all duration-300 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={loadData}
                        className="rounded-full w-10 h-10 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                    >
                        <RotateCw className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}
                        className="rounded-full w-10 h-10 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 bg-white"
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>
                </div>
            </motion.nav>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 md:mb-12"
                >
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-caladea text-gray-900 tracking-tight leading-tight">
                        {book.title}
                    </h1>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Generate Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <div className={`bg-gray-900 rounded-3xl p-6 h-full ${!isReady ? "opacity-60" : ""}`}>
                            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4 font-poppins">
                                Generate
                            </p>

                            {isReady && (
                                <div className="mb-4">
                                    <ModelSelector
                                        selectedModel={selectedModel}
                                        onModelChange={setModel}
                                        disabled={!isReady}
                                        variant="dark"
                                        onUpgradeClick={() => toast.info("All features free.")}
                                    />
                                </div>
                            )}

                            <Button
                                onClick={isReady ? handleGenerateFlashcards : undefined}
                                disabled={!isReady}
                                className="w-full rounded-full bg-white text-gray-900 hover:bg-gray-100 h-12 font-poppins font-medium shadow-lg"
                            >
                                {!isReady ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Wand2 className="w-4 h-4 mr-2" />
                                )}
                                Generate Flashcards
                            </Button>
                        </div>
                    </motion.div>

                    {/* Study Card - Full Width */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm ${!hasFlashcards ? "opacity-60" : ""}`}>
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-xs font-bold tracking-widest text-gray-500 uppercase font-poppins">
                                    Study
                                </p>
                                <span className="text-sm text-gray-500 font-poppins">
                                    {flashcardsLoading ? "..." : `${flashcards.length} cards`}
                                </span>
                            </div>

                            {hasFlashcards ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* All */}
                                    <button
                                        onClick={() => handleStudyFlashcards("all")}
                                        className="bg-gray-50 rounded-2xl p-5 text-left hover:bg-gray-100 transition-colors group"
                                    >
                                        <SquareStack className="w-5 h-5 text-gray-500 mb-3 group-hover:text-gray-700" />
                                        <p className="text-xs text-gray-500 font-poppins mb-1">All Cards</p>
                                        <p className="text-2xl font-caladea text-gray-900">{flashcards.length}</p>
                                    </button>

                                    {/* Mastered */}
                                    <button
                                        onClick={() => handleStudyFlashcards("mastered")}
                                        disabled={!masteredCount}
                                        className="bg-gray-50 rounded-2xl p-5 text-left hover:bg-green-50 transition-colors disabled:cursor-not-allowed group"
                                    >
                                        <CircleCheckBig className="w-5 h-5 text-green-500 mb-3" />
                                        <p className="text-xs text-gray-500 font-poppins mb-1">Mastered</p>
                                        <p className="text-2xl font-caladea text-green-600">{masteredCount}</p>
                                    </button>

                                    {/* Review */}
                                    <button
                                        onClick={() => handleStudyFlashcards("review")}
                                        disabled={!reviewCount}
                                        className="bg-gray-50 rounded-2xl p-5 text-left hover:bg-red-50 transition-colors disabled:cursor-not-allowed group"
                                    >
                                        <RotateCw className="w-5 h-5 text-red-500 mb-3" />
                                        <p className="text-xs text-gray-500 font-poppins mb-1">Review</p>
                                        <p className="text-2xl font-caladea text-red-500">{reviewCount}</p>
                                    </button>

                                    {/* Favorites */}
                                    <button
                                        onClick={() => handleStudyFlashcards("favorites")}
                                        disabled={!favoriteCount}
                                        className="bg-gray-50 rounded-2xl p-5 text-left hover:bg-amber-50 transition-colors disabled:cursor-not-allowed group"
                                    >
                                        <Star className="w-5 h-5 text-amber-500 mb-3" />
                                        <p className="text-xs text-gray-500 font-poppins mb-1">Favorites</p>
                                        <p className="text-2xl font-caladea text-amber-500">{favoriteCount}</p>
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 font-poppins">Generate flashcards to start studying</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="rounded-3xl border-gray-100 max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-caladea text-xl">Delete Book?</AlertDialogTitle>
                        <AlertDialogDescription className="font-poppins text-sm">
                            This removes the book and {flashcards.length} cards permanently.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isDeleting} className="rounded-full border-gray-200 font-poppins">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full font-poppins"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
