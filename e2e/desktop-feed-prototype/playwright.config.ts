import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "desktop.spec.ts", workers: 1, timeout: 120000,
  expect: { timeout: 30000 }, reporter: [["list"]],
  outputDir: "../../test-results/desktop-feed-prototype",
  use: { baseURL: "http://127.0.0.1:3400", contextOptions: { reducedMotion: "reduce" },
    launchOptions: { executablePath: process.env.AUDIT_CHROMIUM_PATH || "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome" } },
});
