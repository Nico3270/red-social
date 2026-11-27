import { test, expect, chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { setup, openRoot, input, headerGeometry } from "./browser";
import { geometry } from "../mobile-feed-implementation/geometry";
import { commercialStyles } from "../mobile-feed-final-correction/browser";
import { details } from "../mobile-feed-responsive/details";

const out = "docs/mobile-feed-header-cards";
const phase = process.env.FEED_HEADER_BEFORE === "1" ? "before" : "after";

async function pixelDifference(file: string, buffer: Buffer) {
  const a = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(b.info).toEqual(a.info);
  let pixels = 0;
  for (let i = 0; i < a.data.length; i += 4) if (a.data.subarray(i, i + 4).compare(b.data.subarray(i, i + 4))) pixels++;
  return pixels;
}

for (const width of [320, 360, 390, 430, 768, 769, 1024, 1440]) {
  test(`native feed and search ${width}`, async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    const boundary = await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    const header = await headerGeometry(page);
    const metrics = await geometry(page);
    const commercial = await commercialStyles(page);
    const rendered = await details(page);
    expect(header.overflow).toBe(false);
    expect(header.collisions).toEqual([]);
    expect(header.brandContentFits).toBe(true);
    const closed = await page.screenshot({ path: `${out}/screenshots/${phase}-${width}-closed.png`, animations: "disabled" });
    const search = await input(page);
    await search.fill("tenis");
    await expect(page.getByRole("option")).toHaveCount(3);
    const opened = await page.screenshot({ path: `${out}/screenshots/${phase}-${width}-search.png`, animations: "disabled" });
    let desktopClosedPixels: number | null = null, desktopOpenPixels: number | null = null;
    if (phase === "after") {
      const before = JSON.parse(readFileSync(`${out}/before-${width}.json`, "utf8"));
      expect(commercial.map((c) => [c.width, c.height, c.priceSize, c.priceWeight, c.contentPadding, c.commercialGap])).toEqual(before.commercial.map((c: typeof commercial[number]) => [c.width, c.height, c.priceSize, c.priceWeight, c.contentPadding, c.commercialGap]));
      expect(metrics.cards.filter((c) => c.product).map((c) => [c.mediaWidth, c.mediaHeight])).toEqual(before.metrics.cards.filter((c: { product: boolean }) => c.product).map((c: { mediaWidth: number; mediaHeight: number }) => [c.mediaWidth, c.mediaHeight]));
      if (width <= 768) {
        for (const card of commercial) {
          expect(card.border).toBe("1px solid rgb(226, 184, 194)");
          expect(card.shadow).toBe("rgba(44, 47, 51, 0.12) 0px 4px 14px 0px");
        }
        expect(header.height).toBeLessThan(before.header.height);
        expect(header.firstProductTop).toBeLessThan(before.header.firstProductTop);
        expect(header.searchLocationGap).toBeGreaterThanOrEqual(7.9);
        expect(header.boxes[1].width).toBeGreaterThanOrEqual(44);
        expect(header.boxes[1].height).toBeGreaterThanOrEqual(44);
        expect(await page.locator("header input").count()).toBe(0);
      } else {
        expect(rendered).toEqual(before.rendered);
        desktopClosedPixels = await pixelDifference(`${out}/screenshots/before-${width}-closed.png`, closed);
        desktopOpenPixels = await pixelDifference(`${out}/screenshots/before-${width}-search.png`, opened);
        expect(desktopClosedPixels).toBe(0);
        expect(desktopOpenPixels).toBe(0);
      }
    }
    expect(runtimeErrors).toEqual([]);
    writeFileSync(`${out}/${phase}-${width}.json`, JSON.stringify({ width, header, metrics, commercial, rendered, requests: boundary.requests, desktopClosedPixels, desktopOpenPixels, runtimeErrors }, null, 2));
  });
}

test("mobile focus, close, states, cancellation and feed scroll", async ({ page }) => {
  test.skip(phase === "before", "New mobile interaction.");
  const boundary = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  await page.evaluate(() => scrollTo(0, 400));
  const before = await page.evaluate(() => ({ scroll: scrollY, overflow: document.body.style.overflow, anchor: document.querySelector('[data-feed-product-id="p3"]')!.getBoundingClientRect().top }));
  const trigger = page.getByRole("button", { name: "Abrir búsqueda", exact: true });
  const field = await input(page);
  const dialog = page.getByRole("dialog", { name: "Buscar en Myckeo" });
  await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await field.fill("lento");
  await expect(page.getByRole("status")).toContainText("Buscando");
  await page.screenshot({ path: `${out}/screenshots/search-loading.png` });
  await expect.poll(() => boundary.requests.some((url) => url.includes("query=lento"))).toBe(true);
  await field.fill("tenis");
  await expect(page.getByRole("option").first()).toContainText("Tenis urbanos");
  await expect.poll(() => boundary.slowCompleted).toBe(true);
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(page.getByRole("option").first()).toContainText("Tenis urbanos");
  await field.fill("vacio");
  await expect(page.getByRole("status")).toContainText("No encontramos resultados");
  await page.screenshot({ path: `${out}/screenshots/search-empty.png` });
  await field.fill("error");
  await expect(page.getByRole("status")).toContainText("No pudimos buscar");
  await page.screenshot({ path: `${out}/screenshots/search-error.png` });
  await field.fill("tenis");
  await expect(page.getByRole("option")).toHaveCount(3);
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(before.scroll);
  await page.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => ({ scroll: scrollY, overflow: document.body.style.overflow, anchor: document.querySelector('[data-feed-product-id="p3"]')!.getBoundingClientRect().top }))).toEqual(before);
  const reopened = await input(page);
  await expect(reopened).toBeFocused();
  await reopened.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before.scroll);
  writeFileSync(`${out}/focus-scroll.json`, JSON.stringify({ before, after: await page.evaluate(() => ({ scroll: scrollY, overflow: document.body.style.overflow })), requests: boundary.requests, focusRestored: true, focusTrapped: true, staleResponseIgnored: true }, null, 2));
});

test("existing search result routes, including keyboard selection", async ({ page }) => {
  test.skip(phase === "before", "Same engine and destination verification.");
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const destinations = ["/producto/tenis-urbanos", "/perfil/casa-origen", "/category/moda-y-accesorios"];
  const visited: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!destinations.includes(url.pathname)) return route.fallback();
    // The native router must navigate to the existing URL. Destination data is
    // synthetic; HTML also handles Next's normal non-RSC fallback navigation.
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><html lang='es'><title>Destino sintético</title><main>Destino de búsqueda</main></html>" });
  });
  for (const [index, destination] of destinations.entries()) {
    await openRoot(page);
    const field = await input(page);
    await field.fill("tenis");
    await expect(page.getByRole("option")).toHaveCount(3);
    if (index === 0) {
      await field.press("ArrowDown");
      await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
      await field.press("Enter");
    } else {
      await page.getByRole("option").nth(index).click();
    }
    await expect(page).toHaveURL(`http://127.0.0.1:3000${destination}`);
    visited.push(new URL(page.url()).pathname);
  }
  writeFileSync(`${out}/navigation.json`, JSON.stringify({ visited }, null, 2));
});

test("virtual keyboard resize keeps field, results and close reachable", async ({ page }) => {
  test.skip(phase === "before", "Mobile layer keyboard presentation.");
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  await page.evaluate(() => scrollTo(0, 300));
  const field = await input(page);
  await expect(field).toBeFocused();
  await field.fill("muchos");
  await expect(page.getByRole("option")).toHaveCount(10);
  await page.setViewportSize({ width: 390, height: 430 });
  const dialog = page.getByRole("dialog");
  await expect.poll(async () => (await dialog.boundingBox())?.height).toBe(430);
  await page.getByRole("option").last().scrollIntoViewIfNeeded();
  const bounds = await page.getByRole("option").last().boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(430);
  await expect(field).toBeInViewport();
  await expect(page.getByRole("button", { name: "Cerrar búsqueda" })).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `${out}/screenshots/search-keyboard-430h.png` });
  await field.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => scrollY)).toBe(300);
  writeFileSync(`${out}/keyboard.json`, JSON.stringify({ simulation: "Visual viewport reduced from 844 to 430 CSS px; no OS keyboard in headless Chromium", lastResultBottom: bounds!.y + bounds!.height, feedScrollRestored: 300 }, null, 2));
});

test("narrow effective widths reflow without overlap", async ({ page }) => {
  test.skip(phase === "before", "High zoom accessibility fallback.");
  await setup(page);
  const records = [];
  for (const width of [195, 160]) {
    await page.setViewportSize({ width, height: 600 });
    await openRoot(page);
    const header = await headerGeometry(page);
    expect(header.overflow).toBe(false);
    expect(header.collisions).toEqual([]);
    expect(header.brandContentFits).toBe(true);
    const field = await input(page);
    await expect(field).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.getByRole("button", { name: "Cerrar búsqueda" }).click();
    records.push({ width, header });
  }
  writeFileSync(`${out}/narrow.json`, JSON.stringify(records, null, 2));
});

test("native browser zoom 200 percent", async ({}, info) => {
  test.skip(phase === "before", "Native zoom verification.");
  const profile = mkdtempSync(path.join(tmpdir(), "myckeo-header-zoom-"));
  mkdirSync(path.join(profile, "Default"));
  writeFileSync(path.join(profile, "Default/Preferences"), JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: info.project.use.launchOptions?.executablePath,
    viewport: null,
    args: ["--window-size=780,1000"],
    reducedMotion: "reduce",
  });
  try {
    const page = context.pages()[0];
    await setup(page);
    await openRoot(page);
    const zoom = await page.evaluate(() => ({ innerWidth, outerWidth, dpr: devicePixelRatio }));
    expect(zoom.dpr).toBeCloseTo(2, 1);
    const header = await headerGeometry(page);
    expect(header.overflow).toBe(false);
    expect(header.collisions).toEqual([]);
    const field = await input(page);
    await expect(field).toBeFocused();
    await field.fill("tenis");
    await expect(page.getByRole("option")).toHaveCount(3);
    await page.screenshot({ path: `${out}/screenshots/search-native-zoom-200.png` });
    await field.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir búsqueda" })).toBeFocused();
    writeFileSync(`${out}/zoom.json`, JSON.stringify({ zoom, header, focusRestored: true }, null, 2));
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
