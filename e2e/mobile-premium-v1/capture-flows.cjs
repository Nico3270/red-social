const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const { setup, ready, settled } = require("./browser.cjs");
const phase = process.argv[2],
  folder = "docs/audits/mobile-premium-v1-evidence";
(async () => {
  const b = await chromium.launch({
    executablePath:
      "/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome",
  });
  const results = {};
  try {
    const c = await b.newContext({
        viewport: { width: 390, height: 900 },
        reducedMotion: "reduce",
      }),
      p = await c.newPage();
    const errors = await setup(p);
    await ready(p);
    await p
      .getByRole("button", { name: "Abrir búsqueda", exact: true })
      .click();
    await p.getByRole("dialog").waitFor();
    await p
      .getByRole("combobox", {
        name: "Buscar productos, negocios o categorías",
      })
      .fill("salchipapa");
    await p.getByRole("option").first().waitFor();
    await p.screenshot({ path: `${folder}/${phase}-search-390.png` });
    await p.getByRole("button", { name: "Cerrar búsqueda" }).click();
    await p.getByRole("button", { name: /Cambiar ubicación:/ }).click();
    await settled(p);
    await p.screenshot({ path: `${folder}/${phase}-city-390.png` });
    results.cityClose = await p.locator("button").evaluateAll((es) =>
      es
        .filter(
          (e) =>
            e.getAttribute("aria-label") === "Cerrar ubicación" ||
            e.querySelector('svg path[d^="M6 18"]'),
        )
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            label: e.getAttribute("aria-label"),
            width: r.width,
            height: r.height,
          };
        }),
    );
    await p.mouse.click(5, 5);
    await p.waitForTimeout(400);
    const variant = p
      .locator("[data-feed-product-id]")
      .filter({ has: p.getByRole("button", { name: /Elegir opciones/ }) })
      .first();
    await variant
      .getByRole("button", { name: /Elegir opciones/ })
      .filter({ visible: true })
      .click();
    await p.getByRole("dialog").waitFor();
    await settled(p);
    await p.screenshot({ path: `${folder}/${phase}-variants-390.png` });
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    const image = p.locator(
      '[data-feed-item-key="publication-cmf1vtl2l000043hsthjz3ep6"]',
    );
    await image
      .getByRole("button", { name: "Ver publicación", exact: true })
      .click();
    await settled(p);
    await p.screenshot({ path: `${folder}/${phase}-publication-390.png` });
    results.publicationClose = await p
      .getByRole("button", { name: "Cerrar modal" })
      .evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { width: r.width, height: r.height };
      });
    await p.getByRole("button", { name: "Cerrar modal" }).click();
    const video = p.locator(
      '[data-feed-item-key="publication-cmd8abuph000443wfzt9txx2e"]',
    );
    await video
      .getByRole("button", { name: "Ver publicación", exact: true })
      .click();
    await p.locator("video").first().waitFor();
    await p
      .locator("video")
      .first()
      .evaluate(async (v) => {
        if (v.readyState < 1)
          await Promise.race([
            new Promise((resolve) =>
              v.addEventListener("loadedmetadata", resolve, { once: true }),
            ),
            new Promise((resolve) => setTimeout(resolve, 8000)),
          ]);
        v.muted = true;
        if (v.readyState >= 1) await v.play().catch(() => {});
      });
    await p.waitForTimeout(600);
    results.video = await p
      .locator("video")
      .first()
      .evaluate((v) => ({
        duration: v.duration,
        currentTime: v.currentTime,
        paused: v.paused,
        readyState: v.readyState,
        error: v.error?.message,
        canPlay: v.canPlayType("video/mp4"),
      }));
    await p.screenshot({ path: `${folder}/${phase}-video-390.png` });
    await p.getByRole("button", { name: "Cerrar modal" }).click();
    results.errors = errors;
    await c.close();
    const owner = await b.newContext({
        viewport: { width: 390, height: 900 },
        reducedMotion: "reduce",
      }),
      q = await owner.newPage();
    await setup(q, "owner");
    await ready(q);
    await q.getByRole("button", { name: /^Perfil/ }).click();
    await settled(q);
    await q.screenshot({ path: `${folder}/${phase}-profile-owner-390.png` });
    await owner.close();
    fs.writeFileSync(
      `${folder}/${phase}-flows.json`,
      JSON.stringify(results, null, 2),
    );
    console.log(
      "Captured search, city, variants, publication, original video and owner menu.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
