import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const cache = path.join(homedir(), ".cache/ms-playwright");
const installedChromium = existsSync(cache)
  ? readdirSync(cache)
      .filter((name) => /^chromium-\d+$/.test(name))
      .flatMap((name) =>
        ["chrome-linux64/chrome", "chrome-linux/chrome"].map((file) =>
          path.join(cache, name, file),
        ),
      )
      .find(existsSync)
  : undefined;

export default defineConfig({
  testDir: ".",
  testMatch: "feed.spec.ts",
  workers: 1,
  timeout: 45000,
  outputDir: "../../test-results/playwright/mobile-feed",
  reporter: [
    ["list"],
    ["json", { outputFile: "../../docs/mobile-feed-compact/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4401",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PRODUCT_TEST_BROWSER || installedChromium,
    },
    locale: "es-CO",
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node e2e/mobile-feed/serve.cjs",
    cwd: path.resolve(__dirname, "../.."),
    url: "http://127.0.0.1:4401/after/",
    reuseExistingServer: true,
  },
});
