import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "postgres.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  outputDir: "../../test-results/postgres-public-ui",
  use: {
    baseURL: "http://127.0.0.1:3419",
    launchOptions: {
      executablePath: process.env.MYCKEO_CHROMIUM_PATH || undefined,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
