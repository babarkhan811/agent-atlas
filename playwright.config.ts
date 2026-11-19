import { defineConfig, devices } from "@playwright/test";

// Locally, PW_CHANNEL=msedge reuses an installed browser instead of downloading one.
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", ...(channel ? { channel } : {}) },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, ...(channel ? { channel } : {}) }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"], ...(channel ? { channel } : {}) }, testMatch: /mobile\.spec/ },
  ],
  webServer: { command: "node tests/serve.mjs out 3100", url: "http://localhost:3100/", reuseExistingServer: !process.env.CI },
});
