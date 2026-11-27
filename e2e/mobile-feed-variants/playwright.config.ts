import { defineConfig } from "@playwright/test";
import base from "../mobile-feed/playwright.config";
import path from "node:path";

export default defineConfig(base, {
  testDir: ".",
  testMatch: "variants.spec.ts",
  outputDir: "../../test-results/playwright/mobile-feed-variants",
  reporter: [
    ["list"],
    ["json", { outputFile: "../../docs/mobile-feed-variants/results.json" }],
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:4402" },
  webServer: {
    command: "node e2e/mobile-feed-variants/serve.cjs",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:4402/",
    reuseExistingServer: true,
  },
});
