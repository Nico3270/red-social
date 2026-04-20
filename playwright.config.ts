import { defineConfig, devices } from "@playwright/test";

const host = process.env.SMOKE_HOST || "127.0.0.1";
const port = Number(process.env.SMOKE_PORT || 3100);
const baseURL = process.env.SMOKE_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: "./e2e/smoke",
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/.generated/**", "**/lib/**", "**/generate-fixtures.ts"],
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "test-results/playwright",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev --hostname ${host} --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});