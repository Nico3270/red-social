import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-avatar-follow-overlay/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  webServer: [],
  outputDir:
    "../../test-results/playwright/mobile-feed-avatar-follow-badge-refined",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `../../docs/mobile-feed-avatar-follow-badge-refined/${process.env.BADGE_BEFORE === "1" ? "before" : "after"}-results.json`,
      },
    ],
  ],
});
