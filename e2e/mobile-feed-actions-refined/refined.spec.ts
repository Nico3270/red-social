import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import {
  setup,
  openRoot,
  settled,
  actionGeometry,
} from "../mobile-feed-actions-layout-final/browser";
import { commercialStyles } from "../mobile-feed-final-correction/browser";
import { details } from "../mobile-feed-responsive/details";
const phase = process.env.REFINED_PHASE || "B";
const out = "docs/mobile-feed-actions-refined";
for (const width of [320, 360, 390, 430, 768, 769, 1024]) {
  test(`${phase} real cards ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const actions = await actionGeometry(page),
      commercial = await commercialStyles(page),
      rendered = await details(page);
    const surfaces = await page
      .locator('[data-product-variant="feed"]')
      .evaluateAll((cards) =>
        cards.map((card) => ({
          id: card.getAttribute("data-feed-product-id"),
          actions: [
            ...card.querySelectorAll<HTMLElement>(
              'a[href^="https://wa.me/"],button',
            ),
          ].map((el) => {
            const p = getComputedStyle(el, "::before"),
              r = el.getBoundingClientRect(),
              i = el.querySelector("svg")?.getBoundingClientRect();
            return {
              label: el.getAttribute("aria-label"),
              width: r.width,
              height: r.height,
              y: r.y,
              paintWidth: p.width,
              paintHeight: p.height,
              radius: p.borderRadius,
              background: p.backgroundColor,
              shadow: p.boxShadow,
              iconWidth: i?.width,
              iconHeight: i?.height,
            };
          }),
        })),
      );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    for (const c of actions) {
      expect(c.price.fits).toBe(true);
      expect(c.collisions).toEqual([]);
      for (const b of c.controls) {
        expect(b.box.width).toBeGreaterThanOrEqual(44);
        expect(b.box.height).toBeGreaterThanOrEqual(44);
        expect(b.nested).toBe(false);
        expect(b.hit).toBe(true);
        expect(b.nameOverlap).toBe(0);
        expect(b.priceOverlap).toBe(0);
      }
    }
    const screenshot = await page.screenshot({
      path: `${out}/screenshots/${phase}-${width}.png`,
      animations: "disabled",
    });
    let desktopPixels: number | null = null;
    if (phase !== "before") {
      const before = JSON.parse(
        readFileSync(`${out}/before-${width}.json`, "utf8"),
      );
      expect(
        actions.map((c) => [
          c.id,
          c.root.width,
          c.header.height,
          c.photo.width,
          c.photo.height,
          c.price.size,
        ]),
      ).toEqual(
        before.actions.map((c: (typeof actions)[number]) => [
          c.id,
          c.root.width,
          c.header.height,
          c.photo.width,
          c.photo.height,
          c.price.size,
        ]),
      );
      expect(
        commercial.map((c) => [
          c.price,
          c.priceSize,
          c.priceWeight,
          c.priceColor,
          c.border,
          c.shadow,
          c.radius,
        ]),
      ).toEqual(
        before.commercial.map((c: (typeof commercial)[number]) => [
          c.price,
          c.priceSize,
          c.priceWeight,
          c.priceColor,
          c.border,
          c.shadow,
          c.radius,
        ]),
      );
      if (width <= 768) {
        for (const c of actions) {
          expect(c.controlsOnPhoto).toBe(0);
          expect(c.marginTop).toBe("0px");
          expect(c.cart.box.right).toBeGreaterThanOrEqual(c.root.right - 12);
          expect(c.favorite.box.right).toBeLessThanOrEqual(c.root.right);
          if (phase === "B") {
            expect(c.favorite.box.y).toBeGreaterThanOrEqual(c.header.y);
            expect(c.favorite.box.bottom).toBeLessThanOrEqual(c.header.bottom);
          }
          for (const control of [c.follow, c.favorite])
            expect(control.box.width).toBe(44);
        }
        for (const c of surfaces) {
          const wa = c.actions.find((a) => a.label?.startsWith("Contactar"))!,
            cart = c.actions.find(
              (a) =>
                a.label &&
                !/^(Seguir|Siguiendo|Dejar de seguir|Guardar|Contactar)/.test(
                  a.label,
                ),
            )!;
          expect(wa).toBeTruthy();
          expect(cart).toBeTruthy();
          for (const key of [
            "width",
            "height",
            "y",
            "paintWidth",
            "paintHeight",
            "radius",
            "iconWidth",
            "iconHeight",
          ] as const)
            expect(wa[key]).toBe(cart[key]);
          expect(wa.paintWidth).toBe("32px");
          expect(wa.paintHeight).toBe("32px");
        }
      } else {
        expect(rendered).toEqual(before.rendered);
        const a = await sharp(
            readFileSync(`${out}/screenshots/before-${width}.png`),
          )
            .raw()
            .toBuffer(),
          b = await sharp(screenshot).raw().toBuffer();
        desktopPixels = 0;
        for (let i = 0; i < a.length; i += 3)
          if (!a.subarray(i, i + 3).equals(b.subarray(i, i + 3)))
            desktopPixels++;
        expect(desktopPixels).toBe(0);
      }
    }
    const all = actions.flatMap((c) =>
      c.controls.map((b) => ({ id: c.id, ...b.box })),
    );
    const cross = [];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++)
        if (
          all[i].id !== all[j].id &&
          Math.min(all[i].right, all[j].right) >
            Math.max(all[i].x, all[j].x) + 0.1 &&
          Math.min(all[i].bottom, all[j].bottom) >
            Math.max(all[i].y, all[j].y) + 0.1
        )
          cross.push([all[i].id, all[j].id]);
    expect(cross).toEqual([]);
    writeFileSync(
      `${out}/${phase}-${width}.json`,
      JSON.stringify(
        {
          width,
          actions,
          commercial,
          rendered,
          surfaces,
          desktopPixels,
          cross,
        },
        null,
        2,
      ),
    );
  });
}

test("B long names, long prices, light/dark images and stock states", async ({
  page,
}) => {
  test.skip(phase !== "B");
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const records = [];
  for (const id of ["p1", "p2", "p4", "p5", "p7", "p8"]) {
    const card = page.locator(`[data-feed-product-id="${id}"]`);
    await card.evaluate((el) =>
      scrollBy(
        0,
        el.getBoundingClientRect().top -
          document.querySelector("header")!.getBoundingClientRect().bottom -
          16,
      ),
    );
    await settled(page);
    const geometry = (await actionGeometry(page)).find((c) => c.id === id)!;
    expect(geometry.controlsOnPhoto).toBe(0);
    expect(geometry.collisions).toEqual([]);
    expect(geometry.price.fits).toBe(true);
    for (const control of geometry.controls) expect(control.hit).toBe(true);
    if (id === "p7") expect(geometry.controlsWrapped).toBe(true);
    await card.screenshot({
      path: `${out}/screenshots/B-edge-${id}.png`,
      animations: "disabled",
    });
    records.push(geometry);
  }
  writeFileSync(`${out}/B-edges.json`, JSON.stringify(records, null, 2));
});
