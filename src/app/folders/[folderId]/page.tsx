"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
    ArrowLeft,
    Library,
    RotateCw,
    Trash2,
    MoreHorizontal,
    Pencil,
    X,
    BookMarked,
    SquareStack,
    FolderOpen,
    Ungroup,
    GripVertical,
    GripHorizontal,
    SquaresUnite,
    Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Folder, Book, Flashcard, FlashcardSetWithItems } from "@/types/database.types";
import { Input } from "@/components/ui/input";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    DragOverEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// Available colors for folders
const FOLDER_COLORS = [
    "#5B79A6", "#6B8E6B", "#A67B5B", "#8B6B8E",
    "#6BA6A6", "#A66B6B", "#A6986B", "#6B6BA6",
];

// Draggable Flashcard Component
function DraggableFlashcard({
    flashcard,
    onRemove,
    isOverDropZone,
}: {
    flashcard: Flashcard;
    onRemove: () => void;
    isOverDropZone?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: flashcard.id,
        data: { type: "flashcard", flashcard },
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: isDragging ? 50 : undefined,
        }
        : undefined;

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: isDragging ? 0 : 1, // Hide original when dragging (overlay takes over)
                scale: isOverDropZone ? 1.02 : 1,
            }}
            className={`group relative bg-white rounded-3xl border p-6 transition-all cursor-grab active:cursor-grabbing ${isDragging
                ? "opacity-0" // Hide the original element while dragging
                : "border-gray-100 hover:border-gray-200 hover:shadow-lg"
                }`}
            {...listeners}
            {...attributes}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide font-poppins">
                        {flashcard.topic}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove from folder"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <h3 className="font-poppins font-medium text-gray-900 mb-2 line-clamp-2">
                {flashcard.question}
            </h3>

            <p className="text-sm text-gray-500 font-poppins line-clamp-2">
                {flashcard.correct_answer}
            </p>
        </motion.div>
    );
}

// Droppable zone for each flashcard
function DroppableFlashcard({
    flashcard,
    onRemove,
    children,
}: {
    flashcard: Flashcard;
    onRemove: () => void;
    children?: React.ReactNode;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `drop-${flashcard.id}`,
        data: { type: "flashcard", flashcard },
    });

    return (
        <div
            ref={setNodeRef}
            className={`relative transition-all duration-200 ${isOver ? "scale-105" : ""
                }`}
        >
            <DraggableFlashcard
                flashcard={flashcard}
                onRemove={onRemove}
                isOverDropZone={isOver}
            />
            {children}
        </div>
    );
}

// Flashcard Set Component
function FlashcardSetCard({
    set,
    onUngroup,
    onRename,
    onOpen,
    isOver,
}: {
    set: FlashcardSetWithItems;
    onUngroup: () => void;
    onRename: () => void;
    onOpen: () => void;
    isOver?: boolean;
}) {
    const cardCount = set.flashcards.length;
    const [showMenu, setShowMenu] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: isOver ? 1.02 : 1 }}
            className={`group relative bg-white rounded-2xl border p-4 hover:shadow-md transition-all duration-300 cursor-pointer ${isOver ? "border-gray-400 shadow-md" : "border-gray-100 hover:border-gray-200"}`}
            onClick={onOpen}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                        <SquaresUnite className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                        <h3 className="font-poppins font-medium text-gray-900 text-sm leading-tight">
                            {set.name}
                        </h3>
                        <span className="text-[10px] text-gray-400 font-poppins">
                            {cardCount} cards
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        onRename();
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 font-poppins"
                                >
                                    <Pencil className="w-3 h-3" />
                                    Rename
                                </button>
                                <button
                                    onClick={() => {
                                        onUngroup();
                                        setShowMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-poppins"
                                >
                                    <Ungroup className="w-3 h-3" />
                                    Ungroup
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}


// Droppable and Draggable Flashcard Set Component
function DroppableFlashcardSetCard({
    set,
    onUngroup,
    onRename,
    onOpen,
}: {
    set: FlashcardSetWithItems;
    onUngroup: () => void;
    onRename: () => void;
    onOpen: () => void;
}) {
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: `drop-set-${set.id}`,
        data: { type: "set", set },
    });

    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: `drag-set-${set.id}`,
        data: { type: "set", set },
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: isDragging ? 50 : undefined,
        }
        : undefined;

    return (
        <div
            ref={(node) => {
                setDropRef(node);
                setDragRef(node);
            }}
            style={style}
            className={isDragging ? "opacity-50" : ""}
            {...listeners}
            {...attributes}
        >
            <FlashcardSetCard
                set={set}
                onUngroup={onUngroup}
                onRename={onRename}
                onOpen={onOpen}
                isOver={isOver}
            />
        </div>
    );
}


export default function FolderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const folderId = params.folderId as string;

    const { user, loading: authLoading } = useAuth();
    const [folder, setFolder] = useState<Folder | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [flashcardSets, setFlashcardSets] = useState<FlashcardSetWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"books" | "flashcards">("books");

    // Drag state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeFlashcard, setActiveFlashcard] = useState<Flashcard | null>(null);

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    // Set renaming
    const [editingSet, setEditingSet] = useState<FlashcardSetWithItems | null>(null);
    const [newSetName, setNewSetName] = useState("");

    // Add flashcard modal
    const [showAddFlashcardModal, setShowAddFlashcardModal] = useState(false);
    const [newFlashcardQuestion, setNewFlashcardQuestion] = useState("");
    const [newFlashcardAnswer, setNewFlashcardAnswer] = useState("");
    const [newFlashcardExplanation, setNewFlashcardExplanation] = useState("");
    const [creatingFlashcard, setCreatingFlashcard] = useState(false);

    // Menu
    const [showMenu, setShowMenu] = useState(false);

    // Sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const fetchFolder = useCallback(async () => {
        if (!user || !folderId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/folders?userId=${user.id}&folderId=${folderId}`);
            const data = await res.json();

            if (data.folder) {
                setFolder(data.folder);
                setBooks(data.folder.books || []);
                setFlashcards(data.folder.flashcards || []);
            } else {
                toast.error("Folder not found!");
                router.push("/folders");
            }

            // Fetch flashcard sets
            const setsRes = await fetch(`/api/folders/sets?folderId=${folderId}&userId=${user.id}`);
            const setsData = await setsRes.json();
            setFlashcardSets(setsData.sets || []);
        } catch (error) {
            console.error("Error fetching folder:", error);
            toast.error("Couldn't load folder - try again!");
            router.push("/folders");
        } finally {
            setLoading(false);
        }
    }, [user, folderId, router]);

    useEffect(() => {
        if (user && folderId) {
            fetchFolder();
        }
    }, [user, folderId, fetchFolder]);

    const handleRemoveItem = async (itemType: string, itemId: string) => {
        if (!user) return;

        try {
            const res = await fetch(
                `/api/folders/items?folderId=${folderId}&userId=${user.id}&itemType=${itemType}&itemId=${itemId}`,
                { method: "DELETE" }
            );

            if (!res.ok) throw new Error("Failed to remove");

            toast.success("Item removed from folder!");

            if (itemType === "book") {
                setBooks(prev => prev.filter(b => b.id !== itemId));
            } else {
                setFlashcards(prev => prev.filter(f => f.id !== itemId));
            }
        } catch (error) {
            console.error("Error removing item:", error);
            toast.error("Couldn't remove item - try again!");
        }
    };

    const handleUpdateFolder = async () => {
        if (!user || !folder || !editName.trim()) return;

        try {
            const res = await fetch("/api/folders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId: folder.id,
                    userId: user.id,
                    name: editName.trim(),
                    color: editColor,
                }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast.success("Folder updated!");
            setShowEditModal(false);
            fetchFolder();
        } catch (error) {
            console.error("Error updating folder:", error);
            toast.error("Couldn't update folder - try again!");
        }
    };

    const handleUpdateSet = async () => {
        if (!user || !editingSet || !newSetName.trim()) return;

        try {
            const res = await fetch("/api/folders/sets", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setId: editingSet.id,
                    userId: user.id,
                    name: newSetName.trim(),
                }),
            });

            if (!res.ok) throw new Error("Failed to update set");

            toast.success("Set renamed!");
            setEditingSet(null);
            fetchFolder();
        } catch (error) {
            console.error("Error updating set:", error);
            toast.error("Couldn't update set - try again!");
        }
    };

    const handleDeleteFolder = async () => {
        if (!user || !folder) return;

        try {
            const res = await fetch(`/api/folders?folderId=${folder.id}&userId=${user.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Folder deleted!");
            router.push("/folders");
        } catch (error) {
            console.error("Error deleting folder:", error);
            toast.error("Couldn't delete folder - try again!");
        }
    };

    const handleCreateSet = async (flashcardIds: string[]) => {
        if (!user || flashcardIds.length < 2) return;

        try {
            const res = await fetch("/api/folders/sets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    folderId,
                    userId: user.id,
                    flashcardIds,
                    name: "New Set",
                }),
            });

            if (!res.ok) throw new Error("Failed to create set");

            fetchFolder();
        } catch (error) {
            console.error("Error creating set:", error);
            toast.error("Couldn't create set - try again!");
        }
    };

    const handleAddToSet = async (setId: string, flashcardId: string) => {
        if (!user) return;

        try {
            const res = await fetch("/api/folders/sets", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setId,
                    userId: user.id,
                    flashcardId,
                    folderId,
                }),
            });

            if (!res.ok) throw new Error("Failed to add to set");

            fetchFolder();
        } catch (error) {
            console.error("Error adding to set:", error);
            toast.error("Couldn't add to set - try again!");
        }
    };

    const handleUngroupSet = async (setId: string) => {
        if (!user) return;

        try {
            const res = await fetch(
                `/api/folders/sets?setId=${setId}&userId=${user.id}&folderId=${folderId}`,
                { method: "DELETE" }
            );

            if (!res.ok) throw new Error("Failed to ungroup");

            toast.success("Set ungrouped - flashcards are back!");
            fetchFolder();
        } catch (error) {
            console.error("Error ungrouping set:", error);
            toast.error("Couldn't ungroup - try again!");
        }
    };

    const handleMergeSets = async (targetSetId: string, sourceSetId: string) => {
        if (!user) return;

        try {
            const res = await fetch("/api/folders/sets", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    setId: targetSetId,
                    userId: user.id,
                    sourceSetId,
                }),
            });

            if (!res.ok) throw new Error("Failed to merge sets");

            fetchFolder();
        } catch (error) {
            console.error("Error merging sets:", error);
            toast.error("Couldn't merge sets - try again!");
        }
    };

    const handleCreateManualFlashcard = async () => {
        if (!user || !newFlashcardQuestion.trim() || !newFlashcardAnswer.trim()) {
            toast.error("Question and answer are required!");
            return;
        }

        setCreatingFlashcard(true);
        try {
            const res = await fetch("/api/flashcards/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id,
                    question: newFlashcardQuestion.trim(),
                    answer: newFlashcardAnswer.trim(),
                    explanation: newFlashcardExplanation.trim() || null,
                    topic: folder?.name || "Manual",
                    folderId,
                }),
            });

            if (!res.ok) throw new Error("Failed to create flashcard");

            toast.success("Flashcard created - nice work!");
            setShowAddFlashcardModal(false);
            setNewFlashcardQuestion("");
            setNewFlashcardAnswer("");
            setNewFlashcardExplanation("");
            fetchFolder();
        } catch (error) {
            console.error("Error creating flashcard:", error);
            toast.error("Couldn't create flashcard - try again!");
        } finally {
            setCreatingFlashcard(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        const fc = flashcards.find(f => f.id === active.id);
        setActiveFlashcard(fc || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveFlashcard(null);

        if (!over || !active) return;

        const activeIdRaw = active.id as string;
        const overIdRaw = over.id as string;

        // Check if dropping a set onto another set
        if (activeIdRaw.startsWith("drag-set-") && overIdRaw.startsWith("drop-set-")) {
            const sourceSetId = activeIdRaw.replace("drag-set-", "");
            const targetSetId = overIdRaw.replace("drop-set-", "");

            // Don't merge set into itself
            if (sourceSetId === targetSetId) return;

            handleMergeSets(targetSetId, sourceSetId);
            return;
        }

        // Check if dropping a flashcard onto a set
        if (overIdRaw.startsWith("drop-set-")) {
            const setId = overIdRaw.replace("drop-set-", "");
            handleAddToSet(setId, activeIdRaw);
            return;
        }

        // Otherwise, dropping a flashcard onto another flashcard
        const overId = overIdRaw.replace("drop-", "");

        // Don't do anything if dropping on itself
        if (activeIdRaw === overId) return;

        // Create a set from the two flashcards
        handleCreateSet([activeIdRaw, overId]);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDragOver = (_event: DragOverEvent) => {
        // Could add visual feedback here
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF9]">
                <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const bookCount = books.length;
    const flashcardCount = flashcards.length + flashcardSets.reduce((acc, set) => acc + set.flashcards.length, 0);

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
                        onClick={() => router.push("/folders")}
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all duration-300 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchFolder}
                        className="rounded-full w-10 h-10 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                    >
                        <RotateCw className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowMenu(!showMenu)}
                            className="rounded-full w-10 h-10 border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 bg-white"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>

                        <AnimatePresence>
                            {showMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-10"
                                >
                                    <button
                                        onClick={() => {
                                            setEditName(folder?.name || "");
                                            setEditColor(folder?.color || FOLDER_COLORS[0]);
                                            setShowEditModal(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-poppins"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit Folder
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDeleteFolder();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-poppins"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Folder
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.nav>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-12">
                {loading ? (
                    <div className="space-y-8">
                        <Skeleton className="h-12 w-1/2" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-32 rounded-3xl" />
                            ))}
                        </div>
                    </div>
                ) : folder ? (
                    <>
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mb-8"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div
                                    className="w-16 h-16 rounded-4xl flex items-center justify-center"
                                    style={{ backgroundColor: folder.color }}
                                >
                                    <FolderOpen
                                        className="w-8 h-8"
                                        style={{ color: "white" }}
                                    />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-caladea text-gray-900 tracking-tight">
                                        {folder.name}
                                    </h1>
                                    <p className="text-gray-500 font-poppins">
                                        {bookCount} books, {flashcardCount} flashcards
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mb-8">
                            <button
                                onClick={() => setActiveTab("books")}
                                className={`flex items-center gap-2 py-4 px-6 text-sm font-medium font-poppins border-b-2 transition-colors ${activeTab === "books"
                                    ? "text-gray-900 border-gray-900"
                                    : "text-gray-500 border-transparent hover:text-gray-700"
                                    }`}
                            >
                                <Library className="w-4 h-4" />
                                Books
                            </button>
                            <button
                                onClick={() => setActiveTab("flashcards")}
                                className={`flex items-center gap-2 py-4 px-6 text-sm font-medium font-poppins border-b-2 transition-colors ${activeTab === "flashcards"
                                    ? "text-gray-900 border-gray-900"
                                    : "text-gray-500 border-transparent hover:text-gray-700"
                                    }`}
                            >
                                <SquareStack className="w-4 h-4" />
                                Flashcards
                            </button>
                        </div>

                        {/* Content */}
                        {activeTab === "books" ? (
                            books.length === 0 ? (
                                <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                        <Library className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-2xl font-caladea text-gray-900 mb-2">No books yet</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto font-poppins">
                                        Add books to this folder to organize your reading list.
                                    </p>
                                </Empty>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {books.map((book) => (
                                        <motion.div
                                            key={book.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="group relative bg-white rounded-3xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                                                    <BookMarked className="w-6 h-6 text-gray-600" />
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveItem("book", book.id)}
                                                    className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remove from folder"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <h3 className="text-lg font-caladea text-gray-900 mb-2 line-clamp-2">
                                                {book.title}
                                            </h3>

                                            <Button
                                                onClick={() => router.push(`/books/${book.id}`)}
                                                className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800 mt-4 font-poppins h-10 shadow-sm"
                                            >
                                                Open Book
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <>
                                {/* Header with Add button */}
                                <div className="mb-6 flex items-center justify-between">
                                    {flashcards.length > 1 && (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 tracking-wider font-poppins">
                                            <GripVertical className="w-3 h-3" />
                                            <span>Drag & Drop cards to merge them</span>
                                        </div>
                                    )}
                                    <Button
                                        onClick={() => setShowAddFlashcardModal(true)}
                                        className="ml-auto rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins h-10 px-6 shadow-sm flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Flashcard
                                    </Button>
                                </div>

                                {flashcards.length === 0 && flashcardSets.length === 0 ? (
                                    <Empty className="min-h-[400px] bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                                            <SquareStack className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-2xl font-caladea text-gray-900 mb-2">No flashcards yet</h3>
                                        <p className="text-gray-500 max-w-sm mx-auto font-poppins mb-6">
                                            Create your own flashcards to start studying.
                                        </p>
                                        <Button
                                            onClick={() => setShowAddFlashcardModal(true)}
                                            className="rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins h-12 px-8 shadow-sm flex items-center gap-2"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Create Your First Flashcard
                                        </Button>
                                    </Empty>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleDragStart}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Flashcard Sets */}
                                            {flashcardSets.map((set) => (
                                                <DroppableFlashcardSetCard
                                                    key={set.id}
                                                    set={set}
                                                    onUngroup={() => handleUngroupSet(set.id)}
                                                    onRename={() => {
                                                        setEditingSet(set);
                                                        setNewSetName(set.name);
                                                    }}
                                                    onOpen={() => {
                                                        router.push(`/flashcards?setId=${set.id}`);
                                                    }}
                                                />
                                            ))}

                                            {/* Individual Flashcards */}
                                            {flashcards.map((flashcard) => (
                                                <DroppableFlashcard
                                                    key={flashcard.id}
                                                    flashcard={flashcard}
                                                    onRemove={() => handleRemoveItem("flashcard", flashcard.id)}
                                                />
                                            ))}
                                        </div>

                                        <DragOverlay dropAnimation={{
                                            duration: 250,
                                            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                                        }}>
                                            {activeId && activeFlashcard && (
                                                <div className="relative bg-white rounded-3xl p-6 shadow-2xl scale-105 cursor-grabbing">
                                                    {/* Handle */}
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white w-12 h-6 rounded-full flex items-center justify-center shadow-lg">
                                                        <GripHorizontal className="w-4 h-4" />
                                                    </div>

                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide font-poppins">
                                                                {activeFlashcard.topic}
                                                            </span>
                                                        </div>
                                                        <div className="p-2">
                                                            <Trash2 className="w-4 h-4 text-gray-300" />
                                                        </div>
                                                    </div>

                                                    <h3 className="font-poppins font-medium text-gray-900 mb-2 line-clamp-2">
                                                        {activeFlashcard.question}
                                                    </h3>

                                                    <p className="text-sm text-gray-500 font-poppins line-clamp-2">
                                                        {activeFlashcard.correct_answer}
                                                    </p>
                                                </div>
                                            )}
                                        </DragOverlay>
                                    </DndContext>
                                )}
                            </>
                        )}
                    </>
                ) : null}
            </div>

            {/* Edit Folder Modal */}
            <AnimatePresence>
                {showEditModal && folder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-caladea text-gray-900">Edit Folder</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rename Set Modal */}
            <AnimatePresence>
                {editingSet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                        onClick={() => setEditingSet(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-xl font-caladea text-gray-900">Rename Set</h2>
                                <button
                                    onClick={() => setEditingSet(null)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Set Name
                                    </label>
                                    <Input
                                        value={newSetName}
                                        onChange={(e) => setNewSetName(e.target.value)}
                                        className="h-12 rounded-xl border-gray-200 font-poppins"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleUpdateSet();
                                        }}
                                    />
                                </div>

                                <Button
                                    onClick={handleUpdateSet}
                                    disabled={!newSetName.trim()}
                                    className="w-full h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Flashcard Modal */}
            <AnimatePresence>
                {showAddFlashcardModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                        onClick={() => setShowAddFlashcardModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                                <div>
                                    <h2 className="text-xl font-caladea text-gray-900">Create Flashcard</h2>
                                    <p className="text-sm text-gray-500 font-poppins mt-1">Add your own custom flashcard</p>
                                </div>
                                <button
                                    onClick={() => setShowAddFlashcardModal(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Question <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={newFlashcardQuestion}
                                        onChange={(e) => setNewFlashcardQuestion(e.target.value)}
                                        placeholder="Enter your question here..."
                                        className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 font-poppins text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Answer <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={newFlashcardAnswer}
                                        onChange={(e) => setNewFlashcardAnswer(e.target.value)}
                                        placeholder="Enter the correct answer..."
                                        className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-gray-200 font-poppins text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                                        Explanation <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        value={newFlashcardExplanation}
                                        onChange={(e) => setNewFlashcardExplanation(e.target.value)}
                                        placeholder="Add an explanation to help understand the answer..."
                                        className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-gray-200 font-poppins text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => setShowAddFlashcardModal(false)}
                                        variant="outline"
                                        className="flex-1 h-12 rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 font-poppins"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateManualFlashcard}
                                        disabled={!newFlashcardQuestion.trim() || !newFlashcardAnswer.trim() || creatingFlashcard}
                                        className="flex-1 h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800 font-poppins disabled:opacity-50"
                                    >
                                        {creatingFlashcard ? (
                                            <span className="flex items-center gap-2">
                                                <RotateCw className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                Create Flashcard
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
