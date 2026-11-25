import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { browserDataset } from "../geography-pagination/data.cjs";
const evidence = "docs/audits/desktop-feed-evidence";
async function setup(page: Page) {
  const requests: Array<{ type: string; city: string; cursor: boolean; seen: string[] }> = [];
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.context().addCookies([{ name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" }]);
  await page.addInitScript(() => localStorage.setItem("preferences-storage", JSON.stringify({ state: { ciudad: "Tunja", departamento: "Boyacá", preferencias: [], secciones: [], seenIds: [], userLat: null, userLong: null }, version: 0 })));
  await page.route("**/*", route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== "http://127.0.0.1:3400") return route.abort();
    if (url.pathname === "/api/auth/session") return route.fulfill({ json: null });
    if (req.method() === "POST") {
      let args;
      try { args = JSON.parse(req.postData() || "null", (_key, value) => value === "$undefined" ? undefined : value); } catch {}
      if (!req.headers()["next-action"] || !["products", "publications", "services", "businesses"].includes(args?.[0])) return route.abort();
      requests.push({ type: args[0], city: args[1].ciudad, cursor: !!args[1].cursor, seen: args[1].seenIds });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
    return route.continue();
  });
  return { requests, errors };
}
const keys = (page: Page) => page.locator("[data-feed-item-key]").evaluateAll(els => els.map(el => el.getAttribute("data-feed-item-key")!));
async function geography(page: Page) {
  const groups = await page.locator("[data-desktop-tier]").evaluateAll(els => els.map(el => {
    const cards = [...el.querySelectorAll("[data-feed-item-key]")].map(card => card.getBoundingClientRect());
    return { tier: Number(el.getAttribute("data-desktop-tier")), top: Math.min(...cards.map(c => c.top)), bottom: Math.max(...cards.map(c => c.bottom)) };
  }));
  expect(groups.map(g => g.tier)).toEqual([...groups.map(g => g.tier)].sort());
  for (let i = 1; i < groups.length; i++) expect(groups[i].top).toBeGreaterThanOrEqual(groups[i - 1].bottom);
  return groups;
}
async function drain(page: Page) {
  for (let i = 0; i < 70; i++) {
    if (await page.getByText("No hay más para ti.", { exact: true }).count()) return;
    const count = await keys(page);
    await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect.poll(async () => (await keys(page)).length !== count.length || !!(await page.getByText("No hay más para ti.", { exact: true }).count())).toBe(true);
  }
  throw new Error("Feed did not finish");
}
function expected(seen: string[] = []) {
  const types: Record<string, string> = { products: "product", publications: "publication", services: "service", businesses: "business" };
  const prefix: Record<string, string> = { products: "product", publications: "publication", services: "servicio", businesses: "negocio" };
  return Object.entries(browserDataset()).flatMap(([type, rows]) => (rows as Array<{ id: string }>).filter(r => !/-hidden|-unavailable/.test(r.id) && !seen.includes(prefix[type] + r.id)).map(r => `${types[type]}-${r.id}`)).sort();
}

test("inventory balance, all identities, geographic boundaries and one page scroll", async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 1440, height: 900 });
  const measurements = [];
  for (const [scenario, count] of [["balanced", 31], ["commerce", 39], ["only-commerce", 31], ["social", 16], ["sparse", 10]] as const) {
    await page.goto(`/?scenario=${scenario}`);
    await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
    const ids = await keys(page);
    expect(ids.length).toBe(count); expect(new Set(ids).size).toBe(count);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const groups = await geography(page);
    const balance = await page.locator('[data-desktop-tier="0"]').evaluate(el => {
      const columns = el.querySelector('[class*="columns"]')!;
      const lanes = [...columns.children].map(e => e.getBoundingClientRect().height);
      return { lanes, tailGap: lanes.length > 1 ? Math.abs(lanes[0] - lanes[1]) : 0,
        nestedScroll: [...el.querySelectorAll("*")].some(e => getComputedStyle(e).overflowY === "auto" && e.scrollHeight > e.clientHeight + 1) };
    });
    expect(balance.tailGap).toBeLessThan(650); expect(balance.nestedScroll).toBe(false);
    measurements.push({ scenario, count, groups, balance });
    if (["commerce", "sparse", "only-commerce", "social"].includes(scenario)) await page.screenshot({ path: `${evidence}/inventory-${scenario}-1440.png` });
  }
  writeFileSync(`${evidence}/inventory.json`, JSON.stringify(measurements, null, 2));
});

test("desktop actions, review relationship, and unchanged mobile layout", async ({ page }) => {
  const state = await setup(page); await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?scenario=balanced"); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  const review = page.locator('[data-feed-item-key="publication-pub-0-1"]');
  await expect(review.getByRole("link", { name: "Café de origen · 250 g" })).toHaveAttribute("href", "/producto/cafe-origen-0-0");
  await expect(review.getByText("4.7")).toBeVisible();
  const product = page.locator('[data-feed-product-id="p-0-0"]');
  const wa = product.locator('a[href^="https://wa.me/"]').filter({ visible: true });
  const target = new URL((await wa.getAttribute("href"))!);
  expect(target.pathname).toBe("/573100000000"); expect(target.searchParams.get("text")).toContain("Café de origen");
  expect(target.searchParams.get("text")).toContain("cafe-origen");
  await expect(product.getByRole("link", { name: "Casa Origen", exact: true })).toHaveAttribute("href", "/perfil/casa-origen");
  const favorite = product.getByRole("button", { name: /favoritos/i }).first();
  await favorite.click(); await expect(favorite).toHaveAttribute("aria-pressed", "true"); expect(page.url()).toContain("scenario=balanced");
  await product.getByRole("button", { name: /Agregar .* al carrito/ }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); expect(page.url()).toContain("scenario=balanced");
  await page.keyboard.press("Escape");
  await page.goto("/?scenario=balanced");
  await page.locator('[data-feed-item-key="publication-pub-0-0"]').getByRole("button", { name: "Ver publicación", exact: true }).click();
  await expect(page.getByRole("button", {name:"Cerrar modal",exact:true})).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto("/?scenario=balanced");
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  const mobile = page.locator('[data-feed-product-id="p-0-0"]');
  const geometry = await mobile.evaluate(el => {
    const rect = (selector: string) => el.querySelector(selector)!.getBoundingClientRect();
    const w = [...el.querySelectorAll('a[href^="https://wa.me/"]')].find(e => e.getBoundingClientRect().width > 0)!.getBoundingClientRect();
    const c = [...el.querySelectorAll("button")].find(e => /Agregar .* al carrito/.test(e.getAttribute("aria-label") || "") && e.getBoundingClientRect().width > 0)!.getBoundingClientRect();
    const price = rect('[class*="priceBlock"]'), photo = rect('[class*="avatarPhoto"]'), follow = rect('[class*="avatarIcon"]');
    return { row: Math.abs(w.y - c.y), priceAligned: price.bottom >= w.top && price.top <= w.bottom, touch: Math.min(w.width, w.height, c.width, c.height), overlay: follow.left < photo.right && follow.right > photo.left && follow.top < photo.bottom && follow.bottom > photo.top, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(geometry.row).toBeLessThan(2); expect(geometry.priceAligned).toBe(true); expect(geometry.touch).toBeGreaterThanOrEqual(44); expect(geometry.overlay).toBe(true); expect(geometry.overflow).toBe(false);
  expect(state.errors).toEqual([]); writeFileSync(`${evidence}/actions-mobile.json`, JSON.stringify({ geometry, errors: state.errors }, null, 2));
});

test("real coordinator: desktop continuation then city selection without mixed pages", async ({ page }) => {
  const state = await setup(page); await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?view=live"); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await drain(page); const tunja = await keys(page);
  expect([...tunja].sort()).toEqual(expected()); expect(new Set(tunja).size).toBe(tunja.length); await geography(page);
  expect(state.requests.some(r => r.city === "Tunja" && r.cursor)).toBe(true);
  await page.getByRole("button", { name: /Cambiar ubicación/ }).click();
  let selects = page.getByRole("combobox").filter({ visible: true });
  await selects.nth((await selects.count()) - 2).click(); await page.getByRole("option", { name: "Cundinamarca", exact: true }).click();
  selects = page.getByRole("combobox").filter({ visible: true }); await selects.nth((await selects.count()) - 1).click();
  await page.getByRole("option", { name: "Bogotá", exact: true }).click(); await page.getByRole("button", { name: "Actualizar Ubicación", exact: true }).click();
  await expect(page.getByRole("button", { name: /Cambiar ubicación: Bogotá/ })).toBeVisible();
  await expect.poll(() => state.requests.some(r => r.city === "Bogotá")).toBe(true);
  await expect(page.locator('[data-desktop-tier="0"]')).toContainText("Bogotá");
  await drain(page); const bogota = await keys(page);
  // Existing seen-ID recycling may start another traversal after exhaustion.
  const current = state.requests.filter(r => r.city === "Bogotá" && !r.cursor).at(-1)!;
  expect([...bogota].sort()).toEqual(expected(current.seen)); expect(new Set(bogota).size).toBe(bogota.length); await geography(page);
  const tierIds = await page.locator('[data-desktop-tier="0"] [data-feed-item-key]').evaluateAll(els => els.map(e => e.getAttribute("data-feed-item-key")!));
  expect(tierIds.every(id => id.includes("-national-"))).toBe(true); expect(state.errors).toEqual([]);
  writeFileSync(`${evidence}/continuation-city.json`, JSON.stringify({ tunja, bogota, requests: state.requests, errors: state.errors }, null, 2));
});

test("scope: 1279px, other tabs and categories retain the published composition", async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 1279, height: 900 });
  await page.goto("/?scenario=balanced"); await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 }); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  await page.getByRole("button", { name: "Cambiar a pestaña Productos", exact: true }).click();
  await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  expect(await page.locator("header").evaluate(el => el.getBoundingClientRect().height)).toBe(215);
  await page.goto("/category/comida"); await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  expect(await page.locator("[data-feed-item-key]").count()).toBeGreaterThan(0);
});


test("a pending commercial action survives new publications without moving existing cards", async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?scenario=balanced"); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  const before = await page.locator('[data-desktop-tier="0"] [data-feed-item-key]').evaluateAll(els => els.map(e => ({ key:e.getAttribute("data-feed-item-key"), side:!!e.closest("aside") })));
  const product = page.locator('[data-feed-product-id="p-0-6"]');
  await product.getByRole("button", { name:/Agregar .* al carrito/ }).filter({visible:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => (window as unknown as {__desktopAppend:()=>void}).__desktopAppend());
  await expect(page.locator('[data-desktop-tier="0"] [data-feed-item-key]')).toHaveCount(23);
  await expect(page.getByRole("dialog")).toBeVisible();
  const after = await page.locator('[data-desktop-tier="0"] [data-feed-item-key]').evaluateAll(els => els.map(e => ({ key:e.getAttribute("data-feed-item-key"), side:!!e.closest("aside") })));
  expect(after.filter(e => before.some(old => old.key === e.key))).toEqual(before);
  expect(new Set(after.map(e => e.key)).size).toBe(23);
  writeFileSync(`${evidence}/append-continuity.json`, JSON.stringify({before,after,dialogStillOpen:true},null,2));
});
