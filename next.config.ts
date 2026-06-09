import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project (a stray ~/yarn.lock
  // otherwise causes Next to infer the wrong root).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
