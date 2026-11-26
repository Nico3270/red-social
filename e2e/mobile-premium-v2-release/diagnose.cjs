const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
const { setup, ready, settled } = require("../mobile-premium-v2/browser.cjs");
// This reproducer describes the pre-fix state, not the corrected candidate.
const cp = require("node:child_process");
for (const file of [
  "src/feed/componentes/DiscoveryPublicationCard.tsx",
  "e2e/mobile-premium-v1/media-manifest.json",
]) {
  const baseline = cp.execFileSync("git", [
    "show",
    "547c5dd96c1de91729fb406338c1d003f40847bf:" + file,
  ]);
  if (!fs.readFileSync(file).equals(baseline))
    throw Error(
      "Run diagnose.cjs in an isolated 547c5dd worktree with its original cache; do not overwrite original diagnosis with corrected-candidate output.",
    );
}

const folder = "docs/audits/mobile-premium-v2-release-evidence";
const target = "publication-cmga1qf3t000143or68yyssiz",
  url =
    "https://res.cloudinary.com/dkfsejtx9/image/upload/f_auto,q_auto:eco,c_limit,w_720,h_540/v1759447677/red-social/xfb8zlanoqlishcrfyfx.png";
(async () => {
  const browser = await chromium.launch({
      executablePath:
        process.env.AUDIT_CHROMIUM_PATH ||
        "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
    }),
    records = [];
  try {
    for (const mode of ["original-harness", "valid-response", "http-404"]) {
      const context = await browser.newContext({
          viewport: { width: 390, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = await setup(page),
        requests = [];
      page.on("requestfailed", (r) => {
        if (r.url().includes("xfb8zlanoqlishcrfyfx"))
          requests.push({ url: r.url(), failed: r.failure() });
      });
      page.on("response", (r) => {
        if (r.url().includes("xfb8zlanoqlishcrfyfx"))
          requests.push({ url: r.url(), status: r.status() });
      });
      if (mode !== "original-harness")
        await page.route(url, (r) =>
          r.fulfill(
            mode === "valid-response"
              ? {
                  path: "/tmp/myckeo-review-mobile.image",
                  contentType: "image/jpeg",
                }
              : {
                  status: 404,
                  body: "Controlled missing image",
                  contentType: "text/plain",
                },
          ),
        );
      await ready(page, "/?scenario=reviews");
      const card = page.locator(`[data-feed-item-key="${target}"]`);
      await card.scrollIntoViewIfNeeded();
      await settled(page);
      const image = card.locator('[class*="mediaFrame"] img');
      await image.evaluate(async (img) => {
        await Promise.race([
          img.decode().catch(() => {}),
          new Promise((r) => setTimeout(r, 2000)),
        ]);
      });
      const state = await image.evaluate((img) => ({
        src: img.getAttribute("src"),
        currentSrc: img.currentSrc,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        pictureSources: [...img.parentElement.querySelectorAll("source")].map(
          (e) => ({ media: e.media, srcset: e.srcset }),
        ),
        box: {
          width: img.getBoundingClientRect().width,
          height: img.getBoundingClientRect().height,
        },
      }));
      await card.screenshot({ path: `${folder}/diagnostic-${mode}-390.png` });
      records.push({
        mode,
        state,
        requests,
        productHref: await card
          .locator('a[href^="/producto/"]')
          .first()
          .getAttribute("href"),
        errors,
      });
      await context.close();
    }
    fs.writeFileSync(
      `${folder}/diagnosis.json`,
      JSON.stringify(records, null, 2),
    );
    console.log(records);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
