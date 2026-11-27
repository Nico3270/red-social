import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-avatar-follow-badge-refined/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  webServer: [],
  outputDir: "../../test-results/playwright/mobile-feed-commerce-row-compact",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `../../docs/mobile-feed-commerce-row-compact/${process.env.COMMERCE_REPORT || (process.env.COMMERCE_BEFORE === "1" ? "before" : "after")}-results.json`,
      },
    ],
  ],
});
