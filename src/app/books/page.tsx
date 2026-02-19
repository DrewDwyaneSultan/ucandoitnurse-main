"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { BookUploadForm } from "@/components/books/BookUploadForm";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import { RotateCw, ChevronLeft, BookMarked, ArrowLeft, ChevronRight, Search, XCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Book } from "@/types/database.types";

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function BooksPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const booksPerPage = 6;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page when searching
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter books based on debounced search
    const filteredBooks = useMemo(() => {
        if (!debouncedSearch.trim()) return books;
        const search = debouncedSearch.toLowerCase();
        return books.filter((book) =>
            book.title.toLowerCase().includes(search)
        );
    }, [books, debouncedSearch]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchBooks = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("books")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching books:", error);
            toast.error("Couldn't grab your books - give it another shot!");
        } else {
            setBooks(data || []);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchBooks();
        }
    }, [user, fetchBooks]);

    const handleUploadComplete = (book: { id: string; title: string }) => {
        toast.success(`"${book.title}" is ready to study - let's do this!`);
        setShowUpload(false);
        setCurrentPage(1); // Reset to first page after upload
        fetchBooks();
    };



    const handleDelete = async (bookId: string) => {
        const book = books.find((b) => b.id === bookId);
        if (!book) return;

        // Delete from storage
        await supabase.storage.from("books").remove([book.file_path]);

        // Delete related chunks and flashcards (cascade should handle this)
        await supabase.from("books").delete().eq("id", bookId);

        toast.success("Poof! Book is gone - making room for new adventures!");
        // Adjust page if current page would be empty after delete
        const newTotalPages = Math.ceil((books.length - 1) / booksPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        }
        fetchBooks();
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
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all duration-300 shadow-sm"
                        aria-label="Back to Library">
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
                        Bookshelf
                    </h1>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchBooks}
                            className="rounded-full w-12 h-12 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={() => setShowUpload(true)}
                            className="h-12 rounded-full bg-gray-900 text-white px-8 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium font-poppins">New Book</span>
                        </Button>
                    </div>
                </motion.div>

                {/* Search Bar */}
                {books.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search books"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-10 h-12 rounded-full border-gray-200 bg-white focus:ring-gray-900/10 focus:border-gray-300 font-poppins"
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
                                {filteredBooks.length} {filteredBooks.length === 1 ? "result" : "results"} for &quot;{debouncedSearch}&quot;
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Upload Form Modal */}
                {showUpload && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-50">
                                <h2 className="text-lg font-caladea tracking-wide text-gray-900">Upload PDF</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowUpload(false)}
                                    className="text-gray-400 hover:text-gray-900 font-poppins"
                                >
                                    Close
                                </Button>
                            </div>
                            <div className="p-8">
                                <BookUploadForm
                                    userId={user.id}
                                    onUploadComplete={handleUploadComplete}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Books Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-2xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : books.length === 0 ? (
                    <motion.div variants={fadeInUp} initial="initial" animate="animate">
                        <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                <BookMarked className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-caladea text-gray-900 mb-2">No books found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8 font-poppins">
                                Start by uploading your nursing textbooks to generate flashcards and study materials.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={() => setShowUpload(true)}
                                    className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 transition-all font-poppins"
                                >
                                    Upload Book
                                </Button>
                                <Button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/demo', { method: 'POST' });
                                            const data = await res.json();
                                            if (res.ok) {
                                                toast.success('Demo content added! Refreshing book list.');
                                                fetchBooks();
                                            } else {
                                                toast.error(data.error || 'Could not add demo data');
                                            }
                                        } catch (e) {
                                            toast.error('Network error');
                                        }
                                    }}
                                    variant="outline"
                                    className="rounded-full px-8 py-6 border-gray-900 text-gray-900 hover:bg-gray-100 transition-all font-poppins"
                                >
                                    Load Sample Data
                                </Button>
                            </div>
                        </Empty>
                    </motion.div>
                ) : filteredBooks.length === 0 ? (
                    <motion.div variants={fadeInUp} initial="initial" animate="animate">
                        <Empty className="min-h-[300px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-caladea text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto font-poppins">
                                No books match &quot;{debouncedSearch}&quot;. Try a different search term.
                            </p>
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors font-poppins"
                            >
                                Clear search
                            </button>
                        </Empty>
                    </motion.div>

                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBooks
                                .slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage)
                                .map((book) => (
                                    <motion.div
                                        key={book.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full"
                                    >
                                        <BookCard
                                            book={book}
                                            onDelete={handleDelete}
                                        />
                                    </motion.div>
                                ))}
                        </div>

                        {/* Pagination */}
                        {filteredBooks.length > booksPerPage && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-center gap-4 mt-10"
                            >
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
                                    {Array.from({ length: Math.ceil(filteredBooks.length / booksPerPage) }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-full font-poppins text-sm font-medium transition-all ${currentPage === page
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
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredBooks.length / booksPerPage)))}
                                    disabled={currentPage === Math.ceil(filteredBooks.length / booksPerPage)}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
