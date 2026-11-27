import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { setup, openRoot, socialGeometry, settled } from "./browser";
import { commercialStyles } from "../mobile-feed-final-correction/browser";
import { align, details } from "../mobile-feed-responsive/details";

const out = "docs/mobile-feed-social-actions";
const phase = process.env.FEED_SOCIAL_PHASE || "B";
async function pixels(file: string, buffer: Buffer) {
  const a = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), b = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(b.info).toEqual(a.info);
  let different = 0;
  for (let i = 0; i < a.data.length; i += 4) if (a.data.subarray(i, i + 4).compare(b.data.subarray(i, i + 4))) different++;
  return different;
}

for (const width of [320, 360, 390, 430, 768, 769, 1024]) {
  test(`social layout ${phase} at ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    await align(page);
    await settled(page);
    const social = await socialGeometry(page), commercial = await commercialStyles(page), rendered = await details(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    for (const card of social) {
      expect(card.socialDomCounts).toEqual({ follow: 1, favorite: 1 });
      expect(card.overlaps).toEqual([]);
      for (const control of card.controls) {
        expect(control.width).toBeGreaterThanOrEqual(44);
        expect(control.height).toBeGreaterThanOrEqual(44);
        expect(control.nested).toBe(false);
        expect(control.hit).toBe(true);
        expect(control.profileOverlap).toBe(false);
        if (phase !== "before") expect(control.badgeOverlap).toBe(false);
      }
    }
    const screenshot = await page.screenshot({ path: `${out}/screenshots/${phase}-${width}.png`, animations: "disabled" });
    let desktopPixels: number | null = null;
    if (phase !== "before") {
      const before = JSON.parse(readFileSync(`${out}/before-${width}.json`, "utf8"));
      const dimensions = (c: typeof commercial[number]) => [Math.round(c.width * 100) / 100, Math.round(c.height * 100) / 100, c.priceSize, c.priceWeight, c.contentPadding, c.commercialGap, c.border, c.shadow];
      expect(commercial.map(dimensions)).toEqual(before.commercial.map(dimensions));
      expect(social.map((c) => [c.photoWidth, c.photoHeight, c.headerHeight])).toEqual(before.social.map((c: typeof social[number]) => [c.photoWidth, c.photoHeight, c.headerHeight]));
      if (width <= 768) {
        expect(social[0].nameAvailableWidth).toBeGreaterThan(before.social[0].nameAvailableWidth);
        expect(social[0].controlsOnPhoto).toBe(phase === "A" ? 4 : 3);
        for (const card of social) for (const control of card.controls) expect(control.newSocialCentralOverlap).toBe(0);
      } else {
        expect(rendered).toEqual(before.rendered);
        desktopPixels = await pixels(`${out}/screenshots/before-${width}.png`, screenshot);
        expect(desktopPixels).toBe(0);
      }
    }
    writeFileSync(`${out}/${phase}-${width}.json`, JSON.stringify({ width, scrollY: await page.evaluate(() => scrollY), social, commercial, rendered, desktopPixels }, null, 2));
  });
}

async function showCard(page: import("@playwright/test").Page, id: string) {
  const card = page.locator(`[data-feed-product-id="${id}"]`);
  await card.evaluate((el) => scrollBy(0, el.getBoundingClientRect().top - document.querySelector("header")!.getBoundingClientRect().bottom - 8));
  await settled(page);
  return card;
}

test(`social ${phase} interactions, keyboard, cart and variants`, async ({ page }) => {
  test.skip(phase === "before", "Applied alternatives.");
  const fake = await setup(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const card = await showCard(page, "p1");
  await expect(card.getByRole("button", { name: "Seguir", exact: true })).toHaveCount(1);
  const follow = card.getByRole("button", { name: "Seguir", exact: true });
  await follow.focus();
  await page.keyboard.press("Enter");
  await page.mouse.move(0, 0);
  await expect(card.getByRole("button", { name: "Siguiendo", exact: true })).toBeVisible();
  const favorite = card.getByRole("button", { name: /Guardar .* en favoritos/ });
  await expect(favorite).toHaveCount(1);
  await favorite.focus();
  await page.keyboard.press("Space");
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites.map((p: { id: string }) => p.id))).toContain("p1");
  await card.screenshot({ path: `${out}/screenshots/${phase}-active.png`, animations: "disabled" });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites.map((p: { id: string }) => p.id))).not.toContain("p1");
  await card.getByRole("button", { name: "Siguiendo", exact: true }).hover();
  await card.getByRole("button", { name: "Dejar de seguir", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(card.getByRole("button", { name: "Seguir", exact: true })).toBeVisible();
  expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(2);
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  const whatsapp = card.getByRole("link", { name: /Contactar por WhatsApp/ });
  await expect(whatsapp).toHaveAttribute("href", /https:\/\/wa.me\/3100000000\?text=/);
  const popup = page.waitForEvent("popup");
  await whatsapp.click();
  await (await popup).close();
  await card.getByRole("button", { name: /Agregar .* al carrito/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton").fill("2");
  await dialog.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts["casa-origen"][0])).toMatchObject({ id: "p1", precio: 145000, cantidad: 2 });
  const variants = await showCard(page, "p4");
  await variants.getByRole("button", { name: /Elegir opciones/ }).click();
  await dialog.getByRole("button", { name: /^39/ }).click();
  await expect(dialog.getByRole("button", { name: "Sin stock", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: /^38/ }).click();
  await dialog.getByRole("spinbutton").fill("99");
  await expect(dialog.getByRole("spinbutton")).toHaveValue("3");
  await dialog.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts["casa-origen"].find((p: { id: string }) => p.id === "p4"))).toMatchObject({ productVariantId: "v1", precio: 145000, cantidad: 3 });
  for (const id of ["p5", "p8"]) await expect(page.locator(`[data-feed-product-id="${id}"]`).getByRole("button", { name: /agotado$/ })).toBeDisabled();
  expect(fake.actions.filter((a) => a.name === "refused")).toEqual([]);
  writeFileSync(`${out}/${phase}-commerce.json`, JSON.stringify({ actions: fake.actions.map((a) => a.name), followAndUnfollow: true, favoriteAddAndRemove: true, keyboardEnterAndSpace: true, whatsappOpened: true, quantity: 2, variantStockClamp: 3, exhaustedDisabled: true }, null, 2));
});

test(`social ${phase} anonymous behavior and original login request`, async ({ page }) => {
  test.skip(phase === "before", "Applied alternatives.");
  const fake = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/auth/login?**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Destino sintético de login</title><main>Login</main>" }));
  await openRoot(page);
  const card = await showCard(page, "p1");
  const favorite = card.getByRole("button", { name: /Guardar .* en favoritos/ });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await card.getByRole("button", { name: "Seguir", exact: true }).click();
  await expect(page.getByText("Inicia sesión para interactuar", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${out}/screenshots/${phase}-login-request.png` });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByText("Inicia sesión para interactuar", { exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/auth/login?callbackUrl=%2F");
  expect(fake.actions.some((a) => a.name === "toggleFollow")).toBe(false);
  writeFileSync(`${out}/${phase}-anonymous.json`, JSON.stringify({ localFavoritesUnchangedBehavior: true, followRequestsLogin: true, cancelWorks: true, loginUrl: page.url(), followMutationSent: false }, null, 2));
});

test(`social ${phase} badges, long names and light/dark photos`, async ({ page }) => {
  test.skip(phase === "before", "Applied alternatives.");
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const records = [];
  for (const id of ["p1", "p2", "p4", "p5", "p7", "p8"]) {
    const card = await showCard(page, id);
    const record = (await socialGeometry(page)).find((c) => c.id === id)!;
    expect(record.socialDomCounts).toEqual({ follow: 1, favorite: 1 });
    expect(record.overlaps).toEqual([]);
    for (const control of record.controls) {
      expect(control.hit).toBe(true);
      expect(control.badgeOverlap).toBe(false);
      expect(control.profileOverlap).toBe(false);
      expect(control.newSocialCentralOverlap).toBe(0);
    }
    await card.screenshot({ path: `${out}/screenshots/${phase}-edge-${id}.png`, animations: "disabled" });
    records.push(record);
  }
  writeFileSync(`${out}/${phase}-edges.json`, JSON.stringify(records, null, 2));
});

test(`social ${phase} product and business links are independent`, async ({ page }) => {
  test.skip(phase === "before", "Applied alternatives.");
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const destinations = ["/perfil/casa-origen", "/producto/reloj-minimalista"];
  await page.route("**/*", (route) => {
    if (!destinations.includes(new URL(route.request().url()).pathname)) return route.fallback();
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Destino sintético</title><main>Destino de tarjeta</main>" });
  });
  for (const [index, target] of destinations.entries()) {
    await openRoot(page);
    const card = await showCard(page, "p1");
    if (index === 0) await card.getByRole("link", { name: "Casa Origen", exact: true }).click();
    else await card.locator('a[href="/producto/reloj-minimalista"]').first().click();
    await expect(page).toHaveURL(`http://127.0.0.1:3000${target}`);
  }
  writeFileSync(`${out}/${phase}-navigation.json`, JSON.stringify(destinations, null, 2));
});
