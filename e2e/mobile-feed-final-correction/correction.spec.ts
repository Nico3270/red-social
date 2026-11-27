import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { mockData, openRoot, commercialStyles } from "./browser";
import { geometry } from "../mobile-feed-implementation/geometry";
import { align, details } from "../mobile-feed-responsive/details";

const out = "docs/mobile-feed-final-correction";
const phase = process.env.FEED_CORRECTION_BEFORE === "1" ? "before" : "after";

for (const width of [320, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`native localhost root ${width}`, async ({ page }) => {
    const boundary = await mockData(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    expect(new URL(page.url()).pathname).toBe("/");
    await align(page);
    const metrics = await geometry(page);
    const commercial = await commercialStyles(page);
    const rendered = await details(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules].filter((rule) => rule.cssText.includes("feedProductCard")).map((rule) => ({ href: sheet.href, rule: rule.cssText })); } catch { return []; }
    }));
    let differentPixels: number | null = null;
    expect(metrics.overflow).toBe(false);
    for (const card of metrics.cards.filter((card) => card.product)) {
      expect(card.priceFits).toBe(true);
      for (const control of card.controls) {
        expect(control.width).toBeGreaterThanOrEqual(43.9);
        expect(control.height).toBeGreaterThanOrEqual(43.9);
        expect(control.inside).toBe(true);
        expect(control.hit).toBe(true);
        expect(control.nestedInteractive).toBe(false);
      }
    }
    // Check the winning computed styles on the native page before capturing it.
    if (phase === "after" && width <= 768) {
      for (const c of commercial) {
        expect(c.priceSize).toBe(c.isC2 ? "16px" : "18px");
        expect(c.priceWeight).toBe("600");
        expect(c.textShadow).toBe("none");
        expect(c.contentDirection).toBe("column");
        expect(c.contentJustify).toBe("flex-start");
        expect(c.titleMinHeight).toBe("0px");
        expect(c.commercialGap).toBeGreaterThanOrEqual(3.9);
        expect(c.commercialGap).toBeLessThanOrEqual(6.1);
        expect(c.priceMarginTop).not.toBe("auto");
        expect(c.border).toBe("1px solid rgb(232, 205, 211)");
        expect(c.shadow).toBe("rgba(44, 47, 51, 0.09) 0px 3px 12px 0px");
      }
    }
    const image = await page.screenshot({ path: `${out}/screenshots/${phase}-${width}.png`, animations: "disabled" });
    if (phase === "after") {
      const before = JSON.parse(readFileSync(`${out}/before-${width}.json`, "utf8"));
      expect(scrollY).toBe(before.scrollY);
      expect(metrics.cards.filter((card) => card.product).map((card) => [card.width, card.mediaWidth, card.mediaHeight])).toEqual(before.metrics.cards.filter((card: { product: boolean }) => card.product).map((card: { width: number; mediaWidth: number; mediaHeight: number }) => [card.width, card.mediaWidth, card.mediaHeight]));
      if (width > 768) {
        expect(rendered).toEqual(before.rendered);
        const a = await sharp(readFileSync(`${out}/screenshots/before-${width}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const b = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        expect(b.info).toEqual(a.info);
        differentPixels = 0;
        for (let i = 0; i < a.data.length; i += 4) if (a.data.subarray(i, i + 4).compare(b.data.subarray(i, i + 4))) differentPixels++;
        expect(differentPixels).toBe(0);
      } else {
        expect(commercial[0].priceSize).toBe(width >= 390 ? "16px" : "18px");
        expect(commercial[2].priceSize).toBe("18px"); // Odd C2 item spans one column.
        expect(css.some((entry) => entry.rule.includes("232, 205, 211"))).toBe(true);
      }
    }
    writeFileSync(`${out}/${phase}-${width}.json`, JSON.stringify({ url: page.url(), width, scrollY, metrics, commercial, rendered, css, differentPixels, errors, actions: boundary.actions.map((action) => action.name) }, null, 2));
    expect(errors).toEqual([]);
  });
}

test("commercial handlers on the native feed", async ({ page }) => {
  test.skip(phase === "before", "Functional verification of the applied correction.");
  const fake = await mockData(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  await align(page);
  const first = page.locator('[data-feed-product-id="p1"]');
  const favorite = first.getByRole("button", { name: /Guardar/ });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites.map((p: { id: string }) => p.id))).toContain("p1");
  await first.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(first.getByRole("button", { name: "Siguiendo", exact: true })).toBeVisible();
  expect(fake.actions.some((action) => action.name === "toggleFollow")).toBe(true);
  const whatsapp = first.getByRole("link", { name: /Contactar por WhatsApp/ });
  await expect(whatsapp).toHaveAttribute("href", /https:\/\/wa.me\/3100000000\?text=/);
  const popupPromise = page.waitForEvent("popup");
  await whatsapp.click();
  await (await popupPromise).close();
  await first.getByRole("button", { name: /Agregar .* al carrito/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton").fill("2");
  await dialog.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts["casa-origen"][0])).toMatchObject({ id: "p1", cantidad: 2, precio: 145000 });
  await page.locator('[data-feed-product-id="p4"]').getByRole("button", { name: /Elegir opciones/ }).click();
  await dialog.getByRole("button", { name: /^39/ }).click();
  await expect(dialog.getByRole("button", { name: "Sin stock", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: /^38/ }).click();
  await dialog.getByRole("spinbutton").fill("99");
  await expect(dialog.getByRole("spinbutton")).toHaveValue("3");
  await dialog.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts["casa-origen"].find((p: { id: string }) => p.id === "p4"))).toMatchObject({ productVariantId: "v1", cantidad: 3, precio: 145000 });
  await expect(page.locator('[data-feed-product-id="p5"]').getByRole("button", { name: "Bolso agotado agotado", exact: true })).toBeDisabled();
  expect(fake.actions.filter((action) => action.name === "refused")).toEqual([]);
  writeFileSync(`${out}/commerce.json`, JSON.stringify({ actions: fake.actions.map((action) => action.name), localCart: await page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts), favoritePersisted: true, whatsappPopupOpened: true, exhaustedVariantDisabled: true }, null, 2));
});

test("long names and prices, stock, variants and missing photo", async ({ page }) => {
  test.skip(phase === "before", "Focused final captures.");
  await mockData(page);
  await page.setViewportSize({ width: 430, height: 844 });
  await openRoot(page);
  const records = [];
  for (const id of ["p3", "p4", "p5", "p6", "p7"]) {
    const card = page.locator(`[data-feed-product-id="${id}"]`);
    await card.evaluate((el) => scrollBy(0, el.getBoundingClientRect().top - document.querySelector("header")!.getBoundingClientRect().bottom - 8));
    await page.waitForTimeout(300);
    const metrics = await geometry(page);
    const current = metrics.cards.filter((card) => card.product).find((card) => card.label === (id === "p3" ? "Bolso artesanal" : id === "p4" ? "Tenis con talla a elección" : id === "p5" ? "Bolso agotado" : id === "p6" ? "Producto sin fotografía" : "Edición artesanal colombiana con acabados hechos a mano y nombre de producto especialmente largo"))!;
    expect(metrics.overflow).toBe(false);
    expect(current.priceFits).toBe(true);
    expect(current.full).toBe(true);
    for (const control of current.controls) expect(control.hit).toBe(true);
    const commercial = (await commercialStyles(page)).find((card) => card.id === id)!;
    expect(commercial.commercialGap).toBe(4);
    if (id === "p4") expect(commercial.from).toBe(true);
    if (id === "p7") expect(commercial.price).toMatch(/123\.456\.789/);
    await card.screenshot({ path: `${out}/screenshots/after-edge-${id}.png`, animations: "disabled" });
    records.push({ id, commercial, metrics: current });
  }
  writeFileSync(`${out}/edge-cases.json`, JSON.stringify(records, null, 2));
});
