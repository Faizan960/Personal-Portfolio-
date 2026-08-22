import type { NextConfig } from "next";

/**
 * Static export so the portfolio can be hosted anywhere — Vercel, Netlify,
 * GitHub Pages, or any plain static host. No server runtime required.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    // `next/image` optimisation needs a server; static export uses the raw files.
    unoptimized: true,
  },
  // Emits `/about/index.html` style paths, which every static host understands.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
