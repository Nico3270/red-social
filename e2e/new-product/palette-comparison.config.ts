import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: "new-product.spec.ts",
  grep: /refinement-/,
  outputDir: "../../test-results/playwright/new-product-palette-comparison",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          "../../test-results/new-product/palette-comparison/results.json",
      },
    ],
  ],
});
