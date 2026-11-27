// Native localhost captures composed without resizing or retouching pixels.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const out = path.resolve(__dirname, "../../docs/mobile-feed-header-cards");
const screenshots = path.join(out, "screenshots");
const read = (name) => JSON.parse(fs.readFileSync(path.join(out, name), "utf8"));

async function pair(a, b, destination, labels = ["Antes", "Después"]) {
  const first = await sharp(a).metadata(), second = await sharp(b).metadata();
  if (first.width !== second.width || first.height !== second.height) throw new Error(`Incomparable captures: ${destination}`);
  const width = first.width * 2 + 48;
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><g font-family="Arial,sans-serif" font-size="15" fill="#374151"><text x="16" y="28">${labels[0]}</text><text x="${first.width + 32}" y="28">${labels[1]}</text></g></svg>`);
  await sharp({ create: { width, height: first.height + 60, channels: 4, background: "#f3f4f6" } })
    .composite([{ input: label, left: 0, top: 0 }, { input: a, left: 16, top: 44 }, { input: b, left: first.width + 32, top: 44 }])
    .png().toFile(path.join(screenshots, destination));
}

(async () => {
  const widths = [320, 360, 390, 430, 768, 769, 1024, 1440];
  const summary = [];
  for (const width of widths) {
    const before = read(`before-${width}.json`), after = read(`after-${width}.json`);
    for (const state of ["closed", "search"])
      await pair(path.join(screenshots, `before-${width}-${state}.png`), path.join(screenshots, `after-${width}-${state}.png`), `comparison-${width}-${state}.png`, ["Antes · localhost /", "Después · localhost /"]);
    summary.push({ width, beforeHeaderHeight: before.header.height, afterHeaderHeight: after.header.height, recoveredHeaderSpace: before.header.height - after.header.height, beforeFirstProductTop: before.header.firstProductTop, afterFirstProductTop: after.header.firstProductTop, firstProductAdvance: before.header.firstProductTop - after.header.firstProductTop, firstCardHeightBefore: before.commercial[0].height, firstCardHeightAfter: after.commercial[0].height, beforeBorder: before.commercial[0].border, afterBorder: after.commercial[0].border, beforeShadow: before.commercial[0].shadow, afterShadow: after.commercial[0].shadow, desktopClosedPixels: after.desktopClosedPixels, desktopSearchPixels: after.desktopOpenPixels });
  }
  for (const width of [390, 430]) {
    const crops = [];
    for (const phase of ["before", "after"]) {
      const data = read(`${phase}-${width}.json`);
      const [x, y, w, h] = data.rendered[0][0].rect;
      // Include the surrounding background so the real outside shadow is visible.
      crops.push(await sharp(path.join(screenshots, `${phase}-${width}-closed.png`))
        .extract({ left: 0, top: Math.floor(y) - 10, width: Math.ceil(x + w) + 10, height: Math.ceil(h) + 20 }).png().toBuffer());
    }
    await pair(crops[0], crops[1], `comparison-card-${width}.png`, ["Borde y sombra anteriores", "Acabado final"]);
  }
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, "comparison.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · cabecera y tarjetas finales</title><style>body{max-width:1600px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}h1{font-size:24px}h2{font-size:18px}section{margin:28px 0}img{max-width:100%;height:auto;display:block}a{color:#a83c4b}</style><h1>Myckeo · cabecera móvil y acabado final</h1><p>Capturas de la ruta principal del servidor existente en localhost:3000. Datos sintéticos y componentes productivos; la comparación del feed usa scroll 0 en ambas versiones. Las composiciones conservan píxeles y escala originales. Abre el PNG para inspeccionarlo a tamaño real.</p>${widths.map((width) => `<section><h2>${width} px · feed</h2><a href="screenshots/comparison-${width}-closed.png"><img src="screenshots/comparison-${width}-closed.png" alt="Feed antes y después a ${width} px"></a><p><a href="screenshots/before-${width}-closed.png">Antes original</a> · <a href="screenshots/after-${width}-closed.png">Después original</a></p><h2>${width} px · búsqueda abierta</h2><a href="screenshots/comparison-${width}-search.png"><img src="screenshots/comparison-${width}-search.png" alt="Búsqueda antes y después a ${width} px"></a></section>`).join("\n")}<h2>Borde y sombra, misma tarjeta</h2>${[390, 430].map((width) => `<section><img src="screenshots/comparison-card-${width}.png" alt="Acabado de tarjeta a ${width} px"></section>`).join("\n")}<h2>Estados y accesibilidad</h2>${["search-loading", "search-empty", "search-error", "search-keyboard-430h", "search-native-zoom-200"].map((name) => `<section><h2>${name}</h2><img src="screenshots/${name}.png" alt="${name}"></section>`).join("\n")}</html>`);
  console.log("16 viewport comparisons, 2 card-surface comparisons, summary and gallery generated.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
