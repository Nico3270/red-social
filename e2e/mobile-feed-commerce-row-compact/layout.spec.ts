import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { setup, openRoot, settled, measure } from "./browser";
const out = "docs/mobile-feed-commerce-row-compact",
  phase = process.env.COMMERCE_BEFORE === "1" ? "before" : "after";
for (const width of [320, 360, 390, 430, 768, 769, 1024])
  test(`${phase} commercial row ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const result = await measure(page);
    expect(result.scrollWidth).toBeLessThanOrEqual(width + 1);
    for (const c of result.cards) {
      expect(c.collisions).toEqual([]);
      expect(c.priceFullyVisible).toBe(true);
      expect(c.glyphLines).toBe(1);
      for (const b of c.controls) {
        expect(b.hit).toBe(true);
        expect(b.nested).toBe(false);
        if (b.interactive) {
          expect(b.box.width).toBeGreaterThanOrEqual(44);
          expect(b.box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
    const screenshot = await page.screenshot({
      path: `${out}/screenshots/${phase}-${width}.png`,
      animations: "disabled",
    });
    let desktopPixels: number | null = null;
    if (phase === "after") {
      const before = JSON.parse(
        readFileSync(`${out}/before-${width}.json`, "utf8"),
      );
      expect(
        result.cards.map((c) => [
          c.id,
          c.root.width,
          c.header.width,
          c.header.height,
          c.photo.width,
          c.photo.height,
          c.priceSize,
          c.priceColor,
          c.priceWeight,
        ]),
      ).toEqual(
        before.cards.map((c: (typeof result.cards)[number]) => [
          c.id,
          c.root.width,
          c.header.width,
          c.header.height,
          c.photo.width,
          c.photo.height,
          c.priceSize,
          c.priceColor,
          c.priceWeight,
        ]),
      );
      if (width <= 768) {
        for (const c of result.cards) {
          expect(c.priceSize).toBe(c.c2 ? "16px" : "18px");
          expect(c.paintWa.width).toBe("30px");
          expect(c.paintWa).toEqual(c.paintCart);
          expect(c.wa.y).toBe(c.cart.y);
          expect(c.root.height).toBeLessThanOrEqual(
            before.cards.find((b: typeof c) => b.id === c.id).root.height + 0.1,
          );
        }
        for (const id of ["p1", "p2", "p7", "p8"])
          expect(result.cards.find((c) => c.id === id)!.wrapped).toBe(false);
        if (width >= 430) {
          for (const id of ["p4", "p5"])
            expect(result.cards.find((c) => c.id === id)!.wrapped).toBe(false);
        }
      } else {
        const a = await sharp(
            readFileSync(`${out}/screenshots/before-${width}.png`),
          )
            .raw()
            .toBuffer(),
          b = await sharp(screenshot).raw().toBuffer();
        expect(b.length).toBe(a.length);
        desktopPixels = 0;
        for (let i = 0; i < a.length; i += 3)
          if (!a.subarray(i, i + 3).equals(b.subarray(i, i + 3)))
            desktopPixels++;
        expect(desktopPixels).toBe(0);
      }
    }
    writeFileSync(
      `${out}/${phase}-${width}.json`,
      JSON.stringify({ ...result, desktopPixels }, null, 2),
    );
  });
