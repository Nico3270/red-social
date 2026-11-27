import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { boundaries, ready } from "../mobile-feed-implementation/boundaries";
import { geometry } from "../mobile-feed-implementation/geometry";
import { details, align } from "./details";
test("desktop before B3+C2 in actual Next", async ({ page }) => {
  test.setTimeout(240000);
  await boundaries(page);
  const measurements = [];
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await align(page);
    const metrics = await geometry(page),
      rendered = await details(page);
    await page.screenshot({
      path: `docs/mobile-feed-responsive/screenshots/reference-${width}.png`,
      animations: "disabled",
    });
    measurements.push({ width, metrics, rendered });
  }
  await page.setViewportSize({ width: 1920, height: 900 });
  await ready(page, "?category=1");
  await align(page);
  const category = {
    metrics: await geometry(page),
    rendered: await details(page),
  };
  await page.screenshot({
    path: "docs/mobile-feed-responsive/screenshots/reference-category-1920.png",
    animations: "disabled",
  });
  writeFileSync(
    "docs/mobile-feed-responsive/reference.json",
    JSON.stringify({ measurements, category }, null, 2),
  );
});
