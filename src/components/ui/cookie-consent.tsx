"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cookie, Shield, BarChart3, Settings2 } from "lucide-react";
import { Button } from "./button";
import { setCookie, getCookie } from "@/lib/cookies";

// Cookie consent types
interface CookiePreferences {
    necessary: boolean; // Always true, cannot be disabled
    analytics: boolean;
    preferences: boolean;
}

const CONSENT_COOKIE_NAME = "cookie_consent";
const DEFAULT_PREFERENCES: CookiePreferences = {
    necessary: true,
    analytics: false,
    preferences: false,
};

// Context for cookie consent
interface CookieConsentContextType {
    hasConsented: boolean;
    preferences: CookiePreferences;
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    acceptAll: () => void;
    rejectAll: () => void;
    savePreferences: (prefs: CookiePreferences) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export function useCookieConsent() {
    const context = useContext(CookieConsentContext);
    if (!context) {
        throw new Error("useCookieConsent must be used within CookieConsentProvider");
    }
    return context;
}

// Provider component
export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const [hasConsented, setHasConsented] = useState(true); // Default true to prevent flash
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
    const [showModal, setShowModal] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Check for existing consent on mount
    useEffect(() => {
        const consent = getCookie(CONSENT_COOKIE_NAME);
        if (consent) {
            try {
                const parsed = JSON.parse(consent) as CookiePreferences;
                setPreferences(parsed);
                setHasConsented(true);
            } catch {
                setHasConsented(false);
                setShowBanner(true);
            }
        } else {
            setHasConsented(false);
            setShowBanner(true);
        }
        setIsLoaded(true);
    }, []);

    const savePreferences = useCallback((prefs: CookiePreferences) => {
        const finalPrefs = { ...prefs, necessary: true }; // Necessary always true
        setCookie(CONSENT_COOKIE_NAME, JSON.stringify(finalPrefs), 365);
        setPreferences(finalPrefs);
        setHasConsented(true);
        setShowModal(false);
        setShowBanner(false);
    }, []);

    const acceptAll = useCallback(() => {
        savePreferences({ necessary: true, analytics: true, preferences: true });
    }, [savePreferences]);

    const rejectAll = useCallback(() => {
        savePreferences({ necessary: true, analytics: false, preferences: false });
    }, [savePreferences]);

    return (
        <CookieConsentContext.Provider
            value={{
                hasConsented,
                preferences,
                showModal,
                setShowModal,
                acceptAll,
                rejectAll,
                savePreferences,
            }}
        >
            {children}
            {isLoaded && showBanner && !showModal && (
                <CookieBanner onManage={() => setShowModal(true)} onAccept={acceptAll} />
            )}
            <CookieConsentModal />
        </CookieConsentContext.Provider>
    );
}

// Cookie Banner (shows on first visit)
function CookieBanner({ onManage, onAccept }: { onManage: () => void; onAccept: () => void }) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 p-6 md:flex md:items-center md:justify-between gap-6">
                <div className="flex items-start gap-4 mb-4 md:mb-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <Cookie className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900 mb-1">We use cookies</h3>
                        <p className="text-sm text-gray-500">
                            We use cookies to enhance your experience and remember your progress.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={onManage}
                        className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 text-sm h-10"
                    >
                        Manage
                    </Button>
                    <Button
                        onClick={onAccept}
                        className="rounded-full bg-gray-900 text-white hover:bg-gray-800 text-sm h-10"
                    >
                        Accept All
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

// Cookie Consent Modal
export function CookieConsentModal() {
    const { showModal, setShowModal, preferences, savePreferences, acceptAll, rejectAll } = useCookieConsent();
    const [localPrefs, setLocalPrefs] = useState<CookiePreferences>(preferences);

    // Sync with context preferences when modal opens
    useEffect(() => {
        if (showModal) {
            setLocalPrefs(preferences);
        }
    }, [showModal, preferences]);

    if (!showModal) return null;

    const cookieTypes = [
        {
            key: "necessary" as const,
            icon: Shield,
            title: "Necessary",
            description: "Essential for the website to function. Cannot be disabled.",
            required: true,
        },
        {
            key: "preferences" as const,
            icon: Settings2,
            title: "Preferences",
            description: "Remember your settings, study progress, and preferences.",
            required: false,
        },
        {
            key: "analytics" as const,
            icon: BarChart3,
            title: "Analytics",
            description: "Help us understand how you use the app to improve it.",
            required: false,
        },
    ];

    return (
        <AnimatePresence>
            {showModal && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-auto"
                    >
                        <div className="bg-[#FDFBF9] rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Header */}
                            <div className="p-6 pb-0 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
                                        <Cookie className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-caladea text-gray-900">Cookie Settings</h2>
                                        <p className="text-sm text-gray-500">Manage your preferences</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {cookieTypes.map((type) => (
                                    <div
                                        key={type.key}
                                        className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                            <type.icon className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-medium text-gray-900">{type.title}</h3>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={localPrefs[type.key]}
                                                        disabled={type.required}
                                                        onChange={(e) =>
                                                            setLocalPrefs((prev) => ({
                                                                ...prev,
                                                                [type.key]: e.target.checked,
                                                            }))
                                                        }
                                                        className="sr-only peer"
                                                    />
                                                    <div className={`w-11 h-6 rounded-full peer-focus:outline-none transition-colors ${type.required
                                                            ? "bg-gray-900 cursor-not-allowed"
                                                            : localPrefs[type.key]
                                                                ? "bg-gray-900"
                                                                : "bg-gray-200"
                                                        }`}>
                                                        <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${localPrefs[type.key] ? "translate-x-5" : "translate-x-0"
                                                            }`} />
                                                    </div>
                                                </label>
                                            </div>
                                            <p className="text-sm text-gray-500">{type.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="outline"
                                    onClick={rejectAll}
                                    className="flex-1 h-12 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
                                >
                                    Reject All
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => savePreferences(localPrefs)}
                                    className="flex-1 h-12 rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
                                >
                                    Save Preferences
                                </Button>
                                <Button
                                    onClick={acceptAll}
                                    className="flex-1 h-12 rounded-full bg-gray-900 text-white hover:bg-gray-800"
                                >
                                    Accept All
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
