const { chromium } = require("@playwright/test"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const { setup, ready, settled } = require("../mobile-premium-v2/browser.cjs");
const folder = "docs/audits/mobile-premium-v2-release-evidence",
  url =
    "https://res.cloudinary.com/dkfsejtx9/image/upload/f_auto,q_auto:eco,c_limit,w_720,h_540/v1759447677/red-social/xfb8zlanoqlishcrfyfx.png",
  target = "publication-cmga1qf3t000143or68yyssiz";
(async () => {
  const b = await chromium.launch({
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    }),
    results = [];
  try {
    for (const [width, mode] of [
      [320, "404"],
      [390, "404"],
      [430, "404"],
      [390, "abort"],
      [390, "invalid-bytes"],
    ]) {
      const c = await b.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        }),
        p = await c.newPage(),
        errors = await setup(p);
      let requests = 0,
        release,
        before;
      await p.route(url, async (route) => {
        requests++;
        await new Promise((resolve) => {
          release = resolve;
        });
        if (mode === "404")
          await route.fulfill({ status: 404, body: "Controlled 404" });
        else if (mode === "abort") await route.abort("failed");
        else
          await route.fulfill({
            status: 200,
            body: "not image bytes",
            contentType: "image/jpeg",
          });
      });
      await p.goto("http://127.0.0.1:3400/?scenario=reviews", {
        waitUntil: "domcontentloaded",
      });
      const card = p.locator(`[data-feed-item-key="${target}"]`);
      await card.waitFor();
      await card.scrollIntoViewIfNeeded();
      await p.waitForFunction(() => document.fonts.status === "loaded");
      const frame = card.locator('[class*="mediaFrame"]');
      before = await frame.boundingBox();
      for (let i = 0; !release && i < 50; i++) await p.waitForTimeout(100);
      assert(release, "Image request must start");
      release();
      const fallback = card.getByRole("img", {
        name: "Imagen de la publicación no disponible",
        exact: true,
      });
      await fallback.waitFor();
      await settled(p);
      const after = await frame.boundingBox();
      assert(
        Math.abs(before.height - after.height) < 1,
        "Fallback must preserve reserved height",
      );
      assert.equal(await frame.locator("img").count(), 0);
      assert.equal(await frame.locator("source").count(), 0);
      assert.equal(
        await card
          .locator('a[href="/producto/empanadas-boyacenses-9qzg"]')
          .count(),
        1,
      );
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await p.waitForTimeout(600);
      assert.equal(requests, 1, "No automatic retry loop");
      await card.screenshot({
        path: `${folder}/fallback-${mode}-${width}.png`,
      });
      await card
        .getByRole("button", { name: "Ver publicación", exact: true })
        .click();
      const modal = p
        .getByRole("dialog")
        .filter({
          has: p.getByRole("button", { name: "Cerrar modal", exact: true }),
        });
      await modal.waitFor();
      await p
        .getByRole("button", { name: "Cerrar modal", exact: true })
        .click();
      assert.deepEqual(errors, []);
      results.push({
        width,
        mode,
        before,
        after,
        requests,
        fallbackVisible: true,
        relationPreserved: true,
        dialogAccessible: true,
        errors,
      });
      await c.close();
    }
    fs.writeFileSync(
      `${folder}/fallback.json`,
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS: HTTP 404, aborted request and invalid bytes; 320/390/430, stable frame, one request, relation and dialog preserved",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
