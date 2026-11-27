import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-avatar-follow/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  webServer: [],
  outputDir: "../../test-results/playwright/mobile-feed-avatar-follow-overlay",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `../../docs/mobile-feed-avatar-follow-overlay/${process.env.OVERLAY_BEFORE === "1" ? "before" : "after"}-results.json`,
      },
    ],
  ],
});
