import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-actions-refined/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  webServer: [],
  outputDir: "../../test-results/playwright/mobile-feed-avatar-follow",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `../../docs/mobile-feed-avatar-follow/${process.env.AVATAR_BEFORE === "1" ? "before" : "after"}-results.json`,
      },
    ],
  ],
});
