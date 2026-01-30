import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { OnboardingGate } from "@/components/auth/OnboardingGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Alonit",
    description: "A modern Q&A platform for Israeli youth",
    manifest: "/manifest.json",
    icons: {
        icon: "/icon.svg",
        apple: "/icon.svg",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="he" dir="rtl">
            <body className={inter.className}>
                <AuthProvider>
                    <ToastProvider>
                        <Header />
                        <OnboardingGate>
                            {children}
                        </OnboardingGate>
                        <MobileNav />
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

