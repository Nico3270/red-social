const { chromium } = require("@playwright/test"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next")] }),
);
const { setup, ready, settled } = require("../mobile-premium-v2/browser.cjs");
const folder = "docs/audits/mobile-premium-v2-release-evidence",
  snapshot = require("../../docs/audits/centered-feed-evidence/comparison-sample.json");
const inspect = (el) => {
  const b = (e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  const image = el.querySelector(
      '[class*="media"] img:not([aria-hidden]):not([alt=""])',
    ),
    wa = [...el.querySelectorAll('a[href^="https://wa.me/"]')].find(
      (e) => e.getBoundingClientRect().width,
    ),
    cart = [...el.querySelectorAll("button")].find(
      (e) =>
        /Agregar|Elegir opciones/.test(e.getAttribute("aria-label") || "") &&
        e.getBoundingClientRect().width,
    );
  return {
    image: image && {
      src: image.currentSrc,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    },
    wa: b(wa),
    cart: b(cart),
    price: b(el.querySelector('[class*="priceBlock"]')),
    follow: el
      .querySelector("[data-avatar-follow]")
      ?.getAttribute("aria-label"),
    badge: !!el.querySelector('[class*="avatarIcon"]'),
  };
};
(async () => {
  const browser = await chromium.launch({
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    }),
    records = [];
  try {
    for (const width of [320, 390, 430]) {
      const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = await setup(page);
      await ready(page);
      assert.equal(
        (await page.locator("[data-mobile-navigation] header").boundingBox())
          .height,
        64,
      );
      assert.equal(await page.locator('[class*="businessRail"]').count(), 0);
      assert.equal(
        await page
          .locator("[data-mobile-bottom] a,[data-mobile-bottom] button")
          .count(),
        6,
      );
      for (const [index, label] of ["food", "shoe", "fashion"].entries()) {
        const item = snapshot.items.filter((i) => i.type === "product")[index],
          card = page.locator(`[data-feed-product-id="${item.id}"]`);
        await card.scrollIntoViewIfNeeded();
        await settled(page);
        await card
          .locator('[class*="media"] img:not([aria-hidden]):not([alt=""])')
          .evaluate(async (i) => i.decode());
        const state = await card.evaluate(inspect);
        assert(state.image.complete && state.image.naturalWidth > 0);
        for (const action of [state.wa, state.cart])
          assert(action.width >= 44 && action.height >= 44);
        assert(Math.abs(state.wa.y - state.cart.y) < 1);
        assert(
          state.price.y < state.cart.y + 44 &&
            state.price.y + state.price.height > state.cart.y,
        );
        assert(state.follow && state.badge);
        await card.screenshot({
          path: `${folder}/candidate-${label}-${width}.png`,
        });
        records.push({ width, label, state });
      }
      for (const [id, label] of [
        ["cmf1vtl2l000043hsthjz3ep6", "horizontal"],
        ["cmd8abuph000443wfzt9txx2e", "poster"],
      ]) {
        const card = page.locator(`[data-feed-item-key="publication-${id}"]`);
        await card.scrollIntoViewIfNeeded();
        await settled(page);
        const state = await card
          .locator('[class*="mediaFrame"] img')
          .evaluate(async (image) => {
            await image.decode();
            return {
              currentSrc: image.currentSrc,
              complete: image.complete,
              width: image.naturalWidth,
              height: image.naturalHeight,
            };
          });
        assert(state.complete && state.width > 0);
        await card.screenshot({
          path: `${folder}/candidate-${label}-${width}.png`,
        });
        records.push({ width, label, state });
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      await context.close();
    }
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage(),
      errors = await setup(page);
    await ready(page);
    const main = await page
      .locator("[data-desktop-tier]")
      .first()
      .locator('[class*="main"]')
      .first()
      .boundingBox();
    assert.equal(main.width, 680);
    assert.equal(main.x + 340, 720);
    for (const pos of ["top", "scroll"]) {
      if (pos === "scroll") await page.evaluate(() => scrollTo(0, 950));
      await settled(page);
      await page.locator("img").evaluateAll((es) =>
        Promise.race([
          Promise.all(
            es
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width && r.bottom > 0 && r.top < innerHeight;
              })
              .map((e) => e.decode().catch(() => {})),
          ),
          new Promise((r) => setTimeout(r, 3000)),
        ]),
      );
      const file = `${folder}/candidate-desktop-${pos}-1440.png`;
      await page.screenshot({ path: file });
      const a = await sharp(file).ensureAlpha().raw().toBuffer(),
        b = await sharp(`${folder}/before-1440-${pos}.png`)
          .ensureAlpha()
          .raw()
          .toBuffer();
      assert.equal(a.length, b.length);
      let changed = 0;
      for (let i = 0; i < a.length; i += 4)
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])
          changed++;
      assert.equal(changed, 0);
      records.push({ width: 1440, pos, changedPixels: changed });
    }
    assert.deepEqual(errors, []);
    await context.close();
    fs.writeFileSync(
      `${folder}/regression.json`,
      JSON.stringify(records, null, 2),
    );
    console.log(
      "PASS: 320/390/430 photos, actions, follow badge, header/navigation; desktop 1440 pixels unchanged",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
