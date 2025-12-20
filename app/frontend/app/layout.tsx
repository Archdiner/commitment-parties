import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrivyProvider } from "@/components/providers/PrivyProvider";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { DevBanner } from "@/components/DevBanner";
import { HelpBar } from "@/components/HelpBar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CommitMint",
  description: "AI-Powered Accountability Protocol on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-white min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <PrivyProvider>
        <NavbarWrapper />
        <DevBanner />
        <HelpBar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        </PrivyProvider>
      </body>
    </html>
  );
}
