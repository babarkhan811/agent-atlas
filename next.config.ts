import type { NextConfig } from "next";

// Static export until M5 (server-side gating moves the app to Vercel).
// BASE_PATH is "/agent-atlas" on GitHub Pages and empty everywhere else.
const basePath = process.env.BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
