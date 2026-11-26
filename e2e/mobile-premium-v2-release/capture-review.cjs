const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
const { setup, ready, settled } = require("../mobile-premium-v2/browser.cjs");
const folder = "docs/audits/mobile-premium-v2-release-evidence",
  phase = process.argv[2] || "candidate",
  target = "publication-cmga1qf3t000143or68yyssiz";
(async () => {
  const browser = await chromium.launch({
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    }),
    records = [];
  try {
    for (const width of [320, 390, 430, 1440]) {
      const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = await setup(page),
        requests = [];
      page.on("response", (r) => {
        if (r.url().includes("xfb8zlanoqlishcrfyfx"))
          requests.push({ url: r.url(), status: r.status() });
      });
      page.on("requestfailed", (r) => {
        if (r.url().includes("xfb8zlanoqlishcrfyfx"))
          requests.push({ url: r.url(), error: r.failure() });
      });
      await ready(page, "/?scenario=reviews");
      const card = page.locator(`[data-feed-item-key="${target}"]`);
      await card.scrollIntoViewIfNeeded();
      await settled(page);
      const images = await card.locator("img").evaluateAll(async (es) => {
        const result = [];
        for (const image of es) {
          if (!image.getBoundingClientRect().width) continue;
          await Promise.race([
            image.decode(),
            new Promise((_, reject) =>
              setTimeout(() => reject(Error("Image decode timeout")), 5000),
            ),
          ]);
          if (!image.complete || !image.naturalWidth)
            throw Error("Broken image in review");
          result.push({
            src: image.getAttribute("src"),
            currentSrc: image.currentSrc,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          });
        }
        return result;
      });
      const href = await card
        .locator('a[href^="/producto/"]')
        .first()
        .getAttribute("href");
      if (href !== "/producto/empanadas-boyacenses-9qzg")
        throw Error("Relation changed");
      await card.screenshot({ path: `${folder}/${phase}-review-${width}.png` });
      const box = await card.boundingBox();
      records.push({
        width,
        id: target,
        href,
        images,
        requests,
        box,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        errors,
      });
      await context.close();
    }
    fs.writeFileSync(
      `${folder}/${phase}-review.json`,
      JSON.stringify(records, null, 2),
    );
    console.log(
      phase + ": verified review image and relation at 320/390/430/1440",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
