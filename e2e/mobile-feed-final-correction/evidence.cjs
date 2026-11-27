// Compose unmodified native localhost captures at their original pixel size.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const out = path.resolve(__dirname, "../../docs/mobile-feed-final-correction");
const screenshots = path.join(out, "screenshots");
const read = (file) => JSON.parse(fs.readFileSync(path.join(out, file), "utf8"));

async function changedPixels(a, b) {
  const first = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const second = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (first.info.width !== second.info.width || first.info.height !== second.info.height) throw new Error("Different image dimensions");
  let different = 0;
  for (let i = 0; i < first.data.length; i += 4)
    if (first.data.subarray(i, i + 4).compare(second.data.subarray(i, i + 4))) different++;
  return different;
}

(async () => {
  const summary = [];
  const widths = [320, 390, 430, 768, 1024, 1280, 1440, 1920];
  for (const width of widths) {
    const before = read(`before-${width}.json`), after = read(`after-${width}.json`);
    const a = path.join(screenshots, `before-${width}.png`), b = path.join(screenshots, `after-${width}.png`);
    const meta = await sharp(a).metadata();
    const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width * 2 + 48}" height="44"><g font-family="Arial,sans-serif" font-size="15" fill="#374151"><text x="16" y="28">Antes · localhost /</text><text x="${width + 32}" y="28">Después · corrección aplicada</text></g></svg>`);
    await sharp({ create: { width: width * 2 + 48, height: meta.height + 60, channels: 4, background: "#f3f4f6" } })
      .composite([{ input: labels, left: 0, top: 0 }, { input: a, left: 16, top: 44 }, { input: b, left: width + 32, top: 44 }])
      .png().toFile(path.join(screenshots, `comparison-${width}.png`));
    const photoDifferences = [];
    if (width <= 768) {
      for (const index of [0, 1]) {
        const crops = [];
        for (const [record, file] of [[before, a], [after, b]]) {
          const card = record.metrics.cards.filter((c) => c.product)[index];
          const anchor = record.rendered[index].find((element) => element.tag === "A" && Math.abs(element.rect[2] - card.mediaWidth) < 0.03 && Math.abs(element.rect[3] - card.mediaHeight) < 0.03);
          if (!anchor) throw new Error(`Missing photo rectangle at ${width}`);
          const [x, y, w, h] = anchor.rect;
          crops.push(await sharp(file).extract({ left: Math.ceil(x), top: Math.ceil(y), width: Math.floor(x + w) - Math.ceil(x), height: Math.floor(y + h) - Math.ceil(y) }).png().toBuffer());
        }
        const difference = await changedPixels(...crops);
        photoDifferences.push(difference);
      }
    }
    summary.push({ width, scrollY: after.scrollY, cards: after.commercial.map((card, i) => ({ id: card.id, beforeHeight: before.commercial[i].height, afterHeight: card.height, priceSize: card.priceSize, commercialGap: card.commercialGap, titleHeight: card.titleHeight })), fullProductsBefore: before.metrics.fullProducts, fullProductsAfter: after.metrics.fullProducts, photoDifferentPixels: photoDifferences, desktopDifferentPixels: after.differentPixels });
  }
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, "comparison.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · corrección del feed móvil</title><style>body{margin:24px auto;padding:0 16px;max-width:1600px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}h1{font-size:24px}h2{font-size:18px}section{margin:28px 0}img{max-width:100%;height:auto;display:block}a{color:#a83c4b}</style><h1>Myckeo · corrección aplicada en localhost /</h1><p>Ruta principal y componentes productivos del servidor existente en el puerto 3000. Datos sintéticos y fotografías de prueba. Misma posición de scroll y escala 1 en cada pareja; las composiciones no se redimensionaron. Abre el PNG para inspeccionarlo a tamaño original.</p>${widths.map((width) => `<section><h2>${width} px</h2><a href="screenshots/comparison-${width}.png"><img src="screenshots/comparison-${width}.png" alt="Antes y después a ${width} px"></a><p><a href="screenshots/before-${width}.png">Antes</a> · <a href="screenshots/after-${width}.png">Después</a> · <a href="after-${width}.json">Estilos calculados y medidas</a></p></section>`).join("\n")}<h2>Casos finales completos a 430 px</h2>${["p3", "p4", "p5", "p6", "p7"].map((id) => `<section><img src="screenshots/after-edge-${id}.png" alt="Caso ${id}"></section>`).join("\n")}</html>`);
  console.log("8 comparisons generated, including original photo-region pixel differences in summary.json.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
