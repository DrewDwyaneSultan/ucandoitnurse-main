"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function ReminderNotification() {
    const { user } = useAuth();
    const [showPrompt, setShowPrompt] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [mounted, setMounted] = useState(false);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Register service worker and check subscription status
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        const registerSW = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw-push.js");
                setSwRegistration(registration);

                // Check if already subscribed
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.error("SW registration failed:", error);
            }
        };

        registerSW();
    }, []);

    const showInAppToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
    };

    // Subscribe to push notifications
    const subscribeToPush = useCallback(async () => {
        if (!swRegistration || !VAPID_PUBLIC_KEY || !user) {
            showInAppToast("Push not available");
            return;
        }

        setIsLoading(true);

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                showInAppToast("Permission denied");
                setIsLoading(false);
                return;
            }

            // Subscribe to push
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save subscription to backend
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: subscription.toJSON() })
            });

            if (response.ok) {
                setIsSubscribed(true);
                localStorage.setItem("pushEnabled", "true");
                showInAppToast("Reminders enabled!");
                setShowPrompt(false);
            } else {
                throw new Error("Failed to save subscription");
            }
        } catch (error) {
            console.error("Subscribe error:", error);
            showInAppToast("Failed to enable");
        } finally {
            setIsLoading(false);
        }
    }, [swRegistration, user]);

    // Unsubscribe from push notifications
    const unsubscribeFromPush = useCallback(async () => {
        if (!swRegistration) return;

        setIsLoading(true);

        try {
            const subscription = await swRegistration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from browser
                await subscription.unsubscribe();

                // Remove from backend
                await fetch("/api/push/subscribe", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                });
            }

            setIsSubscribed(false);
            localStorage.removeItem("pushEnabled");
            showInAppToast("Reminders disabled");
        } catch (error) {
            console.error("Unsubscribe error:", error);
            showInAppToast("Failed to disable");
        } finally {
            setIsLoading(false);
        }
    }, [swRegistration]);

    const toggleReminders = () => {
        if (isSubscribed) {
            unsubscribeFromPush();
        } else {
            setShowPrompt(true);
        }
    };

    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        return null;
    }

    const modalContent = (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowPrompt(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                                <Bell className="w-6 h-6 text-white" />
                            </div>
                            <button
                                onClick={() => setShowPrompt(false)}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-xl font-caladea text-gray-900 mb-2">
                            Enable reminders?
                        </h3>
                        <p className="text-sm text-gray-500 font-poppins mb-4">
                            Get notified even when the app is closed.
                        </p>

                        <ul className="text-xs text-gray-400 font-poppins space-y-1 mb-6">
                            <li className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                Works in background
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                Browser closed? Still works
                            </li>
                            <li className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                Reminds when cards are due
                            </li>
                        </ul>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowPrompt(false)}
                                className="flex-1 rounded-full border-gray-200 font-poppins"
                                disabled={isLoading}
                            >
                                Later
                            </Button>
                            <Button
                                onClick={subscribeToPush}
                                className="flex-1 rounded-full bg-gray-900 text-white font-poppins"
                                disabled={isLoading}
                            >
                                {isLoading ? "Enabling..." : "Enable"}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const toastContent = (
        <AnimatePresence>
            {showToast && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-3"
                >
                    <Bell className="w-4 h-4" />
                    <span className="text-sm font-poppins">{toastMessage}</span>
                    <button
                        onClick={() => setShowToast(false)}
                        className="p-1 hover:bg-white/10 rounded-full"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <Button
                variant="outline"
                onClick={toggleReminders}
                disabled={isLoading}
                className="rounded-full w-9 h-9 sm:w-10 sm:h-10 p-0 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
            >
                {isSubscribed ? (
                    <Bell className="w-4 h-4" />
                ) : (
                    <BellOff className="w-4 h-4" />
                )}
            </Button>

            {mounted && createPortal(modalContent, document.body)}
            {mounted && createPortal(toastContent, document.body)}
        </>
    );
}
