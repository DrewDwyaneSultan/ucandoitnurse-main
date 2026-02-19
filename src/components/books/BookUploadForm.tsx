"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { UsageLimitModal, isRateLimitError } from "@/components/ui/usage-limit-modal";
import { Upload, FileText, X, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface BookUploadFormProps {
    userId: string;
    onUploadComplete?: (book: { id: string; title: string }) => void;
}

type UploadStep = "idle" | "uploading" | "processing" | "embedding" | "complete" | "error";

export function BookUploadForm({ userId, onUploadComplete }: BookUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [step, setStep] = useState<UploadStep>("idle");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
            setTitle(droppedFile.name.replace(/\.pdf$/i, ""));
            setError(null);
        } else {
            setError("Please upload a PDF file");
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== "application/pdf") {
                setError("Please upload a PDF file");
                return;
            }
            if (selectedFile.size > 50 * 1024 * 1024) {
                setError("File too large. Maximum size is 50MB");
                return;
            }
            setFile(selectedFile);
            setTitle(selectedFile.name.replace(/\.pdf$/i, ""));
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setError(null);
        setStep("uploading");
        setProgress(10);

        try {
            // Step 1: Upload file directly to Supabase storage (bypass server limit)
            const bookId = crypto.randomUUID();
            const fileName = `${userId}/books/${bookId}.pdf`;
            const bookTitle = title || file.name.replace(/\.pdf$/i, "");

            const { error: uploadError } = await supabase.storage
                .from("books")
                .upload(fileName, file, {
                    contentType: "application/pdf",
                });

            if (uploadError) {
                throw new Error("Failed to upload file: " + uploadError.message);
            }

            // create book record
            const { data: book, error: dbError } = await supabase
                .from("books")
                .insert({
                    id: bookId,
                    user_id: userId,
                    title: bookTitle,
                    file_path: fileName,
                    status: "processing",
                })
                .select()
                .single();

            if (dbError || !book) {
                await supabase.storage.from("books").remove([fileName]);
                throw new Error("Failed to create book record: " + (dbError?.message || "unknown"));
            }

            setProgress(33);
            setStep("processing");

            // Step 2: Process PDF (extract text, chunk)
            const processRes = await fetch("/api/books/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId: book.id, userId }),
            });

            if (!processRes.ok) {
                const data = await processRes.json();
                throw new Error(data.error || "Processing failed");
            }

            setProgress(66);
            setStep("embedding");

            // Step 3: Generate embeddings
            const embedRes = await fetch("/api/books/embed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookId: book.id, userId }),
            });

            if (!embedRes.ok) {
                const data = await embedRes.json();
                throw new Error(data.error || "Embedding failed");
            }

            setProgress(100);
            setStep("complete");

            onUploadComplete?.({ id: book.id, title: book.title });

            // Reset form after short delay
            setTimeout(() => {
                setFile(null);
                setTitle("");
                setStep("idle");
                setProgress(0);
            }, 2000);
        } catch (err) {
            console.error("Upload error:", err);

            // Check if it's a rate limit error
            if (isRateLimitError(err)) {
                setShowLimitModal(true);
            }

            setError(err instanceof Error ? err.message : "Upload failed");
            setStep("error");
        }
    };

    const clearFile = () => {
        setFile(null);
        setTitle("");
        setError(null);
        setStep("idle");
        setProgress(0);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const getStepMessage = () => {
        switch (step) {
            case "uploading":
                return "Uploading PDF";
            case "processing":
                return "Extracting text and creating chunks";
            case "embedding":
                return "Generating embeddings";
            case "complete":
                return "Book ready for flashcard generation";
            case "error":
                return error || "An error occurred";
            default:
                return "";
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* Drag and Drop Zone */}
            <div
                className={`
                    relative group border border-dashed rounded-3xl p-10 text-center transition-all duration-300
                    ${dragActive ? "border-gray-900 bg-gray-50 scale-[1.01]" : "border-gray-200"}
                    ${file ? "bg-gray-50/50 border-gray-200" : "hover:border-gray-400 hover:bg-gray-50/50"}
                    ${step !== "idle" && step !== "error" ? "pointer-events-none opacity-60" : "cursor-pointer"}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {file ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-gray-900" />
                            </div>
                            <div className="text-center">
                                <p className="font-caladea text-lg text-gray-900">{file.name}</p>
                                <p className="text-sm text-gray-400 font-medium uppercase tracking-wide mt-1 font-poppins">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                            {step === "idle" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearFile();
                                    }}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-4 mt-2 font-poppins"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Remove File
                                </Button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Upload className="w-8 h-8 text-gray-500" />
                            </div>
                            <div>
                                <p className="font-caladea text-xl text-gray-900">Drop your PDF here</p>
                                <p className="text-sm text-gray-400 font-medium mt-2 font-poppins">
                                    or click to browse • Max 50MB
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Title Input */}
            <AnimatePresence>
                {file && step === "idle" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-8 space-y-3"
                    >
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1 font-poppins">Book Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter book title"
                            className="h-12 rounded-xl border-gray-200 bg-white focus:ring-gray-900/10 focus:border-gray-900 transition-all font-caladea text-lg"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress */}
            {step !== "idle" && step !== "error" && (
                <div className="mt-8 space-y-4">
                    <Progress value={progress} className="h-2 bg-gray-100" />
                    <div className="flex items-center justify-center gap-3 text-sm">
                        {step === "complete" ? (
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            </div>
                        ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
                        )}
                        <span className={`font-medium font-poppins ${step === "complete" ? "text-green-600" : "text-gray-600"}`}>
                            {getStepMessage()}
                        </span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && step === "error" && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm text-center font-medium font-poppins"
                >
                    {error}
                </motion.div>
            )}

            {/* Upload Button */}
            <div className="mt-8 flex gap-4">
                {step === "error" && (
                    <Button
                        variant="outline"
                        onClick={clearFile}
                        className="flex-1 h-12 rounded-full border-gray-200 hover:bg-gray-50 font-poppins"
                    >
                        Try Again
                    </Button>
                )}
                <Button
                    onClick={handleUpload}
                    disabled={!file || (step !== "idle" && step !== "error")}
                    className="flex-1 h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 shadow-lg shadow-gray-900/10 transition-all font-poppins"
                >
                    {step === "idle" ? (
                        <>
                            Upload Book <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    ) : step === "complete" ? (
                        "Done"
                    ) : (
                        "Processing"
                    )}
                </Button>
            </div>

            {/* Usage Limit Modal */}
            <UsageLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                onUpgrade={() => {
                    // no pricing page anymore – all features are free
                    toast.info("All features are free – just upload your PDF!");
                }}
            />
        </div>
    );
}
