import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components + Partial Prefetching: the static shell streams first and
  // live GitHub data fills in behind Suspense boundaries.
  cacheComponents: true,
  partialPrefetching: true,

  // Dev-only: allow the sandboxed preview origin to talk to `next dev`.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "*.vercel.app"],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
