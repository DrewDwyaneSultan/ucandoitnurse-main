"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
    ArrowLeft,
    Plus,
    Archive,
    FolderOpen,
    MoreHorizontal,
    Pencil,
    Trash2,
    Library,
    SquareStack,
    RotateCw,
    Search,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Folder as FolderType, Book, Flashcard } from "@/types/database.types";

// Available colors for folders
const FOLDER_COLORS = [
    "#5B79A6", // Blue
    "#6B8E6B", // Green
    "#A67B5B", // Brown
    "#8B6B8E", // Purple
    "#6BA6A6", // Teal
    "#A66B6B", // Red
    "#A6986B", // Gold
    "#6B6BA6", // Indigo
];

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

interface FolderWithCounts extends FolderType {
    bookCount: number;
    flashcardCount: number;
}

export default function FoldersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const foldersPerPage = 6;

    // Create folder modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
    const [creating, setCreating] = useState(false);

    // Edit folder
    const [editingFolder, setEditingFolder] = useState<FolderWithCounts | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    // Folder actions menu
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Add items modal
    const [showAddItemsModal, setShowAddItemsModal] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<FolderWithCounts | null>(null);
    const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
    const [availableFlashcards, setAvailableFlashcards] = useState<Flashcard[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"books" | "flashcards">("books");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter folders based on debounced search
    const filteredFolders = useMemo(() => {
        if (!debouncedSearch.trim()) return folders;
        const search = debouncedSearch.toLowerCase();
        return folders.filter((folder) =>
            folder.name.toLowerCase().includes(search)
        );
    }, [folders, debouncedSearch]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchFolders = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/folders?userId=${user.id}`);
            const data = await res.json();

            if (data.folders) {
                // For each folder, fetch the actual counts from folder_items
                const foldersWithCounts = await Promise.all(
                    data.folders.map(async (folder: FolderType) => {
                        const { data: items } = await supabase
                            .from("folder_items")
                            .select("item_type")
                            .eq("folder_id", folder.id);

                        const bookCount = items?.filter(i => i.item_type === "book").length || 0;
                        const flashcardCount = items?.filter(i => i.item_type === "flashcard" || i.item_type === "shared_flashcard").length || 0;

                        return {
                            ...folder,
                            bookCount,
                            flashcardCount,
                        };
                    })
                );
                setFolders(foldersWithCounts);
            }
        } catch (error) {
            console.error("Error fetching folders:", error);
            toast.error("Couldn't load your folders - give it another shot!");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchFolders();
        }
    }, [user, fetchFolders]);

    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;

        setCreating(true);
        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    name: newFolderName.trim(),
                    color: newFolderColor,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Folder created - time to organize!");
            setShowCreateModal(false);
            setNewFolderName("");
            setNewFolderColor(FOLDER_COLORS[0]);
            setCurrentPage(1);
            fetchFolders();
        } catch (error) {
            console.error("Error creating folder:", error);
            toast.error("Couldn't create folder - try again!");
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateFolder = async () => {
        if (!user || !editingFolder || !editName.trim()) return;

        try {
            const res = await fetch("/api/folders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId: editingFolder.id,
                    userId: user.id,
                    name: editName.trim(),
                    color: editColor,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("Folder updated!");
            setEditingFolder(null);
            fetchFolders();
        } catch (error) {
            console.error("Error updating folder:", error);
            toast.error("Couldn't update folder - try again!");
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!user) return;

        try {
            const res = await fetch(`/api/folders?folderId=${folderId}&userId=${user.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Poof! Folder is gone - making room for new adventures!");
            setActiveMenu(null);
            const newTotalPages = Math.ceil((folders.length - 1) / foldersPerPage);
            if (currentPage > newTotalPages && newTotalPages > 0) {
                setCurrentPage(newTotalPages);
            }
            fetchFolders();
        } catch (error) {
            console.error("Error deleting folder:", error);
            toast.error("Couldn't delete folder - try again!");
        }
    };

    const openAddItemsModal = async (folder: FolderWithCounts) => {
        setSelectedFolder(folder);
        setShowAddItemsModal(true);
        setItemsLoading(true);

        try {
            // Fetch user's books
            const { data: books } = await supabase
                .from("books")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            // Fetch user's flashcards
            const { data: flashcards } = await supabase
                .from("flashcards")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            // Get items already in folder
            const { data: existingItems } = await supabase
                .from("folder_items")
                .select("item_type, item_id")
                .eq("folder_id", folder.id);

            const existingIds = new Set(existingItems?.map(i => `${i.item_type}-${i.item_id}`) || []);

            // Filter out items already in folder
            setAvailableBooks(books?.filter(b => !existingIds.has(`book-${b.id}`)) || []);
            setAvailableFlashcards(flashcards?.filter(f => !existingIds.has(`flashcard-${f.id}`)) || []);
        } catch (error) {
            console.error("Error fetching items:", error);
            toast.error("Couldn't load items - try again!");
        } finally {
            setItemsLoading(false);
        }
    };

    const handleAddItem = async (itemType: "book" | "flashcard", itemId: string) => {
        if (!user || !selectedFolder) return;

        try {
            const res = await fetch("/api/folders/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId: selectedFolder.id,
                    userId: user.id,
                    itemType,
                    itemId,
                }),
            });

            if (!res.ok) throw new Error("Failed to add item");

            toast.success("Added to folder!");

            // Remove from available list
            if (itemType === "book") {
                setAvailableBooks(prev => prev.filter(b => b.id !== itemId));
            } else {
                setAvailableFlashcards(prev => prev.filter(f => f.id !== itemId));
            }

            fetchFolders();
        } catch (error) {
            console.error("Error adding item:", error);
            toast.error("Couldn't add item - try again!");
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
                        aria-label="Back to Dashboard"
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
                        Folders
                    </h1>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchFolders}
                            className="rounded-full w-12 h-12 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="h-12 rounded-full bg-gray-900 text-white px-8 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium font-poppins">New Folder</span>
                        </Button>
                    </div>
                </motion.div>

                {/* Search Bar */}
                {folders.length > 0 && (
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
                                placeholder="Search folders"
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
                                {filteredFolders.length} {filteredFolders.length === 1 ? "result" : "results"} for &quot;{debouncedSearch}&quot;
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Folders Grid */}
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
                ) : folders.length === 0 ? (
                    <motion.div variants={fadeInUp} initial="initial" animate="animate">
                        <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                <Archive className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-caladea text-gray-900 mb-2">No folders yet</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8 font-poppins">
                                Create folders to organize your books and flashcards into collections.
                            </p>
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="rounded-full bg-gray-900 text-white px-8 py-6 hover:bg-gray-800 transition-all font-poppins"
                            >
                                Create Folder
                            </Button>
                        </Empty>
                    </motion.div>
                ) : filteredFolders.length === 0 ? (
                    <motion.div variants={fadeInUp} initial="initial" animate="animate">
                        <Empty className="min-h-[300px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-caladea text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto font-poppins">
                                No folders match &quot;{debouncedSearch}&quot;. Try a different search term.
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
                            {filteredFolders
                                .slice((currentPage - 1) * foldersPerPage, currentPage * foldersPerPage)
                                .map((folder) => (
                                    <motion.div
                                        key={folder.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="group relative bg-white rounded-3xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-lg transition-all cursor-pointer"
                                        onClick={() => router.push(`/folders/${folder.id}`)}
                                    >
                                        {/* Folder Icon */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                                style={{ backgroundColor: folder.color }}
                                            >
                                                <FolderOpen
                                                    className="w-7 h-7"
                                                    style={{ color: "white" }}
                                                />
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenu(activeMenu === folder.id ? null : folder.id);
                                                    }}
                                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                                >
                                                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {activeMenu === folder.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-10"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    openAddItemsModal(folder);
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-poppins"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Add Items
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFolder(folder);
                                                                    setEditName(folder.name);
                                                                    setEditColor(folder.color);
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-poppins"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteFolder(folder.id)}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-poppins"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Folder Name */}
                                        <h3 className="text-xl font-caladea text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                                            {folder.name}
                                        </h3>

                                        {/* Item Counts */}
                                        <div className="flex items-center gap-4 text-sm text-gray-500 font-poppins">
                                            <span className="flex items-center gap-1.5">
                                                <Library className="w-4 h-4" />
                                                {folder.bookCount} books
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <SquareStack className="w-4 h-4" />
                                                {folder.flashcardCount} cards
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                        </div>

                        {/* Pagination */}
                        {filteredFolders.length > foldersPerPage && (
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
                                    {Array.from({ length: Math.ceil(filteredFolders.length / foldersPerPage) }, (_, i) => i + 1).map((page) => (
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
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredFolders.length / foldersPerPage)))}
                                    disabled={currentPage === Math.ceil(filteredFolders.length / foldersPerPage)}
                                    className="rounded-full w-10 h-10 border-gray-200 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        )}
                    </>
                )}
            </div>

            {/* Create Folder Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-50">
                                <h2 className="text-lg font-caladea tracking-wide text-gray-900">Create Folder</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-900 font-poppins"
                                >
                                    Close
                                </Button>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Folder Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Folder Name
                                    </label>
                                    <Input
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="My Study Collection"
                                        className="h-12 rounded-xl border-gray-200 font-poppins"
                                    />
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3 font-poppins">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {FOLDER_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewFolderColor(color)}
                                                className={`w-10 h-10 rounded-full transition-all ${newFolderColor === color
                                                    ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                                                    : "hover:scale-105"
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Create Button */}
                                <Button
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim() || creating}
                                    className="w-full h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins"
                                >
                                    {creating ? "Creating..." : "Create Folder"}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Folder Modal */}
            <AnimatePresence>
                {editingFolder && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-50">
                                <h2 className="text-lg font-caladea tracking-wide text-gray-900">Edit Folder</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingFolder(null)}
                                    className="text-gray-400 hover:text-gray-900 font-poppins"
                                >
                                    Close
                                </Button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Folder Name
                                    </label>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="h-12 rounded-xl border-gray-200 font-poppins"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3 font-poppins">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {FOLDER_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setEditColor(color)}
                                                className={`w-10 h-10 rounded-full transition-all ${editColor === color
                                                    ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                                                    : "hover:scale-105"
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleUpdateFolder}
                                    disabled={!editName.trim()}
                                    className="w-full h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Items Modal */}
            <AnimatePresence>
                {showAddItemsModal && selectedFolder && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-100"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-50">
                                <h2 className="text-lg font-caladea tracking-wide text-gray-900">
                                    Add to {selectedFolder.name}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAddItemsModal(false)}
                                    className="text-gray-400 hover:text-gray-900 font-poppins"
                                >
                                    Close
                                </Button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100">
                                <button
                                    onClick={() => setActiveTab("books")}
                                    className={`flex-1 py-4 text-sm font-medium font-poppins transition-colors ${activeTab === "books"
                                        ? "text-gray-900 border-b-2 border-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <Library className="w-4 h-4 inline mr-2" />
                                    Books ({availableBooks.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("flashcards")}
                                    className={`flex-1 py-4 text-sm font-medium font-poppins transition-colors ${activeTab === "flashcards"
                                        ? "text-gray-900 border-b-2 border-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <SquareStack className="w-4 h-4 inline mr-2" />
                                    Flashcards ({availableFlashcards.length})
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {itemsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
                                    </div>
                                ) : activeTab === "books" ? (
                                    availableBooks.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 font-poppins">
                                            No books available to add
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {availableBooks.map((book) => (
                                                <div
                                                    key={book.id}
                                                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                                                            <Library className="w-5 h-5 text-gray-600" />
                                                        </div>
                                                        <span className="font-medium text-gray-900 font-poppins line-clamp-1">
                                                            {book.title}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddItem("book", book.id)}
                                                        className="rounded-full bg-gray-900 text-white h-9 px-4"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    availableFlashcards.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 font-poppins">
                                            No flashcards available to add
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {availableFlashcards.map((flashcard) => (
                                                <div
                                                    key={flashcard.id}
                                                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                                                            <SquareStack className="w-5 h-5 text-gray-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-medium text-gray-900 font-poppins text-sm line-clamp-1">
                                                                {flashcard.question}
                                                            </span>
                                                            <span className="text-xs text-gray-500 font-poppins">
                                                                {flashcard.topic}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddItem("flashcard", flashcard.id)}
                                                        className="rounded-full bg-gray-900 text-white h-9 px-4 ml-3 flex-shrink-0"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
