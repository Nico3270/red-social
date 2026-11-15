import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: "new-product.spec.ts",
  grep: /independent-/,
  outputDir: "../../test-results/playwright/new-product-components-independent",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          "../../test-results/new-product/components-independent/results.json",
      },
    ],
  ],
});
