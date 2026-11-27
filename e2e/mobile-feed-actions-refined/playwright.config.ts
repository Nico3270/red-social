import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-final-correction/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  webServer: [],
  outputDir: "../../test-results/playwright/mobile-feed-actions-refined",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `../../docs/mobile-feed-actions-refined/${process.env.REFINED_PHASE || "B"}-results.json`,
      },
    ],
  ],
});
