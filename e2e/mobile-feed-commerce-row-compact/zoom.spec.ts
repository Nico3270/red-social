import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, measure } from "./browser";
const phase = process.env.COMMERCE_BEFORE === "1" ? "before" : "after",
  out = "docs/mobile-feed-commerce-row-compact";
// Browser zoom 200% halves the CSS layout width. DPR 2 retains the physical
// screenshot width; unlike CSS zoom, this exercises container-query reflow.
test.use({ deviceScaleFactor: 2 });
for (const physicalWidth of [390, 768])
  test(`${phase} 200 percent reflow equivalent at ${physicalWidth}`, async ({
    page,
  }) => {
    await setup(page);
    await page.setViewportSize({ width: physicalWidth / 2, height: 422 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const result = await measure(page);
    const card = page.locator('[data-feed-product-id="p1"]');
    await card.evaluate((el) =>
      scrollBy(0, el.getBoundingClientRect().bottom - innerHeight + 80),
    );
    await settled(page);
    const visible = await measure(page);
    for (const c of result.cards) {
      expect(c.priceFullyVisible).toBe(true);
      expect(c.glyphLines).toBe(1);
      expect(c.collisions).toEqual([]);
      expect(c.wa.width).toBe(44);
      expect(c.cart.width).toBe(44);
    }
    if (phase === "after") {
      expect(result.scrollWidth).toBeLessThanOrEqual(result.innerWidth + 1);
      for (const b of visible.cards[0].controls) expect(b.hit).toBe(true);
    }
    await page.screenshot({
      path: `${out}/screenshots/${phase}-zoom-${physicalWidth}.png`,
      scale: "device",
      animations: "disabled",
    });
    writeFileSync(
      `${out}/${phase}-zoom-${physicalWidth}.json`,
      JSON.stringify({ physicalWidth, zoomEquivalent: 2, ...result }, null, 2),
    );
  });
