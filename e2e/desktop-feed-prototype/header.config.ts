import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig(base, {
  testMatch: ["header.spec.ts", "desktop.spec.ts"],
  outputDir: "../../test-results/desktop-feed-header",
  use: { ...base.use, actionTimeout: 15000, navigationTimeout: 60000 },
});
