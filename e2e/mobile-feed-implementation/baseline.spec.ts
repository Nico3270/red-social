import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { boundaries, ready } from "./boundaries";
import { geometry } from "./geometry";

test("B2 real Next development baseline", async ({ page }) => {
  test.setTimeout(300000);
  await boundaries(page);
  const measurements = [];
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    console.log("baseline width", width);
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    console.log("baseline ready", width);
    const initial = await geometry(page);
    console.log("baseline measured", width);
    await page.screenshot({
      path: `docs/mobile-feed-b3-c2/screenshots/b2-${width}-initial.png`,
    });
    await page.evaluate(() => {
      const c = document.querySelector('[data-product-variant="feed"]')!;
      scrollTo(
        0,
        c.getBoundingClientRect().top +
          scrollY -
          (document.querySelector("header")?.getBoundingClientRect().bottom ||
            0) -
          8,
      );
    });
    const aligned = await geometry(page);
    await page.screenshot({
      path: `docs/mobile-feed-b3-c2/screenshots/b2-${width}-aligned.png`,
    });
    expect(initial.overflow).toBe(false);
    measurements.push({ width, initial, aligned });
  }
  // Store rendered semantics for shared variants before modifying their consumer.
  const shared: Record<string, unknown> = {};
  await page.setViewportSize({ width: 390, height: 844 });
  for (const variant of ["default", "business_profile"]) {
    await page.goto(`/?view=cases&variant=${variant}`);
    await page.locator('[data-case="normal"] h3').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    shared[variant] = await page
      .locator('[data-case="normal"]>[data-product-variant]')
      .evaluate((el) => ({
        html: el.innerHTML,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }));
  }
  writeFileSync(
    "docs/mobile-feed-b3-c2/b2-measurements.json",
    JSON.stringify({ measurements, shared }, null, 2),
  );
});
