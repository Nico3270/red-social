import { test, expect } from "@playwright/test";
import { boundaries } from "../mobile-feed-implementation/boundaries";
import { writeFileSync } from "node:fs";

const before = process.env.PUBLIC_UI_BEFORE === "1";
const phase = before ? "before" : "after";
const evidence = process.env.PUBLIC_UI_EVIDENCE_DIR || "docs/audits/public-ui-evidence";

for (const width of [360, 390, 430, 1440]) {
  test(`${phase}: feed and contact at ${width}px`, async ({ page }) => {
    await boundaries(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const card = page.locator('[data-feed-product-id="p1"]');
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Este tramo prioriza|discovery siga siendo comercial|DISCOVERY PRINCIPAL/)).toHaveCount(0);
    await page.screenshot({ path: `${evidence}/${phase}-feed-${width}.png`, fullPage: true, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const wa = card.locator('a[href^="https://wa.me/"]');
    await expect(wa).toHaveAttribute("href", new RegExp(`^https://wa.me/${before ? "" : "57"}3100000000\\?text=`));
    const message = new URL((await wa.getAttribute("href"))!).searchParams.get("text")!;
    expect(message).toContain("Café de origen");
    expect(message).toContain("/producto/cafe-origen");
    // The fixture route uses real cards, layout and feed; no persistent writes.
    await page.route("**/*", async route => {
      if (route.request().method() === "POST") return route.fulfill({
        headers: { "content-type": "text/x-component" },
        body: '0:{"a":"$@1","f":[],"b":"development"}\n1:{"items":[]}\n',
      });
      return route.fallback();
    });
    const response = await page.goto("/contacto");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: before ? "Explora esta categoría" : "Contacto" })).toBeVisible();
    if (!before) await expect(page.getByRole("link", { name: "soporte@myckeo.com" })).toHaveAttribute("href", "mailto:soporte@myckeo.com");
    await page.screenshot({ path: `${evidence}/${phase}-contact-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test(`${phase}: categories and unknown slugs`, async ({ page }) => {
  await boundaries(page);
  await page.route("**/*", async route => {
    if (route.request().method() === "POST") return route.fulfill({
      headers: { "content-type": "text/x-component" },
      body: '0:{"a":"$@1","f":[],"b":"development"}\n1:{"items":[]}\n',
    });
    return route.fallback();
  });
  for (const [slug, name] of [["comida", "Comida"], ["moda", "Moda y Accesorios"], ["negocios", "Negocios"]]) {
    for (const prefix of ["/category/", "/"]) {
      expect((await page.goto(prefix + slug))?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: before && prefix === "/" ? "Explora esta categoría" : name, exact: true })).toBeVisible();
    }
  }
  for (const path of ["/auditoria-ruta-inexistente-20261124", "/category/auditoria-ruta-inexistente-20261124"]) {
    expect((await page.goto(path))?.status()).toBe(before ? 200 : 404);
  }
});

test("after: business, service, product, detail and profile agree on destination", async ({ page }) => {
  test.skip(before);
  await boundaries(page);
  for (const [phone, expected] of [["3182293083", "573182293083"], ["+57 (318) 229-3083", "573182293083"], ["573182293083", "573182293083"], ["+1 202 555-0123", "12025550123"], ["", ""]]) {
    await page.goto(`/?view=contact-paths&phone=${encodeURIComponent(phone)}`);
    const profile = page.locator('[data-audit-contact="profile"]');
    await profile.getByText("Info y contacto", { exact: true }).click();
    for (const component of ["business", "legacy-business", "service", "product", "detail", "profile"]) {
      const links = page.locator(`[data-audit-contact="${component}"] a[href^="https://wa.me/"]`);
      if (!expected) await expect(links).toHaveCount(0);
      else {
        expect(await links.count(), component).toBeGreaterThan(0);
        for (const href of await links.evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href))) {
          expect(new URL(href).pathname, component).toBe(`/${expected}`);
          if (["product", "detail"].includes(component)) {
            expect(new URL(href).searchParams.get("text")).toContain("Café de origen");
            expect(new URL(href).searchParams.get("text")).toContain("https://myckeo.com/producto/cafe-origen");
          }
        }
      }
    }
  }
});

test("after: independent mobile actions, business link and commerce row", async ({ page }) => {
  test.skip(before);
  const fake = await boundaries(page);
  const measurements = [];
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const card = page.locator('[data-feed-product-id="p1"]');
    await expect(card).toBeVisible();
    const wa = card.locator('a[href^="https://wa.me/"]');
    const cart = card.getByRole("button", { name: /Agregar .* al carrito/ });
    const geometry = await card.evaluate((el) => {
      const wa = el.querySelector('a[href^="https://wa.me/"]')!.getBoundingClientRect();
      const cart = [...el.querySelectorAll("button")].find(b => /Agregar .* al carrito/.test(b.getAttribute("aria-label") || ""))!.getBoundingClientRect();
      const price = el.querySelector('[class*="priceBlock"]')!.getBoundingClientRect();
      const photo = el.querySelector('[class*="avatarPhoto"]')!.getBoundingClientRect();
      const badge = el.querySelector('[class*="avatarIcon"]')!.getBoundingClientRect();
      return { wa: { top: wa.top, height: wa.height }, cart: { top: cart.top, height: cart.height }, price: { top: price.top, bottom: price.bottom }, badgeOverAvatar: photo.width > 0 && Math.min(photo.right,badge.right) > Math.max(photo.left,badge.left) && Math.min(photo.bottom,badge.bottom) > Math.max(photo.top,badge.top) };
    });
    expect(Math.abs(geometry.wa.top - geometry.cart.top)).toBeLessThan(12);
    expect(geometry.wa.height).toBeGreaterThanOrEqual(40);
    expect(geometry.price.bottom).toBeGreaterThan(geometry.wa.top);
    expect(geometry.price.top).toBeLessThan(geometry.wa.top + geometry.wa.height);
    if (width < 768) expect(geometry.badgeOverAvatar).toBe(true);
    measurements.push({ width, ...geometry });
    const popupPromise = page.waitForEvent("popup");
    await wa.click();
    await (await popupPromise).close(); // External request is blocked by boundaries().
    await expect(page).toHaveURL("http://127.0.0.1:3400/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await cart.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(page).toHaveURL("http://127.0.0.1:3400/");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("carro_negocios")!).state.carts["casa-origen"][0].id)).toBe("p1");
    await card.getByRole("button", { name: "Seguir a Casa Origen", exact: true }).click();
    await expect(page.getByText("Inicia sesión para interactuar", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(card.getByRole("link", { name: "Casa Origen", exact: true })).toHaveAttribute("href", "/perfil/casa-origen");
  }
  expect(fake.actions.some(a => a.name === "toggleFollow")).toBe(false);
  writeFileSync(`${evidence}/mobile-actions.json`, JSON.stringify(measurements, null, 2));
});

test("after: footer, favorites, cart and existing owner entry", async ({ page }) => {
  test.skip(before);
  test.setTimeout(180_000);
  await boundaries(page);
  // Let NextAuth's real signin redirect run; the generic fixture API handler
  // deliberately returns JSON for other unrecognized API GETs.
  await page.route("**/api/auth/**", route => {
    if (new URL(route.request().url()).pathname === "/api/auth/session") return route.fallback();
    return route.continue();
  });
  await page.goto("/");
  await page.locator('footer a[href="/contacto"]').click();
  await expect(page.getByRole("heading", { name: "Contacto", exact: true })).toBeVisible();
  for (const path of ["/politica-privacidad", "/politica-cookies", "/terminos-servicio", "/politica-publicidad"]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/favoritos");
  await expect(page.getByRole("heading", { name: "Mis Favoritos" })).toBeVisible();
  await page.goto("/carro");
  await expect(page.getByRole("heading", { name: "Tu Carrito de Compras" })).toBeVisible();
  await page.goto("/");
  await page.getByText("Perfil", { exact: true }).click();
  await page.getByText("Ingresar", { exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/, { timeout: 60_000 });
  await page.locator('a[href="/auth/new-account"]').click();
  await expect(page.getByRole("heading", { name: "Cuenta de Negocio", exact: true })).toBeVisible();
  // This selector is a server-rendered div, not a native button. Wait for its
  // React click handler before interacting so the click is not lost to hydration.
  await page.waitForFunction(() => {
    const heading = [...document.querySelectorAll("h3")].find(el => el.textContent === "Cuenta de Negocio");
    const card = heading?.parentElement;
    return card && Object.entries(card).some(([key, value]) => key.startsWith("__reactProps$") && typeof value?.onClick === "function");
  });
  await page.getByRole("heading", { name: "Cuenta de Negocio", exact: true }).locator("..").click();
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  // Stop before submitting registration or contacting any business.
});
