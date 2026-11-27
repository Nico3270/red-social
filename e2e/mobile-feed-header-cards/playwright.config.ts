import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-final-correction/playwright.config";

const phase = process.env.FEED_HEADER_BEFORE === "1" ? "before" : "after";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "header.spec.ts",
  timeout: 60000,
  outputDir: "../../test-results/playwright/mobile-feed-header-cards",
  reporter: [["list"], ["json", { outputFile: `../../docs/mobile-feed-header-cards/${phase}-results.json` }]],
});
