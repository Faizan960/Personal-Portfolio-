import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { meta, personal } from "@/data/portfolio";

/**
 * Self-hosted at build time by `next/font` — no runtime request to Google, no
 * layout shift, and `display: swap` so text is never invisible.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  applicationName: `${personal.name} — Portfolio`,
  authors: [{ name: personal.name }],
  creator: personal.name,
  keywords: [
    personal.name,
    "Computer Engineering",
    "Web Development",
    "Artificial Intelligence",
    "Cloud Computing",
    "DevOps",
    "Portfolio",
  ],
  openGraph: {
    type: "profile",
    title: meta.title,
    description: meta.description,
    siteName: `${personal.name} — Portfolio`,
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/*
          Without JavaScript, IntersectionObserver never runs and scroll-reveal
          elements would stay at opacity 0. This forces them visible so the page
          is fully readable with JS disabled or still loading.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="antialiased">
        <AmbientBackground />
        <Navigation />

        {/* Sits above the fixed ambient layer. */}
        <main
          id="main"
          className="relative"
          style={{ zIndex: "var(--z-content)" }}
        >
          {children}
        </main>

        {/* Outside <main>, as a site-level landmark rather than page content. */}
        <div className="relative" style={{ zIndex: "var(--z-content)" }}>
          <Footer />
        </div>

        <Analytics />
      </body>
    </html>
  );
}
