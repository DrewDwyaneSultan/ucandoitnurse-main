"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Lock, X } from "lucide-react";
import { AI_MODELS, type AIModelId, DEFAULT_MODEL } from "@/lib/ai-models";
import Image from "next/image";

interface ModelSelectorProps {
    selectedModel: AIModelId;
    onModelChange: (model: AIModelId) => void;
    disabled?: boolean;
    variant?: "light" | "dark";
    onUpgradeClick?: () => void;
}

// Models that require Pro or Unlimited subscription
// premium model gating removed, all models unlocked

export function ModelSelector({
    selectedModel,
    onModelChange,
    disabled,
    variant = "light",
    onUpgradeClick
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS.find(m => m.id === DEFAULT_MODEL) || AI_MODELS[0];

    const isDark = variant === "dark";

    const isModelLocked = (modelId: AIModelId) => {
        return false; // no locks, all models available
    };

    const handleModelSelect = (modelId: AIModelId) => {
        if (isModelLocked(modelId)) {
            onUpgradeClick?.();
            return;
        }
        onModelChange(modelId);
        setIsOpen(false);
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all
                    ${disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }
                    ${isDark
                        ? "bg-white/10 border-white/20 text-white hover:bg-white/15"
                        : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                    }
                `}
            >
                <div className="flex items-center gap-3">
                    <Image
                        src="/gemini.png"
                        alt="Gemini"
                        width={24}
                        height={24}
                        className="rounded"
                    />
                    <div className="text-left">
                        <p className={`text-sm font-medium font-poppins ${isDark ? "text-white" : "text-gray-900"}`}>
                            {currentModel.name}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
            </button>

            {/* Bottom Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 z-50"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-[#FDFBF9] rounded-t-2xl max-h-[80vh] overflow-hidden"
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-gray-300 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src="/logo/hly.svg"
                                        alt="Gemini"
                                        width={28}
                                        height={28}
                                        className="rounded"
                                    />
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 font-poppins">
                                            AI Model
                                        </h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Model List */}
                            <div className="p-4 space-y-2 overflow-y-auto max-h-[55vh]">
                                {AI_MODELS.map((model) => {
                                    const isSelected = model.id === selectedModel;
                                    const isLocked = isModelLocked(model.id);

                                    return (
                                        <button
                                            key={model.id}
                                            onClick={() => handleModelSelect(model.id)}
                                            className={`
                                                w-full flex items-center gap-4 p-4 rounded-xl transition-all
                                                ${isSelected
                                                    ? "bg-[#5B79A6] text-white"
                                                    : isLocked
                                                        ? "bg-gray-100 text-gray-400"
                                                        : "bg-white border border-gray-200 text-gray-900 hover:border-gray-300"
                                                }
                                            `}
                                        >
                                            <Image
                                                src="/gemini.png"
                                                alt="Gemini"
                                                width={28}
                                                height={28}
                                                className={`rounded ${isLocked ? "opacity-40" : ""}`}
                                            />

                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`font-medium font-poppins ${isSelected ? "text-white" : isLocked ? "text-gray-400" : "text-gray-900"
                                                        }`}>
                                                        {model.name}
                                                    </p>
                                                    {/* {model.isNew && (
                                                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-poppins font-medium">
                                                            New
                                                        </span>
                                                    )} */}
                                                    {model.recommended && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-poppins font-medium ${isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                                                            Default
                                                        </span>
                                                    )}
                                                                </div>
                                                <p className={`text-sm font-poppins ${isSelected ? "text-white/70" : "text-gray-500"
                                                    }`}>
                                                    {isLocked
                                                        ? "Upgrade to Pro"
                                                        : model.description
                                                    }
                                                </p>
                                            </div>

                                            {isSelected && !isLocked && (
                                                <Check className="w-5 h-5 text-white flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-white border-t border-gray-200">
                                <p className="text-xs text-gray-400 font-poppins text-center">
                                    Selection saved automatically
                                </p>
                            </div>

                            {/* Safe area for mobile */}
                            <div className="h-safe-area-inset-bottom bg-white" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Hook for managing model preference
export function useModelPreference() {
    const [selectedModel, setSelectedModel] = useState<AIModelId>(DEFAULT_MODEL);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("preferredModel") as AIModelId;
            if (saved && AI_MODELS.some(m => m.id === saved)) {
                setSelectedModel(saved);
            }
            setIsLoaded(true);
        }
    }, []);

    const setModel = (model: AIModelId) => {
        setSelectedModel(model);
        if (typeof window !== "undefined") {
            localStorage.setItem("preferredModel", model);
        }
    };

    return { selectedModel, setModel, isLoaded };
}
