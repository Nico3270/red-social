import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, measure } from "./browser";
const out = "docs/mobile-feed-commerce-row-compact",
  phase = process.env.COMMERCE_CAPTURE;
test.skip(!phase, "Explicit historical capture only.");
for (const width of [390, 430])
  test(`commercial comparison capture ${width}`, async ({ page }) => {
    const data = await setup(page);
    if (width === 390)
      data.setFirstVariant(
        180000,
        "Presentación artesanal especial de edición limitada",
      );
    else data.setFirstPrice(31200000);
    await page.setViewportSize({ width, height: 844 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const result = await measure(page);
    expect(result.scrollWidth).toBe(width);
    for (const c of result.cards) {
      expect(c.priceFullyVisible).toBe(true);
      expect(c.collisions).toEqual([]);
    }
    await page.screenshot({
      path: `${out}/screenshots/comparison-${phase}-${width}.png`,
      animations: "disabled",
    });
    writeFileSync(
      `${out}/comparison-${phase}-${width}.json`,
      JSON.stringify(result, null, 2),
    );
    await page
      .locator('[data-feed-product-id="p1"]')
      .screenshot({
        path: `${out}/screenshots/card-${phase}-${width}.png`,
        animations: "disabled",
      });
  });
for (const width of [390, 430])
  test(`density anchored at the same product ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 844 });
    await openRoot(page);
    const card = page.locator('[data-feed-product-id="p4"]');
    await card.evaluate((el) =>
      scrollBy(
        0,
        el.getBoundingClientRect().top -
          document.querySelector("header")!.getBoundingClientRect().bottom -
          16,
      ),
    );
    await settled(page);
    const result = await measure(page);
    expect(result.scrollWidth).toBe(width);
    for (const c of result.cards) expect(c.collisions).toEqual([]);
    await page.screenshot({
      path: `${out}/screenshots/density-${phase}-${width}.png`,
      animations: "disabled",
    });
    writeFileSync(
      `${out}/density-${phase}-${width}.json`,
      JSON.stringify(result, null, 2),
    );
  });
