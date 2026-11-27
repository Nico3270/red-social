import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const installedShell = `${homedir()}/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;
const executablePath =
  process.env.ASSISTED_TEST_CHROMIUM ||
  (existsSync(installedShell) ? installedShell : undefined);
const artifacts =
  process.env.ASSISTED_TEST_ARTIFACT_DIR || "/tmp/myckeo-onboarding-v1";
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 600_000,
  expect: { timeout: 90_000 },
  use: {
    baseURL: "http://127.0.0.1:5487",
    actionTimeout: 90000,
    navigationTimeout: 120000,
    headless: true,
    launchOptions: { executablePath },
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: join(artifacts, "browser-results.json") }],
  ],
  outputDir: join(artifacts, "playwright-output"),
});
