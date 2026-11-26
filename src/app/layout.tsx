import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { PublicChrome } from "@/components/PublicChrome";
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
        {/*
          PublicChrome renders the ambient background, navigation, <main>, and
          footer for the public portfolio, wrapping {children} inside <main>.
          On /admin/* routes it passes children through unwrapped so the admin
          layout can supply its own full-screen shell.
        */}
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
