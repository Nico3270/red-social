const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
const { setup, ready, settled } = require("./browser.cjs");
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw Error("Use before or after");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.AUDIT_CHROMIUM_PATH ||
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const records = [];
  try {
    for (const width of [769, 1440]) {
      const c = await b.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        }),
        p = await c.newPage();
      await setup(p);
      await ready(p);
      for (const position of ["top", "scroll"]) {
        if (position === "scroll") await p.evaluate(() => scrollTo(0, 950));
        await settled(p);
        await p.locator("img").evaluateAll(async (es) => {
          await Promise.race([
            Promise.all(
              es
                .filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
                })
                .map((e) => e.decode().catch(() => {})),
            ),
            new Promise((resolve) => setTimeout(resolve, 3000)),
          ]);
        });
        await p.screenshot({
          path: `docs/audits/mobile-premium-v2-evidence/${phase}-${width}-${position}.png`,
        });
        records.push({
          width,
          position,
          images: await p.locator("img").evaluateAll((es) =>
            es
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
              })
              .map((e) => ({
                src: e.currentSrc,
                natural: [e.naturalWidth, e.naturalHeight],
              })),
          ),
        });
      }
      await c.close();
    }
    fs.writeFileSync(
      `docs/audits/mobile-premium-v2-evidence/${phase}-desktop.json`,
      JSON.stringify(records, null, 2),
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
