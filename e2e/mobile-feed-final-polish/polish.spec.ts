import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { boundaries, ready } from "../mobile-feed-implementation/boundaries";
import { geometry } from "../mobile-feed-implementation/geometry";
import { details, align } from "../mobile-feed-responsive/details";

const output = "docs/mobile-feed-final-polish";
const phase = process.env.FEED_POLISH_BEFORE === "1" ? "before" : "after";

async function appearance(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) =>
    cards.map((card) => {
      const price = [...card.querySelectorAll<HTMLElement>("span")].find(
        (el) => !el.children.length && el.textContent?.includes("$"),
      )!;
      const style = getComputedStyle(price);
      const frame = getComputedStyle(card);
      const channels = style.color.match(/\d+/g)!.slice(0, 3).map(Number);
      const luminance = channels.map((channel) => {
        const s = channel / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      const contrast = 1.05 / (0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2] + 0.05);
      return {
        price: price.textContent,
        size: style.fontSize,
        weight: style.fontWeight,
        lineHeight: style.lineHeight,
        tracking: style.letterSpacing,
        color: style.color,
        contrastOnWhite: Math.round(contrast * 100) / 100,
        border: frame.border,
        shadow: frame.boxShadow,
      };
    }),
  );
}

function check(g: Awaited<ReturnType<typeof geometry>>) {
  expect(g.overflow).toBe(false);
  for (const card of g.cards.filter((card) => card.product)) {
    expect(card.priceFits, card.label || "price").toBe(true);
    for (const control of card.controls) {
      expect(control.width).toBeGreaterThanOrEqual(43.9);
      expect(control.height).toBeGreaterThanOrEqual(43.9);
      expect(control.inside).toBe(true);
      expect(control.hit).toBe(true);
      expect(control.nestedInteractive).toBe(false);
    }
  }
}

function stableLayout(metrics: Awaited<ReturnType<typeof geometry>>) {
  // Lazy images below the viewport may load at different times. Their natural
  // dimensions are evidence, but must not be treated as a layout difference.
  // Use the same JSON representation as the persisted baseline (NaN -> null).
  return JSON.parse(JSON.stringify({
    ...metrics,
    cards: metrics.cards.map((card) => Object.fromEntries(
      Object.entries(card).filter(([key]) => ![
        "source", "retainedSourceArea",
        // Shape detection updates object-fit when a lazy image loads. Preserve
        // this check for visible photos, where the before/after is meaningful.
        ...(card.visible === 0 ? ["imageFit"] : []),
      ].includes(key)),
    )),
  }));
}

async function changedPixels(path: string, actual: Buffer) {
  const a = await sharp(readFileSync(path)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(actual).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(b.info).toEqual(a.info);
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4)
    if (a.data.subarray(i, i + 4).compare(b.data.subarray(i, i + 4))) changed++;
  return changed;
}

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`actual feed, stable density and desktop ${width}`, async ({ page }) => {
    await boundaries(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await ready(page);
    await align(page);
    const metrics = await geometry(page);
    check(metrics);
    const rendered = await details(page);
    const visual = await appearance(page);
    const image = await page.screenshot({ path: `${output}/screenshots/${phase}-${width}.png`, animations: "disabled" });
    let pixelDifference: number | null = null;
    if (phase === "after") {
      const before = JSON.parse(readFileSync(`${output}/before-${width}.json`, "utf8"));
      // Every card/image height, grid position, control and visible count must stay identical.
      expect(stableLayout(metrics)).toEqual(stableLayout(before.metrics));
      if (width > 768) {
        expect(rendered).toEqual(before.rendered);
        pixelDifference = await changedPixels(`${output}/screenshots/before-${width}.png`, image);
        expect(pixelDifference).toBe(0);
      } else {
        for (const price of visual) {
          expect(price.weight).toBe("600");
          expect(price.lineHeight).toBe("26px");
          expect(price.contrastOnWhite).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    writeFileSync(`${output}/${phase}-${width}.json`, JSON.stringify({ width, metrics, visual, rendered, pixelDifference }, null, 2));
  });
}

test("single card and long-price/stock/variant/image cases", async ({ page }) => {
  await boundaries(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "?one=1");
  await align(page);
  const single = await geometry(page);
  check(single);
  await page.screenshot({ path: `${output}/screenshots/${phase}-390-single.png`, animations: "disabled" });
  const cases = [];
  for (const cardWidth of [186, 382]) {
    await ready(page, `?view=cases&cardWidth=${cardWidth}`);
    const sections = page.locator("[data-case]");
    for (const section of await sections.all()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const metrics = await geometry(page);
      check(metrics);
    }
    cases.push({ cardWidth, metrics: await geometry(page), visual: await appearance(page) });
  }
  for (const shape of ["portrait", "landscape"]) {
    await ready(page, `?productMedia=${shape}`);
    await align(page);
    const metrics = await geometry(page);
    check(metrics);
    await page.screenshot({ path: `${output}/screenshots/${phase}-390-${shape}.png`, animations: "disabled" });
    cases.push({ shape, metrics, visual: await appearance(page) });
  }
  if (phase === "after") {
    const before = JSON.parse(readFileSync(`${output}/before-cases.json`, "utf8"));
    expect(stableLayout(single)).toEqual(stableLayout(before.single));
    for (let i = 0; i < cases.length; i++)
      expect(stableLayout(cases[i].metrics)).toEqual(stableLayout(before.cases[i].metrics));
  }
  writeFileSync(`${output}/${phase}-cases.json`, JSON.stringify({ single, cases }, null, 2));
});

test("unobstructed commercial information in edge-case captures", async ({ page }) => {
  await boundaries(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const records = [];
  for (const cardWidth of [186, 382]) {
    await ready(page, `?view=cases&cardWidth=${cardWidth}`);
    for (const name of ["long", "variants", "sold-out", "missing"]) {
      const section = page.locator(`[data-case="${name}"]`);
      await expect(section).toHaveCount(1);
      await section.evaluate((el) => {
        scrollBy(0, el.getBoundingClientRect().top - document.querySelector("header")!.getBoundingClientRect().bottom - 8);
      });
      await page.waitForTimeout(300);
      const information = await section.evaluate((el) => {
        const price = [...el.querySelectorAll<HTMLElement>("span")].find((span) => !span.children.length && span.textContent?.includes("$"))!;
        const rect = price.getBoundingClientRect();
        const upper = document.querySelector("header")!.getBoundingClientRect().bottom;
        const lower = document.querySelector('nav[aria-label="Navegación principal"]')!.getBoundingClientRect().top;
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { price: price.textContent, visible: rect.top >= upper && rect.bottom <= lower && (hit === price || !!hit && price.contains(hit)), cardWidth: el.querySelector('[data-product-variant="feed"]')!.getBoundingClientRect().width };
      });
      expect(information.visible).toBe(true);
      check(await geometry(page));
      await section.screenshot({ path: `${output}/screenshots/${phase}-visible-case-${cardWidth}-${name}.png`, animations: "disabled" });
      records.push({ name, ...information });
    }
  }
  writeFileSync(`${output}/${phase}-edge-captures.json`, JSON.stringify(records, null, 2));
});
