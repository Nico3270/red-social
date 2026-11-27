import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-final-correction/playwright.config";

const phase = process.env.FEED_ACTIONS_BEFORE === "1" ? "before" : "after";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "actions.spec.ts",
  outputDir: "../../test-results/playwright/mobile-feed-actions-layout-final",
  reporter: [["list"], ["json", { outputFile: `../../docs/mobile-feed-actions-layout-final/${phase}-results.json` }]],
});
