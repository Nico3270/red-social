import { defineConfig } from "@playwright/test";
import base from "../mobile-feed/playwright.config";
import path from "node:path";
export default defineConfig(base, {
  testDir: ".",
  testMatch:
    process.env.FEED_IMPLEMENTATION_BASELINE === "1"
      ? "baseline.spec.ts"
      : "implementation.spec.ts",
  workers: 1,
  timeout: 90000,
  outputDir: "../../test-results/playwright/mobile-feed-b3-c2",
  reporter: [
    ["list"],
    ["json", { outputFile: "../../docs/mobile-feed-b3-c2/results.json" }],
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:3400" },
  webServer: {
    command: "node e2e/mobile-feed-implementation/dev-server.cjs",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:3400/",
    timeout: 180000,
    reuseExistingServer: false,
  },
});
