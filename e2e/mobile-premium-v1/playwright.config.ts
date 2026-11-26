import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "mobile.spec.ts",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  reporter: [["list"]],
  outputDir: "../../test-results/mobile-premium-v1",
  use: {
    baseURL: "http://127.0.0.1:3400",
    actionTimeout: 15000,
    navigationTimeout: 90000,
    contextOptions: { reducedMotion: "reduce" },
    launchOptions: {
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    },
  },
});
