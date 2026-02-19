"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical, Trash2, Loader2, Calendar, Origami, BookDashed } from "lucide-react";
import type { Book } from "@/types/database.types";

interface BookCardProps {
    book: Book;
    onDelete: (bookId: string) => void;
}

export function BookCard({ book, onDelete }: BookCardProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        onDelete(book.id);
    };

    const getStatusIndicator = () => {
        switch (book.status) {
            case "processing":
                return (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs font-medium uppercase tracking-wider font-poppins">Processing</span>
                    </div>
                );
            case "ready":
                return (
                    <div className="flex items-center gap-2 text-gray-900">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium uppercase tracking-wider font-poppins">Ready</span>
                    </div>
                );
            case "failed":
                return (
                    <div className="flex items-center gap-2 text-red-600">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-medium uppercase tracking-wider font-poppins">Failed</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <>
            <motion.div
                whileHover={{ scale: 0.98 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                onClick={() => router.push(`/books/${book.id}`)}
                className="group h-full flex flex-col bg-[#F3F4F6] rounded-3xl p-6 sm:p-8 relative overflow-hidden cursor-pointer"
            >
                {/* Background gradient on hover */}
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-[#E5E7EB] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                            <BookDashed className="w-5 h-5 text-gray-900 rotate-[30deg] group-hover:rotate-[10deg] group-hover:scale-110 transition-all duration-500" />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-white/50 text-gray-400 hover:text-gray-900"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-gray-200 p-1">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600 focus:text-red-600 rounded-lg cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Title */}
                    <h3 className="font-caladea text-2xl text-gray-900 mb-3 line-clamp-2 leading-tight" title={book.title}>
                        {book.title}
                    </h3>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-gray-500 mb-auto">
                        <span className="flex items-center gap-1.5 text-sm font-poppins">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(book.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm font-poppins">
                            <Origami className="w-3.5 h-3.5" />
                            {book.total_chunks}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50">
                        {getStatusIndicator()}

                        <span className="text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors font-poppins">
                            Open →
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="rounded-3xl border-gray-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-caladea text-xl">Delete book?</AlertDialogTitle>
                        <AlertDialogDescription className="font-poppins">
                            This will permanently delete &quot;{book.title}&quot; and all associated flashcards.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="rounded-full border-gray-200 font-poppins">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full font-poppins"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
