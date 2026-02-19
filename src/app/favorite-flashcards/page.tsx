"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { RotateCw, ArrowLeft, Star, ChevronLeft, ChevronRight, Wand2, Search, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Flashcard } from "@/types/database.types";

export default function FavoriteFlashcardsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [favorites, setFavorites] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const itemsPerPage = 6;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page when searching
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter flashcards based on debounced search
    const filteredFavorites = useMemo(() => {
        if (!debouncedSearch.trim()) return favorites;
        const search = debouncedSearch.toLowerCase();
        return favorites.filter((card) =>
            card.question.toLowerCase().includes(search) ||
            card.correct_answer.toLowerCase().includes(search) ||
            card.topic.toLowerCase().includes(search)
        );
    }, [favorites, debouncedSearch]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchFavorites = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("flashcards")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_favorite", true)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching favorites:", error);
            toast.error("Couldn't load your faves - give it another try!");
        } else {
            setFavorites(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchFavorites();
        }
    }, [user, fetchFavorites]);

    const handleRemoveFavorite = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await supabase
                .from("flashcards")
                .update({ is_favorite: false })
                .eq("id", id);

            setFavorites((prev) => {
                const newFavorites = prev.filter((f) => f.id !== id);
                const newTotalPages = Math.ceil(newFavorites.length / itemsPerPage);
                if (currentPage > newTotalPages && newTotalPages > 0) {
                    setCurrentPage(newTotalPages);
                }
                return newFavorites;
            });
            toast.success("Card unfavorited - you can always add it back!");
        } catch (error) {
            console.error("Error removing favorite:", error);
            toast.error("Couldn't remove that one - try again!");
        }
    };

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
                </div>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    const totalPages = Math.ceil(filteredFavorites.length / itemsPerPage);
    const paginatedFavorites = filteredFavorites.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="min-h-screen bg-[#FDFBF9] selection:bg-gray-900 selection:text-white">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-white border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-colors shadow-sm"
                        aria-label="Back to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
                {/* Header Section */}
                <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-caladea text-gray-900 tracking-tight leading-tight">
                                Fav Flashcards
                            </h1>
                            <p className="text-gray-500 font-poppins mt-1">
                                {favorites.length} {favorites.length === 1 ? "card" : "cards"} saved
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchFavorites}
                            className="rounded-full w-12 h-12 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                {favorites.length > 0 && (
                    <div className="mb-8">
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search flashcards"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-10 h-12 rounded-full border-gray-200 bg-white focus:ring-gray-900 focus:border-gray-300 font-poppins"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {debouncedSearch && (
                            <p className="text-sm text-gray-500 mt-2 font-poppins">
                                {filteredFavorites.length} {filteredFavorites.length === 1 ? "result" : "results"} for &quot;{debouncedSearch}&quot;
                            </p>
                        )}
                    </div>
                )}

                {/* Flashcards Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 space-y-4">
                                <div className="flex items-start justify-between">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : favorites.length === 0 ? (
                    <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                            <Wand2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-caladea text-gray-900 mb-2">No favorites yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8 font-poppins">
                            Star your favorite flashcards while studying to see them here.
                        </p>
                        <Button
                            onClick={() => router.push("/books")}
                            className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 transition-colors font-poppins"
                        >
                            Browse Books
                        </Button>
                    </Empty>
                ) : filteredFavorites.length === 0 ? (
                    <Empty className="min-h-[300px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                            <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-caladea text-gray-900 mb-2">No results found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto font-poppins">
                            No flashcards match &quot;{debouncedSearch}&quot;. Try a different search term.
                        </p>
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors font-poppins"
                        >
                            Clear search
                        </button>
                    </Empty>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedFavorites.map((flashcard) => (
                                <div
                                    key={flashcard.id}
                                    onClick={() => setExpandedId(expandedId === flashcard.id ? null : flashcard.id)}
                                    className="group bg-white rounded-3xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide font-poppins">
                                            {flashcard.topic}
                                        </span>
                                        <button
                                            onClick={(e) => handleRemoveFavorite(flashcard.id, e)}
                                            className="p-2 rounded-full text-amber-500 hover:bg-amber-50 transition-colors"
                                            title="Remove from favorites"
                                        >
                                            <Star className="w-5 h-5 fill-amber-500" />
                                        </button>
                                    </div>

                                    {/* Question */}
                                    <h3 className={`font-poppins font-medium text-gray-900 mb-3 ${expandedId === flashcard.id ? "" : "line-clamp-3"}`}>
                                        {flashcard.question}
                                    </h3>

                                    {/* Expanded Content */}
                                    {expandedId === flashcard.id && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-poppins">Answer</p>
                                            <p className="text-sm text-gray-700 font-poppins mb-4">{flashcard.correct_answer}</p>
                                            {flashcard.explanation && (
                                                <>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-poppins">Explanation</p>
                                                    <p className="text-sm text-gray-600 font-poppins">{flashcard.explanation}</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Click hint */}
                                    <p className="text-xs text-gray-400 mt-4 font-poppins">
                                        {expandedId === flashcard.id ? "Click to collapse" : "Click to expand"}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-10">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>

                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-full font-poppins text-sm font-medium transition-colors ${currentPage === page
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-500 hover:bg-gray-100"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
