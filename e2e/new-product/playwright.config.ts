import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 45000,
  outputDir: "../../test-results/playwright/new-product",
  reporter: [
    ["list"],
    ["json", { outputFile: "../../test-results/new-product/results.json" }],
  ],
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: {
      executablePath: process.env.PRODUCT_TEST_BROWSER,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
