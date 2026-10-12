import type { NextConfig } from "next";

// View transitions (React <ViewTransition>) work in the App Router with no
// configuration as of Next 16.3 — the bundled React canary ships them.
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
