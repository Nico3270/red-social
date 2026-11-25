import { defineConfig } from "@playwright/test";
import base from "../public-ui-audit/playwright.config";
export default defineConfig(base, {
  testDir: ".",
  testMatch: "geography.spec.ts",
  timeout: 120_000,
  outputDir: "../../test-results/geography-pagination",
});
