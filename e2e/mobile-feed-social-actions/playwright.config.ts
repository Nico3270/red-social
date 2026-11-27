import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-final-correction/playwright.config";

const phase = process.env.FEED_SOCIAL_PHASE || "B";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "social.spec.ts",
  outputDir: "../../test-results/playwright/mobile-feed-social-actions",
  reporter: [["list"], ["json", { outputFile: `../../docs/mobile-feed-social-actions/${phase}-results.json` }]],
});
