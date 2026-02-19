import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Caladea } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/components/ui/cookie-consent";
import "./globals.css";

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const caladea = Caladea({
  variable: "--font-caladea",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "HLY - Smart Nursing Study Companion",
    template: "%s | HLY",
  },
  description: "Your AI-powered study buddy for nursing exams. Upload textbooks, generate smart flashcards, and ace your PNLE exams with confidence.",
  keywords: [
    "nursing flashcards",
    "PNLE review",
    "nursing exam",
    "study app",
    "AI flashcards",
    "nursing student",
    "board exam review",
    "medical flashcards",
    "nursing education",
  ],
  authors: [{ name: "HLY Team" }],
  creator: "HLY",
  publisher: "HLY",
  applicationName: "HLY",
  icons: {
    icon: "/logo/hly.ico",
    apple: "/logo/hly.ico",
    shortcut: "/logo/hly.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "HLY - Smart Nursing Study Companion",
    description: "Your AI-powered study buddy for nursing exams. Generate smart flashcards from your textbooks and study smarter, not harder.",
    type: "website",
    url: "https://hly-beta.vercel.app",
    siteName: "HLY",
    locale: "en_US",
    images: [
      {
        url: "/logo/hly.png",
        width: 1200,
        height: 630,
        alt: "HLY - Smart Nursing Study Companion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HLY - Smart Nursing Study Companion",
    description: "Your AI-powered study buddy for nursing exams. Upload textbooks, generate flashcards, ace your exams!",
    images: ["/logo/hly.png"],
    creator: "@klyne_chrysler",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${caladea.variable} antialiased`}
      >
        <AuthProvider>
          <CookieConsentProvider>
            {children}
          </CookieConsentProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors duration={3000} />
      </body>
    </html>
  );
}

