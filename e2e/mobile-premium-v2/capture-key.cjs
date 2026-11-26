const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
const { setup, ready, settled } = require("./browser.cjs");
const phase = process.argv[2] || "v2",
  folder = "docs/audits/mobile-premium-v2-evidence";
(async () => {
  const browser = await chromium.launch({
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    }),
    records = [];
  try {
    const context = await browser.newContext({
        viewport: { width: 390, height: 900 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage(),
      errors = await setup(page);
    await ready(page);
    const sample = require("../../docs/audits/centered-feed-evidence/comparison-sample.json");
    const products = sample.items.filter((i) => i.type === "product");
    for (const [label, item] of [
      ["food", products[0]],
      ["shoe", products[1]],
      ["fashion", products[2]],
    ]) {
      const card = page.locator(`[data-feed-product-id="${item.id}"]`);
      await card.scrollIntoViewIfNeeded();
      await settled(page);
      await card
        .locator('[class*="media"] img:not([aria-hidden]):not([alt=""])')
        .evaluate(async (image) => {
          await image.decode();
        });
      await settled(page);
      await card.screenshot({
        path: `${folder}/${phase}-key-${label}-390.png`,
      });
      records.push({
        label,
        id: item.id,
        geometry: await card.evaluate((el) => {
          const box = (e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          const media = el.querySelector('[class*="media"]'),
            title = el.querySelector("h3"),
            row = el.querySelector('[class*="purchaseRow"]'),
            img = media.querySelector('img:not([aria-hidden]):not([alt=""])');
          return {
            card: box(el),
            media: box(media),
            title: box(title),
            row: box(row),
            image: {
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              fit: getComputedStyle(img).objectFit,
            },
            ratio: getComputedStyle(el).getPropertyValue("--feed-image-ratio"),
          };
        }),
      });
    }
    for (const [label, id] of [
      ["social", "cmf1vtl2l000043hsthjz3ep6"],
      ["poster", "cmd8abuph000443wfzt9txx2e"],
    ]) {
      const card = page.locator(
        `[data-feed-item-key="publication-${id}"] article`,
      );
      await card.scrollIntoViewIfNeeded();
      await settled(page);
      await card.screenshot({
        path: `${folder}/${phase}-key-${label}-390.png`,
      });
      records.push({
        label,
        id,
        media: await card.locator('[class*="mediaFrame"]').evaluate((el) => {
          const r = el.getBoundingClientRect();
          const i = el.querySelector("img");
          return {
            width: r.width,
            height: r.height,
            naturalWidth: i.naturalWidth,
            naturalHeight: i.naturalHeight,
            fit: getComputedStyle(i).objectFit,
          };
        }),
      });
    }
    await ready(page, "/?scenario=reviews");
    const review = page.locator(
      '[data-feed-item-key="publication-cmga1qf3t000143or68yyssiz"]',
    );
    await review.scrollIntoViewIfNeeded();
    await settled(page);
    const reviewImage = review.locator('[class*="mediaFrame"] img');
    const media = await reviewImage.evaluate(async (image) => {
      await Promise.race([
        image.decode(),
        new Promise((_, reject) =>
          setTimeout(() => reject(Error("Review image decode timeout")), 5000),
        ),
      ]);
      if (!image.complete || !image.naturalWidth)
        throw Error("Review image did not load");
      return {
        src: image.getAttribute("src"),
        currentSrc: image.currentSrc,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      };
    });
    await review.screenshot({ path: `${folder}/${phase}-key-review-390.png` });
    records.push({
      label: "review",
      id: await review.getAttribute("data-feed-item-key"),
      media,
      productHref: await review
        .locator('a[href^="/producto/"]')
        .first()
        .getAttribute("href"),
    });
    await context.close();
    fs.writeFileSync(
      `${folder}/${phase}-key-metrics.json`,
      JSON.stringify({ records, errors }, null, 2),
    );
    console.log(phase + ": 6 key cards captured");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
