import { defineConfig } from "@playwright/test";
import base from "../mobile-feed/playwright.config";

const phase = process.env.FEED_CORRECTION_BEFORE === "1" ? "before" : "after";

export default defineConfig(base, {
  testDir: ".",
  testMatch: "correction.spec.ts",
  workers: 1,
  timeout: 60000,
  webServer: undefined, // Reuse the user's running Next dev server; never stop it.
  outputDir: "../../test-results/playwright/mobile-feed-final-correction",
  use: { ...base.use, baseURL: "http://127.0.0.1:3000" },
  reporter: [
    ["list"],
    ["json", { outputFile: `../../docs/mobile-feed-final-correction/${phase}-results.json` }],
  ],
});
