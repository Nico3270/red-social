// Read-only smoke against the published domain. Never submits accounts, orders or messages.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const folder = 'docs/audits/centered-desktop-final-evidence';
const result = { widths: [], requests: [], httpErrors: [], pageErrors: [] };
const keys = page => page.locator('[data-feed-item-key]').evaluateAll(es => es.map(e => e.getAttribute('data-feed-item-key')));
const nav = page => page.locator('[data-discovery-navigation]');
async function snapshot(page, width, label) {
  const sample = await page.evaluate(() => {
    const box = el => { const r = el?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const root = document.querySelector('[data-centered-discovery]');
    const main = root?.querySelector('[data-desktop-tier] [class*="main"]');
    const side = root?.querySelector('[data-desktop-tier] aside');
    const navigation = root?.querySelector('[data-discovery-navigation]');
    const header = document.querySelector('[class*="prototypeMain"]');
    const entry = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Tengo un negocio' && a.getBoundingClientRect().width);
    const groups = [...document.querySelectorAll('[data-desktop-tier]')].map(el => ({ tier: el.getAttribute('data-desktop-tier'), top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom }));
    const innerContentScrolls = [...(root?.querySelectorAll('[class*="feedContent"] *') || [])].filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1).length;
    return { scroll: scrollY, main: box(main), side: box(side), navigation: box(navigation), header: box(header), businessEntry: box(entry), groups, innerContentScrolls, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const ids = await keys(page); assert.equal(new Set(ids).size, ids.length); assert.equal(sample.overflow, false);
  if (width >= 1440) {
    assert.equal(sample.main.width, 680); assert.equal(sample.main.x + 340, width / 2);
    if (sample.side) assert.equal(sample.side.width, 320);
    assert.equal(sample.header.y, 0); assert.equal(sample.header.height, 72);
    assert.ok(sample.businessEntry.y >= 0 && sample.businessEntry.y + sample.businessEntry.height <= 72);
    assert.ok(sample.navigation.y >= 87); assert.equal(sample.innerContentScrolls, 0);
    for (let i = 1; i < sample.groups.length; i++) assert.ok(sample.groups[i].top >= sample.groups[i - 1].bottom);
  }
  return { label, width, ids, ...sample };
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROMIUM_PATH || '/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome' });
  try {
    for (const width of [1440, 1920, 1439, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addCookies([{ name: 'myckeo-consent', value: 'true', domain: 'myckeo.com', path: '/' }]);
      await context.addInitScript(() => { if (!localStorage.getItem('preferences-storage')) localStorage.setItem('preferences-storage', JSON.stringify({ state: { ciudad: 'Tunja', departamento: 'Boyacá', preferencias: [], secciones: [], seenIds: [], userLat: null, userLong: null }, version: 0 })); });
      // Only initialize fresh sessions once. Navigation and city changes keep their actual storage state.
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          let args; try { args = JSON.parse(request.postData() || 'null', (_key, value) => value === '$undefined' ? undefined : value); } catch {}
          if (url.origin === 'https://myckeo.com' && request.headers()['next-action'] && ['products', 'publications', 'services', 'businesses'].includes(args?.[0])) {
            result.requests.push({ width, type: args[0], city: args[1]?.ciudad, hasCursor: Boolean(args[1]?.cursor) }); return route.continue();
          }
          return route.abort();
        }
        if (/wa\.me|whatsapp\.com|googletagmanager|google-analytics|doubleclick/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => result.pageErrors.push({ width, message: error.message }));
      page.on('response', response => { if (response.status() >= 400) result.httpErrors.push({ width, url: response.url(), status: response.status() }); });
      await page.goto('https://myckeo.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await expect(page.locator('[data-feed-item-key]').first()).toBeVisible({ timeout: 60000 });
      if (width >= 1440) await expect(nav(page)).toBeVisible();
      await page.waitForTimeout(3000);
      const states = [await snapshot(page, width, 'top')];
      await page.screenshot({ path: `${folder}/production-${width}-top.png` });
      if (width >= 1440) {
        for (const scroll of [200, 950, 1800]) {
          await page.evaluate(y => scrollTo(0, y), scroll); await page.waitForTimeout(400);
          states.push(await snapshot(page, width, 'scroll-' + scroll));
          if (scroll === 950) await page.screenshot({ path: `${folder}/production-${width}-scroll.png` });
        }
        if (width === 1440) {
          await page.setViewportSize({ width, height: 600 });
          await nav(page).locator('summary').click();
          const links = nav(page).getByRole('navigation', { name: 'Categorías', exact: true }).getByRole('link');
          await expect(links).toHaveCount(18); await links.last().focus();
          const last = await links.last().boundingBox(); assert.ok(last.y >= 88 && last.y + last.height <= 585);
          await page.screenshot({ path: `${folder}/production-expanded-600.png` });
          await nav(page).locator('summary').click(); await page.setViewportSize({ width, height: 900 });
          await page.getByRole('button', { name: 'Cambiar a pestaña Publicaciones', exact: true }).click();
          await expect(nav(page)).toHaveCount(0);
          await page.getByRole('button', { name: 'Cambiar a pestaña Para ti', exact: true }).click(); await expect(nav(page)).toBeVisible();
          const initial = await keys(page), lanes = await page.locator('[data-feed-item-key]').evaluateAll(es => es.map(e => ({ key: e.getAttribute('data-feed-item-key'), side: Boolean(e.closest('aside')) })));
          const counts = [initial.length];
          for (let i = 0; i < 3; i++) {
            await page.locator('[data-feed-sentinel]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1600); counts.push((await keys(page)).length);
            if (await page.locator('[data-feed-complete]').count()) break;
          }
          const continued = await keys(page); assert.equal(new Set(continued).size, continued.length);
          for (const id of initial) assert.ok(continued.includes(id));
          const after = await page.locator('[data-feed-item-key]').evaluateAll(es => es.map(e => ({ key: e.getAttribute('data-feed-item-key'), side: Boolean(e.closest('aside')) })));
          assert.deepEqual(after.filter(item => initial.includes(item.key)), lanes);
          result.continuation = { counts, unique: true, priorCardsRetained: true, lanesRetained: true, reachedEnd: Boolean(await page.locator('[data-feed-complete]').count()) };
          await page.getByRole('button', { name: /Cambiar ubicación/ }).click();
          let selects = page.getByRole('combobox').filter({ visible: true });
          await selects.nth((await selects.count()) - 2).click(); await page.getByRole('option', { name: 'Cundinamarca', exact: true }).click();
          selects = page.getByRole('combobox').filter({ visible: true }); await selects.nth((await selects.count()) - 1).click(); await page.getByRole('option', { name: 'Bogotá', exact: true }).click();
          await page.getByRole('button', { name: 'Actualizar Ubicación', exact: true }).click();
          await expect(page.getByRole('button', { name: /Cambiar ubicación: Bogotá/ })).toBeVisible();
          await expect(page.locator('[data-desktop-tier="0"]')).toContainText('Bogotá');
          await page.waitForTimeout(3500); const cityIds = await keys(page); assert.equal(new Set(cityIds).size, cityIds.length);
          result.cityChange = { city: 'Bogotá', count: cityIds.length, readRequestsWithNewCity: result.requests.filter(r => r.city === 'Bogotá').length };
          assert.ok(result.cityChange.readRequestsWithNewCity > 0);
        }
      } else {
        await expect(nav(page)).toHaveCount(0); await expect(page.locator('[data-feed-complete]')).toHaveCount(0);
        if (width === 390) {
          const card = page.locator('[data-feed-product-id]').filter({ has: page.locator('a[href^="https://wa.me/"]') }).first();
          const mobile = await card.evaluate(el => {
            const visible = selector => [...el.querySelectorAll(selector)].find(e => e.getBoundingClientRect().width > 0);
            const whatsapp = visible('a[href^="https://wa.me/"]').getBoundingClientRect();
            const cart = [...el.querySelectorAll('button')].find(e => /Agregar .* al carrito|Elegir opciones|Ver opciones/.test(e.getAttribute('aria-label') || '') && e.getBoundingClientRect().width > 0).getBoundingClientRect();
            const price = el.querySelector('[class*="priceBlock"]').getBoundingClientRect(), avatar = el.querySelector('[class*="avatarPhoto"]').getBoundingClientRect(), badge = el.querySelector('[class*="avatarIcon"]').getBoundingClientRect();
            return { row: Math.abs(whatsapp.top - cart.top) < 12 && price.top < whatsapp.bottom && price.bottom > whatsapp.top, badge: avatar.right > badge.left && badge.right > avatar.left && avatar.bottom > badge.top && badge.bottom > avatar.top };
          });
          assert.equal(mobile.row, true); assert.equal(mobile.badge, true); result.mobile = mobile;
        }
      }
      result.widths.push({ width, states }); await context.close();
    }
    assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.httpErrors, []);
    result.passed = true; console.log('Public check passed: real content, sticky navigation, city/continuation, desktop and mobile.');
  } catch (error) {
    result.failure = error.message;
    throw error;
  } finally {
    fs.writeFileSync(`${folder}/production-results.json`, JSON.stringify(result, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
