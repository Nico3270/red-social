import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-implementation/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch:
    process.env.FEED_RESPONSIVE_REFERENCE === "1"
      ? "reference.spec.ts"
      : "responsive.spec.ts",
  workers: 1,
  outputDir: "../../test-results/playwright/mobile-feed-responsive",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.FEED_RESPONSIVE_REFERENCE === "1"
            ? "../../docs/mobile-feed-responsive/reference-results.json"
            : "../../docs/mobile-feed-responsive/results.json",
      },
    ],
  ],
});
