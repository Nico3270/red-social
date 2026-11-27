// Compose measured screenshots; application images are captured by Next + Playwright tests.
const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
const out = path.join(root, "docs/mobile-feed-responsive");
const parts = fs
  .readdirSync(out)
  .filter((n) => /^measurements-case-.*\.json$/.test(n))
  .sort(
    (a, b) =>
      fs.statSync(path.join(out, a)).mtimeMs -
      fs.statSync(path.join(out, b)).mtimeMs,
  );
const records = new Map();
for (const file of parts)
  for (const r of JSON.parse(fs.readFileSync(path.join(out, file))).records)
    records.set([r.case, r.width || "", r.actions || ""].join(":"), r);
if (records.size)
  fs.writeFileSync(
    path.join(out, "measurements.json"),
    JSON.stringify({ records: [...records.values()] }, null, 2),
  );
const cache = path.join(require("node:os").homedir(), ".cache/ms-playwright");
const executablePath = fs
  .readdirSync(cache)
  .filter((n) => /^chromium-\d+$/.test(n))
  .flatMap((n) =>
    ["chrome-linux64/chrome", "chrome-linux/chrome"].map((f) =>
      path.join(cache, n, f),
    ),
  )
  .find(fs.existsSync);
(async () => {
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    const desktop = width > 768;
    const figures = desktop
      ? [
          { name: "Antes de B3+C2", src: `reference-${width}.png` },
          {
            name: "Escritorio restaurado",
            src: `restored-separate-${width}.png`,
          },
        ]
      : [
          {
            name: "A · botones separados",
            src: `separate-${width}-aligned.png`,
          },
          {
            name: "B · carrito + WhatsApp secundario",
            src: `split-${width}-aligned.png`,
          },
        ];
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Myckeo · refinamiento ${width}</title><style>body{font:16px Arial;background:#f3f4f6;color:#1c283c;margin:0;padding:20px}h1{font-size:22px}main{display:flex;gap:20px}article{width:${width}px;flex:none}h2{font-size:17px}img{display:block;width:100%}</style><h1>Myckeo · ${width} px · ${desktop ? "restauración de escritorio" : "comparación de acciones móviles"}</h1><p>Capturas del componente productivo en Next.js de desarrollo; mismo contenido sintético.</p><main>${figures.map((f) => `<article><h2>${f.name}</h2><img src="screenshots/${f.src}" alt="${f.name}"></article>`).join("")}</main></html>`;
    fs.writeFileSync(path.join(out, `comparison-${width}.html`), html);
    let embedded = html;
    for (const f of figures)
      embedded = embedded.replace(
        `src="screenshots/${f.src}"`,
        `src="data:image/png;base64,${fs.readFileSync(path.join(out, "screenshots", f.src)).toString("base64")}"`,
      );
    await page.setViewportSize({
      width: width * 2 + 60,
      height: desktop ? 1080 : 1030,
    });
    await page.setContent(embedded);
    await page.screenshot({
      path: path.join(out, `screenshots/comparison-${width}.png`),
      fullPage: true,
    });
  }
  // Isolated single cards make the information-row tradeoff easier to inspect.
  const width = 390;
  const figures = [
    { name: "A · una columna", src: "separate-390-single.png" },
    { name: "B · una columna", src: "split-390-single.png" },
  ];
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;padding:20px;background:#f3f4f6}main{display:flex;gap:20px}article{width:382px}h1{font-size:21px}img{width:100%;display:block}</style><h1>Myckeo · A/B · tarjeta individual · viewport ${width} px</h1><main>${figures.map((f) => `<article><h2>${f.name}</h2><img src="data:image/png;base64,${fs.readFileSync(path.join(out, "screenshots", f.src)).toString("base64")}"></article>`).join("")}</main></html>`;
  await page.setViewportSize({ width: 864, height: 520 });
  await page.setContent(html);
  await page.screenshot({
    path: path.join(out, "screenshots/comparison-single-390.png"),
    fullPage: true,
  });
  await browser.close();
})();
