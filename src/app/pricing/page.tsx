"use client";

import Link from "next/link";

// pricing page removed; free notice
export default function PricingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="max-w-xl text-center">
                <h1 className="text-4xl font-bold mb-4">Everything's Free!</h1>
                <p className="text-lg text-gray-600 mb-6">
                    We removed all paywalls – feel free to explore and generate as many flashcards as you like.
                </p>
                <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
