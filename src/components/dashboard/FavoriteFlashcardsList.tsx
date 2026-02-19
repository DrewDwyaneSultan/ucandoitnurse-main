"use client";

import { useState, useEffect } from "react";
import { Star, ChevronRight, Wand2, FileStack, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Flashcard } from "@/types/database.types";
import Link from "next/link";
import Image from "next/image";

interface FavoriteFlashcardsListProps {
    userId: string;
}

export function FavoriteFlashcardsList({ userId }: FavoriteFlashcardsListProps) {
    const [favorites, setFavorites] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const { data, error } = await supabase
                    .from("flashcards")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("is_favorite", true)
                    .order("created_at", { ascending: false })
                    .limit(10);

                if (error) throw error;
                setFavorites(data || []);
            } catch (error) {
                console.error("Error fetching favorites:", error);
                // Log detailed fields from Supabase error objects for debugging
                const supaErr = error as unknown as {
                    message?: string;
                    details?: string;
                    hint?: string;
                    code?: string;
                    status?: number;
                };
                console.error("error.message:", supaErr.message);
                console.error("error.details:", supaErr.details);
                console.error("error.hint:", supaErr.hint);
                console.error("error.code:", supaErr.code);
                console.error("error.status:", supaErr.status);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [userId]);

    const handleRemoveFavorite = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await supabase
                .from("flashcards")
                .update({ is_favorite: false })
                .eq("id", id);

            setFavorites((prev) => {
                const newFavorites = prev.filter((f) => f.id !== id);
                // Adjust page if current page would be empty after remove
                const newTotalPages = Math.ceil(newFavorites.length / itemsPerPage);
                if (currentPage > newTotalPages && newTotalPages > 0) {
                    setCurrentPage(newTotalPages);
                }
                return newFavorites;
            });
        } catch (error) {
            console.error("Error removing favorite:", error);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const paginatedFavorites = favorites.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(favorites.length / itemsPerPage);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Image src="/features/star.svg" alt="Star" width={40} height={40} />
                    <div>
                        <h3 className="text-lg font-caladea font-medium text-gray-900">
                            Favorite Flashcards
                        </h3>
                        <p className="text-sm text-gray-500 font-poppins">
                            {favorites.length} {favorites.length === 1 ? "card" : "cards"} saved
                        </p>
                    </div>
                </div>
                {favorites.length > 0 && (
                    <Link
                        href="/favorite-flashcards"
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors font-poppins"
                    >
                        View all
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Content */}
            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                        <Wand2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium mb-2 font-poppins">No favorites yet</p>
                    <p className="text-sm text-gray-400 max-w-xs font-poppins">
                        Star your favorite flashcards while studying to see them here
                    </p>
                    <Link
                        href="/books"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors font-poppins"
                    >
                        <FileStack className="w-4 h-4" />
                        Browse your books
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {paginatedFavorites.map((flashcard) => (
                            <div
                                key={flashcard.id}
                                onClick={() => setExpandedId(expandedId === flashcard.id ? null : flashcard.id)}
                                className="group relative bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 cursor-pointer transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium text-gray-900 font-poppins ${expandedId === flashcard.id ? "" : "line-clamp-2"}`}>
                                            {flashcard.question}
                                        </p>
                                        {expandedId === flashcard.id && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-poppins">Answer</p>
                                                <p className="text-sm text-gray-700 font-poppins">{flashcard.correct_answer}</p>
                                                {flashcard.explanation && (
                                                    <>
                                                        <p className="text-xs text-gray-500 uppercase tracking-wide mt-3 mb-1 font-poppins">Explanation</p>
                                                        <p className="text-sm text-gray-600 font-poppins">{flashcard.explanation}</p>
                                                    </>
                                                )}
                                                <p className="text-xs text-gray-400 mt-3 font-poppins">Topic: {flashcard.topic}</p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleRemoveFavorite(flashcard.id, e)}
                                        className="flex-shrink-0 p-1.5 rounded-full text-amber-500 hover:bg-amber-100 transition-colors"
                                        title="Remove from favorites"
                                    >
                                        <Star className="w-4 h-4 fill-amber-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {favorites.length > itemsPerPage && (
                        <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-2 h-2 rounded-full transition-all ${currentPage === page
                                            ? "bg-gray-900 w-4"
                                            : "bg-gray-300 hover:bg-gray-400"
                                            }`}
                                        aria-label={`Page ${page}`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
