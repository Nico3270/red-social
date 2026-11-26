const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const { setup, ready, settled } = require("./browser.cjs");
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw Error("Use before or after");
const folder = "docs/audits/mobile-premium-v2-evidence";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const results = [];
  try {
    const cases = [
      ...[280, 320, 360, 390, 430, 768, 769, 1440].map((width) => ({
        width,
        scenario: "balanced",
        session: "anonymous",
        tag: String(width),
      })),
      ...["commerce", "sparse", "social", "media", "reviews"].map(
        (scenario) => ({
          width: 390,
          scenario,
          session: "anonymous",
          tag: scenario + "-390",
        }),
      ),
      ...["personal", "owner", "incomplete"].map((session) => ({
        width: 390,
        scenario: "balanced",
        session,
        tag: session + "-390",
      })),
    ];
    const selectedTags = process.env.MYCKEO_CAPTURE_TAGS?.split(",");
    for (const sample of cases.filter(
      (sample) => !selectedTags || selectedTags.includes(sample.tag),
    )) {
      const context = await browser.newContext({
        viewport: { width: sample.width, height: 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = await setup(page, sample.session);
      await page.addInitScript(() => {
        const frames = [];
        Object.assign(window, { __mobileFrames: frames });
        let count = 0;
        const measure = () => {
          const main = document.querySelector("main");
          const h = [...document.querySelectorAll("header")].find(
            (e) => e.getBoundingClientRect().width > 0,
          );
          if (main)
            frames.push({
              t: performance.now(),
              mainTop: main.getBoundingClientRect().top,
              headerHeight: h?.getBoundingClientRect().height,
            });
          if (count++ < 150) requestAnimationFrame(measure);
        };
        requestAnimationFrame(measure);
      });
      await ready(page, "/?scenario=" + sample.scenario);
      await page.evaluate(() => document.fonts.ready);
      await settled(page);
      await page.screenshot({
        path: `${folder}/${phase}-${sample.tag}-top.png`,
      });
      const metrics = await page.evaluate(() => {
        const box = (el) => {
          const r = el?.getBoundingClientRect();
          return r && { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const visible = (selector) =>
          [...document.querySelectorAll(selector)].filter(
            (el) => el.getBoundingClientRect().width > 0,
          );
        const header = visible("header")[0],
          nav = visible('nav[aria-label="Navegación principal"]')[0];
        return {
          header: box(header),
          navigation: box(nav),
          navDestinations:
            nav &&
            [...nav.querySelectorAll("a,button")].map((e) => ({
              text: e.textContent.trim(),
              aria: e.getAttribute("aria-label"),
              href: e.getAttribute("href"),
              ...box(e),
            })),
          keys: [...document.querySelectorAll("[data-feed-item-key]")].map(
            (e) => e.getAttribute("data-feed-item-key"),
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
          products: visible("[data-feed-product-id]").map((el) => {
            const media = el.querySelector('[class*="media"]');
            const image = media?.querySelector("img:not([aria-hidden])");
            return {
              id: el.getAttribute("data-feed-product-id"),
              card: box(el),
              media: box(media),
              image: image && {
                natural: [image.naturalWidth, image.naturalHeight],
                fit: getComputedStyle(image).objectFit,
                transform: getComputedStyle(image).transform,
              },
              price: el.querySelector('[class*="price"]')?.textContent,
            };
          }),
          frames: window.__mobileFrames,
        };
      });
      await page.evaluate(() => scrollTo(0, 950));
      await settled(page);
      await page.screenshot({
        path: `${folder}/${phase}-${sample.tag}-scroll.png`,
      });
      if (sample.tag === "390") {
        await page.evaluate(() => scrollTo(0, 0));
        const toggle = page.getByRole("button", {
          name: /Mostrar categorías|Ocultar categorías/,
        });
        if (await toggle.count()) await toggle.click();
        else
          await page
            .locator('a[href="/category/negocios"]')
            .first()
            .evaluate((el) =>
              el.scrollIntoView({ block: "nearest", inline: "end" }),
            );
        await settled(page);
        await page.screenshot({
          path: `${folder}/${phase}-categories-390.png`,
        });
      }
      results.push({ ...sample, ...metrics, errors });
      await context.close();
    }
    const previous =
      selectedTags && fs.existsSync(`${folder}/${phase}-metrics.json`)
        ? JSON.parse(fs.readFileSync(`${folder}/${phase}-metrics.json`))
        : [];
    const combined = [
      ...new Map(
        [...previous, ...results].map((record) => [record.tag, record]),
      ).values(),
    ];
    fs.writeFileSync(
      `${folder}/${phase}-metrics.json`,
      JSON.stringify(combined, null, 2),
    );
    console.log(phase + ": " + results.length + " inventories captured");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
