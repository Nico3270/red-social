// Bounded anonymous public baseline, with feed reads only.
const { chromium } = require("@playwright/test"),
  fs = require("node:fs");
(async () => {
  const b = await chromium.launch({
    executablePath:
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const reads = [],
    errors = [];
  try {
    const c = await b.newContext({ viewport: { width: 390, height: 900 } });
    await c.addCookies([
      {
        name: "myckeo-consent",
        value: "true",
        domain: "myckeo.com",
        path: "/",
      },
    ]);
    await c.addInitScript(() =>
      localStorage.setItem(
        "preferences-storage",
        JSON.stringify({
          state: {
            ciudad: "Tunja",
            departamento: "Boyacá",
            preferencias: [],
            secciones: [],
            seenIds: [],
            userLat: null,
            userLong: null,
          },
          version: 0,
        }),
      ),
    );
    await c.route("**/*", (r) => {
      const q = r.request();
      if (!["GET", "HEAD"].includes(q.method())) {
        let a;
        try {
          a = JSON.parse(q.postData());
        } catch {}
        if (
          new URL(q.url()).origin === "https://myckeo.com" &&
          q.headers()["next-action"] &&
          ["products", "publications", "services", "businesses"].includes(
            a?.[0],
          )
        ) {
          reads.push(a[0]);
          return r.continue();
        }
        return r.abort();
      }
      if (
        /wa\.me|googletagmanager|google-analytics|doubleclick/.test(
          new URL(q.url()).hostname,
        )
      )
        return r.abort();
      return r.continue();
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("https://myckeo.com", { waitUntil: "domcontentloaded" });
    await p.locator("[data-feed-item-key]").first().waitFor({ timeout: 60000 });
    await p.waitForTimeout(3500);
    await p.evaluate(() =>
      Promise.race([
        Promise.all(
          [...document.images]
            .filter(
              (i) =>
                i.getBoundingClientRect().width > 0 &&
                i.getBoundingClientRect().top < innerHeight,
            )
            .map((i) =>
              i.complete ? Promise.resolve() : i.decode().catch(() => {}),
            ),
        ),
        new Promise((r) => setTimeout(r, 3000)),
      ]),
    );
    const result = await p.evaluate(() => {
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const nav = document.querySelector(
        'nav[aria-label="Navegación principal"]',
      );
      return {
        header: box(document.querySelector("header")),
        bottom: box(nav),
        destinations: [...nav.querySelectorAll("a,button")].map((e) => ({
          text: e.textContent.trim(),
          ...box(e),
        })),
        keys: [...document.querySelectorAll("[data-feed-item-key]")].map((e) =>
          e.getAttribute("data-feed-item-key"),
        ),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    const folder = "docs/audits/mobile-premium-v1-evidence";
    await p.screenshot({ path: `${folder}/public-baseline-390.png` });
    fs.writeFileSync(
      `${folder}/public-baseline.json`,
      JSON.stringify({ ...result, reads, errors }, null, 2),
    );
    console.log({
      header: result.header.height,
      bottom: result.bottom.height,
      items: result.keys.length,
      errors,
    });
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
