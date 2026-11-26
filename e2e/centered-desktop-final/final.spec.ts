import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, settled } from "../centered-feed/browser-support.cjs";

const evidence = "docs/audits/centered-desktop-final-evidence";
const complete = "Estás al día. Sigue explorando productos y negocios";
const rail = (page: Page) => page.locator("[data-discovery-navigation]");
async function ready(page: Page, url = "/?scenario=balanced") {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-centered-discovery]")).toBeVisible({ timeout: 60000 });
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await settled(page);
}

test("sticky navigation, stable columns, fixed header and overlay precedence", async ({ page }) => {
  const errors = await setup(page);
  const results = [];
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    for (const scroll of [0, 180, 950, 2100]) {
      await page.evaluate(y => scrollTo(0, y), scroll);
      await expect.poll(async () => (await rail(page).boundingBox())!.y).toBeGreaterThanOrEqual(87);
      const navigation = (await rail(page).boundingBox())!;
      expect(navigation.y).toBeLessThanOrEqual(scroll ? 89 : 97);
      const main = (await page.locator('[data-desktop-tier]').first().locator('[class*="main"]').first().boundingBox())!;
      const side = (await page.locator('[data-desktop-tier]').first().locator('aside').boundingBox())!;
      expect(main.width).toBe(680);
      expect(main.x + main.width / 2).toBe(width / 2);
      expect(side.width).toBe(320);
      const header = (await page.locator('[class*="prototypeMain"]').boundingBox())!;
      expect(header.y).toBe(0); expect(header.height).toBe(72);
      const business = (await page.getByRole('link', { name: 'Tengo un negocio', exact: true }).boundingBox())!;
      expect(business.y).toBeGreaterThanOrEqual(0); expect(business.y + business.height).toBeLessThanOrEqual(72);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      const innerContentScrolls = await page.locator('[class*="feedContent"] *').evaluateAll(elements => elements.filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).length);
      expect(innerContentScrolls).toBe(0);
      results.push({ width, scroll, navigation, main, side, header });
      if (scroll === 0 || scroll === 950) await page.screenshot({ path: `${evidence}/local-${width}-${scroll ? 'scroll' : 'top'}.png` });
    }
    await page.getByRole('button', { name: /^Perfil/ }).click();
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
    expect(await page.evaluate(() => !document.elementFromPoint(innerWidth - 100, 120)?.closest('[data-discovery-navigation]'))).toBe(true);
    await page.keyboard.press('Escape');
    const product = page.locator('[data-feed-product-id]').first();
    await product.getByRole('button', { name: /Agregar .* al carrito|Elegir opciones|Ver opciones/ }).filter({ visible: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => !document.elementFromPoint(100, 120)?.closest('[data-discovery-navigation]'))).toBe(true);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
  expect(errors).toEqual([]);
  writeFileSync(`${evidence}/sticky-columns.json`, JSON.stringify({ results, errors }, null, 2));
});

test("expanded categories remain keyboard accessible in short windows and release document scroll", async ({ page }) => {
  const errors = await setup(page); const results = [];
  for (const width of [1440, 1920]) for (const height of [900, 600, 360]) {
    await page.setViewportSize({ width, height }); await ready(page);
    const initialMain = (await page.locator('[data-feed-item-key]').first().boundingBox())!;
    await rail(page).locator('summary').click();
    expect((await page.locator('[data-feed-item-key]').first().boundingBox())!.y).toBe(initialMain.y);
    const links = rail(page).getByRole('navigation', { name: 'Categorías', exact: true }).getByRole('link');
    await expect(links).toHaveCount(18);
    await page.evaluate(() => scrollTo(0, 950));
    await links.last().focus();
    const last = (await links.last().boundingBox())!;
    expect(last.y).toBeGreaterThanOrEqual(88); expect(last.y + last.height).toBeLessThanOrEqual(height - 15);
    expect(await links.last().evaluate(el => { const box = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); })).toBe(true);
    await page.keyboard.press('Shift+Tab'); await expect(links.nth(16)).toBeFocused();
    const nav = (await rail(page).boundingBox())!;
    expect(nav.y).toBeGreaterThanOrEqual(88); expect(nav.y + nav.height).toBeLessThanOrEqual(height - 15);
    if (width === 1440) await page.screenshot({ path: `${evidence}/local-expanded-${height}.png` });
    await rail(page).evaluate(el => { el.scrollTop = el.scrollHeight; });
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(nav.x + nav.width / 2, nav.y + nav.height / 2); await page.mouse.wheel(0, 450);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const footer = (await page.locator('footer').boundingBox())!;
    const endNav = (await rail(page).boundingBox())!;
    expect(endNav.y + endNav.height).toBeLessThanOrEqual(footer.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    results.push({ width, height, last, navigation: nav, footer, endNav });
  }
  expect(errors).toEqual([]); writeFileSync(`${evidence}/expanded-navigation.json`, JSON.stringify({ results, errors }, null, 2));
});

test("compact completion only follows delivered content with no continuation or pending load", async ({ page }) => {
  const errors = await setup(page); const results = [];
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 900 }); await ready(page, '/?scenario=sparse');
    const status = page.locator('[data-feed-complete][role="status"]'); await expect(status).toHaveText(complete);
    expect((await status.boundingBox())!.height).toBeLessThan(100);
    await expect(page.getByRole('img', { name: 'No hay más para ti', exact: true })).toHaveCount(0);
    await expect(page.locator('[data-feed-item-key]')).toHaveCount(2);
    await page.locator('[data-feed-sentinel]').scrollIntoViewIfNeeded(); await settled(page);
    await page.screenshot({ path: `${evidence}/local-sparse-end-${width}.png` });
    for (const state of ['empty', 'loading', 'more', 'loading-with-content', 'pending-types', 'error']) {
      await page.goto('/?scenario=sparse&state=' + state, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-centered-discovery]')).toBeVisible();
      await expect(page.locator('[data-feed-complete]')).toHaveCount(0);
      await expect(page.locator('[data-feed-sentinel]')).toHaveCount(1);
      if (state === 'empty') {
        await expect(page.getByText('Aun no encontramos contenido ideal para ti', { exact: false })).toBeVisible();
        await expect(page.getByRole('img', { name: 'No hay para ti disponibles', exact: true })).toBeVisible();
      } else if (state.startsWith('loading')) {
        await expect(page.locator('.animate-pulse')).toHaveCount(8);
        await expect(page.getByText('Aun no encontramos contenido ideal para ti', { exact: false })).toHaveCount(0);
      }
      const count = await page.locator('[data-feed-item-key]').count();
      expect(count).toBe(['empty', 'loading'].includes(state) ? 0 : 2);
      results.push({ width, state, count, completed: false });
      if (width === 1440 && ['empty', 'loading'].includes(state)) await page.screenshot({ path: `${evidence}/local-${state}-1440.png` });
    }
  }
  expect(errors).toEqual([]); writeFileSync(`${evidence}/completion-states.json`, JSON.stringify({ results, errors }, null, 2));
});

test("tab return and below-threshold layouts preserve the published ending", async ({ page }) => {
  const errors = await setup(page); const results = [];
  await page.setViewportSize({ width: 1440, height: 900 }); await ready(page);
  await page.getByRole('button', { name: 'Cambiar a pestaña Publicaciones', exact: true }).click();
  await expect(rail(page)).toHaveCount(0); await expect(page.locator('[data-feed-complete]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cambiar a pestaña Para ti', exact: true }).click();
  await expect(rail(page)).toBeVisible(); await expect(page.getByRole('button', { name: 'Cambiar a pestaña Para ti', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => scrollTo(0, 950)); await expect.poll(async () => (await rail(page).boundingBox())!.y).toBe(88);
  for (const width of [1439, 390]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/?scenario=sparse');
    await expect(page.locator('[data-feed-item-key]').first()).toBeVisible(); await settled(page);
    await expect(rail(page)).toHaveCount(0); await expect(page.locator('[data-feed-complete]')).toHaveCount(0);
    await expect(page.getByText('No hay más para ti.', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'No hay más para ti', exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `${evidence}/local-${width}-regression.png` });
    results.push({ width, centered: false, originalEnding: true });
  }
  expect(errors).toEqual([]); writeFileSync(`${evidence}/tab-boundary-mobile.json`, JSON.stringify({ results, errors }, null, 2));
});
