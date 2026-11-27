import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "public-ui.spec.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  outputDir: "../../test-results/public-ui-audit",
  use: {
    baseURL: "http://127.0.0.1:3400",
    launchOptions: {
      executablePath: process.env.AUDIT_CHROMIUM_PATH,
    },
    screenshot: "only-on-failure",
  },
});
