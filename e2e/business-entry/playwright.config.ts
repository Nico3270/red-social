import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "business-entry.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: [["list"]],
  outputDir: "../../test-results/business-entry",
  use: {
    actionTimeout: 20000,
    navigationTimeout: 30000,
    baseURL: "http://127.0.0.1:3421",
    launchOptions: {
      executablePath: process.env.MYCKEO_CHROMIUM_PATH || undefined,
    },
    screenshot: "only-on-failure",
  },
});
