import type { NextConfig } from "next";

// View transitions (React <ViewTransition>) work in the App Router with no
// configuration as of Next 16.3 — the bundled React canary ships them.
const nextConfig: NextConfig = {
  // Dev only: lets a phone on the same home Wi-Fi load the dev server
  // (Next 16 blocks cross-origin dev assets by default). No effect in production.
  allowedDevOrigins: ["192.168.*.*"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
