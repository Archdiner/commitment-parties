import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { Footer } from "@/components/Footer";

// NOTE: PrivyProvider removed during pre-launch/landing-page mode.
// Restore it when re-enabling the full app:
//   import { PrivyProvider } from "@/components/providers/PrivyProvider";
//   Wrap children with <PrivyProvider>...</PrivyProvider>

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CommitMint - AI-Powered Accountability",
  description: "Turn commitments into capital. Stake real money on your goals and let AI verify your progress. Coming soon.",
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
        <NavbarWrapper />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
