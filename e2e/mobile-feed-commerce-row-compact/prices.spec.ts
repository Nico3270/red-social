import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, measure, prices } from "./browser";
const out = "docs/mobile-feed-commerce-row-compact";
for (const width of [390, 430])
  test(`all six amounts on a real C2 card at ${width}`, async ({ page }) => {
    const data = await setup(page);
    await page.setViewportSize({ width, height: 844 });
    const records = [];
    for (const value of prices) {
      data.setFirstPrice(value);
      await openRoot(page);
      await page.evaluate(() => scrollTo(0, 100));
      await settled(page);
      const c = (await measure(page)).cards.find((c) => c.id === "p1")!;
      expect(c.c2).toBe(true);
      expect(c.priceSize).toBe("16px");
      expect(c.priceFullyVisible).toBe(true);
      expect(c.glyphLines).toBe(1);
      expect(c.amount).toBe(
        new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(value),
      );
      expect(c.collisions).toEqual([]);
      for (const b of c.controls) expect(b.hit).toBe(true);
      if (value <= 180000) expect(c.wrapped).toBe(false);
      if (width === 430) expect(c.wrapped).toBe(false);
      if (width === 390 && value >= 8000000) expect(c.wrapped).toBe(true);
      if (c.wrapped) {
        expect(c.actions.x + c.actions.width).toBeCloseTo(c.row.right, 1);
        expect(c.row.height).toBe(66);
      } else expect(c.row.height).toBe(44);
      if ([180000, 8000000, 31200000, 123456789].includes(value))
        await page.locator('[data-feed-product-id="p1"]').screenshot({
          path: `${out}/screenshots/price-${width}-${value}.png`,
          animations: "disabled",
        });
      records.push({ value, ...c });
    }
    writeFileSync(
      `${out}/prices-${width}.json`,
      JSON.stringify(records, null, 2),
    );
  });
