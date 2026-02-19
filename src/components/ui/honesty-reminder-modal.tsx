"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bird, X } from "lucide-react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";

interface HonestyReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDontShowAgain: () => void;
}

const LOCAL_STORAGE_KEY = "ucandoit_honesty_reminder_hidden";

export function useHonestyReminder() {
    const [shouldShow, setShouldShow] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(true);

    React.useEffect(() => {
        // Check localStorage on mount
        const isHidden = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
        setShouldShow(!isHidden);
        setIsChecking(false);
    }, []);

    const hideForever = React.useCallback(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
        setShouldShow(false);
    }, []);

    const dismiss = React.useCallback(() => {
        setShouldShow(false);
    }, []);

    return { shouldShow, isChecking, hideForever, dismiss };
}

export function HonestyReminderModal({
    isOpen,
    onClose,
    onDontShowAgain,
}: HonestyReminderModalProps) {
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    const handleClose = () => {
        if (dontShowAgain) {
            onDontShowAgain();
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[100] bg-black/50 backdrop-blur-md"
                        style={{ margin: 0, padding: 0 }}
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            duration: 0.4,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
                    >
                        <div className="relative overflow-hidden rounded-3xl bg-[#FDFBF9] shadow-2xl border border-gray-100">
                            {/* Close button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="relative p-8 md:p-10">
                                {/* Icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                        type: "spring",
                                        damping: 15,
                                        stiffness: 200,
                                        delay: 0.1,
                                    }}
                                    className="mx-auto mb-8 w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center"
                                >
                                    <Bird className="w-8 h-8 text-white" />
                                </motion.div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="text-3xl md:text-4xl font-normal text-gray-900 mb-6 text-center tracking-tight font-caladea"
                                >
                                    A Quick Reminder
                                </motion.h2>

                                {/* Message */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="space-y-4 mb-10"
                                >
                                    <p className="text-gray-600 font-poppins leading-relaxed text-base text-center">
                                        When you flip the card and see the answer, be{" "}
                                        <span className="font-medium text-gray-900">honest with yourself</span>.
                                    </p>
                                    <p className="text-gray-500 font-poppins leading-relaxed text-base text-center">
                                        If you got it wrong, mark it wrong.{" "}
                                        <span className="italic">Don&apos;t fool yourself</span>—that&apos;s how real learning happens!
                                    </p>
                                    <p className="text-sm text-gray-400 font-poppins text-center pt-2">
                                        Every mistake is a step closer to mastery.
                                    </p>
                                </motion.div>

                                {/* Actions */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="space-y-5"
                                >
                                    <Button
                                        onClick={handleClose}
                                        className="w-full h-14 rounded-full bg-gray-900 text-white hover:bg-gray-800 hover:scale-[1.02] font-poppins font-medium text-base transition-all duration-300"
                                    >
                                        I&apos;m Ready to Learn
                                    </Button>

                                    {/* Don't show again checkbox */}
                                    <label className="flex items-center justify-center gap-3 cursor-pointer group">
                                        <Checkbox
                                            id="dont-show-again"
                                            checked={dontShowAgain}
                                            onCheckedChange={(checked) =>
                                                setDontShowAgain(checked === true)
                                            }
                                            className="border-gray-300 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                                        />
                                        <span className="text-sm text-gray-500 group-hover:text-gray-700 font-poppins transition-colors">
                                            Don&apos;t show this again
                                        </span>
                                    </label>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
