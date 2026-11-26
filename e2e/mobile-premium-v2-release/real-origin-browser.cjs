const { chromium } = require("@playwright/test"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const url =
  "https://res.cloudinary.com/dkfsejtx9/image/upload/f_auto,q_auto:eco,c_limit,w_720,h_540/v1759447677/red-social/xfb8zlanoqlishcrfyfx.png";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.AUDIT_CHROMIUM_PATH ||
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  try {
    const page = await browser.newPage(),
      responses = [];
    await page.route("**/*", (route) =>
      route.request().method() === "GET" && route.request().url() === url
        ? route.continue()
        : route.abort(),
    );
    page.on("response", (r) =>
      responses.push({
        url: r.url(),
        status: r.status(),
        mime: r.headers()["content-type"],
      }),
    );
    await page.setContent(`<img alt="Original review source" src="${url}">`, {
      waitUntil: "domcontentloaded",
    });
    const image = await page.locator("img").evaluate(async (img) => {
      await Promise.race([
        img.decode(),
        new Promise((_, reject) =>
          setTimeout(() => reject(Error("Direct origin timeout")), 20000),
        ),
      ]);
      return {
        src: img.src,
        currentSrc: img.currentSrc,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    });
    assert(
      image.complete &&
        image.naturalWidth === 720 &&
        image.naturalHeight === 404,
    );
    assert(responses.some((r) => r.status === 200));
    const result = {
      image,
      responses,
      readOnly: true,
      fixtureInterception: false,
    };
    fs.writeFileSync(
      "docs/audits/mobile-premium-v2-release-evidence/real-origin-browser.json",
      JSON.stringify(result, null, 2),
    );
    console.log(result);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
