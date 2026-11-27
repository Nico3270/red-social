import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import path from "node:path";

export default defineConfig(base, {
  testMatch: "visual-refinement.spec.ts",
  outputDir: "../../test-results/playwright/mobile-feed-visual-refinement",
  webServer: {
    command: "node e2e/mobile-feed/serve.cjs",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:4401/refinement/b2/",
    reuseExistingServer: true,
  },
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "../../docs/mobile-feed-visual-refinement/results.json" },
    ],
  ],
});
