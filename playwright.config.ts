import { defineConfig, devices } from "@playwright/test";

// Locally, PW_CHANNEL=msedge reuses an installed browser instead of downloading one.
const channel = process.env.PW_CHANNEL;
// Screenshot tests compare against Linux baselines, so they only run when VISUAL=1 (CI on Linux).
const visual = process.env.VISUAL === "1";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", ...(channel ? { channel } : {}) },
  projects: [
    { name: "desktop", testDir: "tests/e2e", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, ...(channel ? { channel } : {}) }, testIgnore: /mobile\.spec/ },
    { name: "mobile", testDir: "tests/e2e", use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) }, testMatch: /mobile\.spec/ },
    ...(visual ? [{ name: "visual", testDir: "tests/visual", use: { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) } }] : []),
  ],
  webServer: { command: "node tests/serve.mjs out 3100", url: "http://localhost:3100/", reuseExistingServer: !process.env.CI },
});
