"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CookieManager() {
    const [open, setOpen] = useState(false);
    const [preferences, setPreferences] = useState({
        essential: true,
        analytics: false,
        marketing: false,
    });

    // Load saved preferences on mount
    useEffect(() => {
        const saved = localStorage.getItem("cookie-preferences");
        if (saved) {
            try {
                setPreferences(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse cookie preferences", e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem("cookie-preferences", JSON.stringify(preferences));
        setOpen(false);
        toast.success("All set - your privacy, your rules!", {
            description: "Cookie settings saved perfectly."
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="hover:text-white transition-colors uppercase font-mono text-xs text-gray-600 text-left">
                    Cookies
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900 border-gray-200">
                <DialogHeader>
                    <DialogTitle className="font-caladea text-2xl">Cookie Preferences</DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Manage your cookie settings. Essential cookies are required for the site to function.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Essential */}
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="essential" className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Essential
                            </Label>
                            <span className="text-xs text-gray-500">
                                Required for basic functionality.
                            </span>
                        </div>
                        <Switch id="essential" checked={true} disabled />
                    </div>

                    {/* Analytics */}
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="analytics" className="font-medium leading-none cursor-pointer">
                                Analytics
                            </Label>
                            <span className="text-xs text-gray-500">
                                Help us improve our website.
                            </span>
                        </div>
                        <Switch
                            id="analytics"
                            checked={preferences.analytics}
                            onCheckedChange={(checked) =>
                                setPreferences((prev) => ({ ...prev, analytics: checked }))
                            }
                        />
                    </div>

                    {/* Marketing */}
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="marketing" className="font-medium leading-none cursor-pointer">
                                Marketing
                            </Label>
                            <span className="text-xs text-gray-500">
                                Personalized advertisements.
                            </span>
                        </div>
                        <Switch
                            id="marketing"
                            checked={preferences.marketing}
                            onCheckedChange={(checked) =>
                                setPreferences((prev) => ({ ...prev, marketing: checked }))
                            }
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} className="bg-gray-900 text-white hover:bg-gray-800 rounded-full">
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
