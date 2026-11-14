import { defineConfig } from "@playwright/test";

// Pruebas de componentes reales con fronteras externas simuladas, sin servidor Next ni DB.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 30000,
  outputDir: "../../test-results/playwright/profile-editor",
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: process.env.PROFILE_TEST_BROWSER
      ? { executablePath: process.env.PROFILE_TEST_BROWSER }
      : {},
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
