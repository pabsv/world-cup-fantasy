import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile exists in the home dir).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
