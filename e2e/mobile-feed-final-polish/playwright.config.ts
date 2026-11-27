import { defineConfig } from "@playwright/test";
import base from "../mobile-feed-implementation/playwright.config";

const phase = process.env.FEED_POLISH_BEFORE === "1" ? "before" : "after";

export default defineConfig(base, {
  testDir: ".",
  testMatch: "polish.spec.ts",
  workers: 1,
  outputDir: "../../test-results/playwright/mobile-feed-final-polish",
  reporter: [
    ["list"],
    ["json", { outputFile: `../../docs/mobile-feed-final-polish/${process.env.FEED_POLISH_EDGE_CAPTURE === "1" ? "edge" : phase}-results.json` }],
  ],
});
