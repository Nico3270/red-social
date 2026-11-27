// Arrange original browser captures side by side, without resizing or retouching.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, "docs/mobile-feed-final-polish");
const screenshots = path.join(output, "screenshots");

async function pair(key) {
  const before = path.join(screenshots, `before-${key}.png`);
  const after = path.join(screenshots, `after-${key}.png`);
  const a = await sharp(before).metadata();
  const b = await sharp(after).metadata();
  if (a.width !== b.width || a.height !== b.height)
    throw new Error(`Mismatched capture sizes: ${key}`);
  const width = a.width * 2 + 48;
  const labels = Buffer.from(`<svg width="${width}" height="44" xmlns="http://www.w3.org/2000/svg"><g font-family="Arial,sans-serif" font-size="15" fill="#374151"><text x="16" y="28">Antes · versión aprobada</text><text x="${a.width + 32}" y="28">Después · pulido final</text></g></svg>`);
  await sharp({ create: { width, height: a.height + 60, channels: 4, background: "#f3f4f6" } })
    .composite([
      { input: labels, top: 0, left: 0 },
      { input: before, top: 44, left: 16 },
      { input: after, top: 44, left: a.width + 32 },
    ])
    .png()
    .toFile(path.join(screenshots, `comparison-${key}.png`));
}

(async () => {
  const keys = ["320", "390", "430", "768", "1024", "1440", "390-single", "390-portrait", "390-landscape"];
  for (const key of keys) await pair(key);
  fs.writeFileSync(path.join(output, "comparison.html"), `<!doctype html>
<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · pulido final</title>
<style>body{margin:24px auto;padding:0 16px;max-width:1600px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}section{margin:28px 0}img{display:block;max-width:100%;height:auto}a{color:#a83c4b}h1{font-size:24px}h2{font-size:18px}</style>
<h1>Myckeo · pulido final del feed móvil</h1><p>Capturas del componente productivo en Next.js, con el mismo contenido sintético y encuadre. Las composiciones conservan los píxeles originales; ábrelas para inspeccionar a escala 1:1. El navegador puede reducir su presentación en esta galería.</p>
${keys.map((key) => `<section><h2>${key.includes("single") ? "Tarjeta individual" : key.includes("portrait") ? "Foto vertical" : key.includes("landscape") ? "Foto horizontal" : `${key} px`}</h2><a href="screenshots/comparison-${key}.png"><img src="screenshots/comparison-${key}.png" alt="Antes y después: ${key}"></a><p><a href="screenshots/before-${key}.png">Antes original</a> · <a href="screenshots/after-${key}.png">Después original</a></p></section>`).join("\n")}
<h2>Casos especiales · versión final</h2><p>Precios grandes, variantes, agotado e imagen ausente. Se alineó cada tarjeta entre el encabezado y la navegación fija antes de capturar.</p>
${[186, 382].flatMap((width) => ["long", "variants", "sold-out", "missing"].map((name) => `<section><h2>${name} · contenedor máximo ${width} px</h2><img src="screenshots/after-visible-case-${width}-${name}.png" alt="Caso ${name}"></section>`)).join("\n")}
</html>`);
  console.log(`${keys.length} paired comparisons and local gallery generated.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
