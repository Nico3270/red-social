const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
const { setup, settled } = require("./browser.cjs");
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw Error("Use before or after");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.AUDIT_CHROMIUM_PATH ||
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const c = await b.newContext({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    }),
    p = await c.newPage();
  const errors = await setup(p),
    records = [];
  try {
    for (const state of [
      "empty",
      "loading",
      "pending-types",
      "error",
      "settled",
    ]) {
      await p.goto(
        "http://127.0.0.1:3400/?scenario=sparse" +
          (state === "settled" ? "" : "&state=" + state),
      );
      await p.locator("[data-feed-sentinel]").waitFor();
      await settled(p);
      if (state === "settled")
        await p.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
      await settled(p);
      await p.screenshot({
        path: `docs/audits/mobile-premium-v2-evidence/${phase}-state-${state}-390.png`,
      });
      records.push({
        state,
        items: await p.locator("[data-feed-item-key]").count(),
        completion: await p.locator("[data-mobile-feed-complete]").count(),
        unresolved: await p.locator("[data-feed-unresolved]").count(),
      });
    }
    fs.writeFileSync(
      `docs/audits/mobile-premium-v2-evidence/${phase}-states.json`,
      JSON.stringify({ records, errors }, null, 2),
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
