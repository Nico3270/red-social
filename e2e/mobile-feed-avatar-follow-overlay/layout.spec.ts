import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { setup, openRoot, settled, geometry } from "./geometry";
const out = "docs/mobile-feed-avatar-follow-overlay",
  phase = process.env.OVERLAY_BEFORE === "1" ? "before" : "after";
for (const width of [320, 360, 390, 430, 768, 769, 1024])
  test(`${phase} layout and hits ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const cards = await geometry(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    for (const c of cards) {
      expect(c.collisions).toEqual([]);
      for (const b of c.controls) {
        expect(b.hit).toBe(true);
        expect(b.nested).toBe(false);
        expect(b.photoOverlap).toBe(0);
        if (!b.name && !b.avatar) {
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
        cards.map((c) => [
          c.id,
          c.root,
          c.header,
          c.photo,
          c.price,
          c.title,
          c.border,
          c.shadow,
        ]),
      ).toEqual(
        before.cards.map((c: (typeof cards)[number]) => [
          c.id,
          c.root,
          c.header,
          c.photo,
          c.price,
          c.title,
          c.border,
          c.shadow,
        ]),
      );
      if (width <= 768) {
        for (const c of cards) {
          expect(c.header.height).toBe(44);
          expect(c.avatar).toBeNull();
          expect(c.overlay?.avatar.width).toBe(24);
          expect(c.overlay?.avatar.height).toBe(24);
          expect(c.overlay?.overlapFraction).toBeGreaterThan(0.45);
          expect(c.overlay?.overlapFraction).toBeLessThan(0.55);
          expect(c.overlay?.photoHit).toBe(true);
          expect(c.overlay?.badgeHit).toBe(true);
          expect(c.overlay?.avatarIsInsideButton).toBe(true);
          expect(c.overlay?.profileLinks).toBe(1);
          expect(c.name.width).toBe(
            before.cards.find((b: typeof c) => b.id === c.id).name.width + 24,
          );
          expect(c.controls.find((b) => b.follow)?.box.width).toBe(44);
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
      JSON.stringify({ width, cards, desktopPixels }, null, 2),
    );
  });
