// Present already captured real-Next screenshots. No application or prototype rendering.
const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
const out = path.join(root, "docs/mobile-feed-b3-c2");
const cache = path.join(require("node:os").homedir(), ".cache/ms-playwright");
const executablePath = fs
  .readdirSync(cache)
  .filter((n) => /^chromium-\d+$/.test(n))
  .flatMap((n) =>
    ["chrome-linux64/chrome", "chrome-linux/chrome"].map((file) =>
      path.join(cache, n, file),
    ),
  )
  .find(fs.existsSync);
(async () => {
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    const images = ["b2", "implemented"].map((version) => ({
      name: version === "b2" ? "B2 · antes" : "B3 + C2 · implementado",
      src: `screenshots/${version}-${width}-aligned.png`,
    }));
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Myckeo · ${width}px · implementación</title><style>body{font:16px Arial;margin:0;padding:20px;background:#f2f3f6;color:#1c283c}h1{font-size:22px}main{display:flex;gap:20px}article{width:${width}px;flex:none}h2{font-size:18px}img{display:block;width:100%}</style><h1>Myckeo · ${width} × 844 px</h1><p>Capturas de Next.js en desarrollo. Mismo contenido sintético; primera tarjeta alineada debajo del encabezado.</p><main>${images.map((i) => `<article><h2>${i.name}</h2><img src="${i.src}" alt="${i.name}"></article>`).join("")}</main></html>`;
    fs.writeFileSync(path.join(out, `comparison-${width}.html`), html);
    let embedded = html;
    for (const i of images)
      embedded = embedded.replace(
        `src="${i.src}"`,
        `src="data:image/png;base64,${fs.readFileSync(path.join(out, i.src)).toString("base64")}"`,
      );
    await page.setViewportSize({ width: width * 2 + 60, height: 1000 });
    await page.setContent(embedded);
    await page.screenshot({
      path: path.join(out, `screenshots/comparison-${width}.png`),
      fullPage: true,
    });
  }
  await browser.close();
})();
