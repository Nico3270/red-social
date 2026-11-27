const fs = require("node:fs"), path = require("node:path"), sharp = require("sharp");
const out = path.resolve(__dirname, "../../docs/mobile-feed-actions-layout-final"), shots = path.join(out, "screenshots");
const read = (name) => JSON.parse(fs.readFileSync(path.join(out, name), "utf8"));

async function pair(a, b, name) {
  const x = await sharp(a).metadata(), y = await sharp(b).metadata();
  if (x.width !== y.width) throw new Error(`Different capture widths: ${name}`);
  const width = x.width * 2 + 48;
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><g font-family="Arial,sans-serif" font-size="15" fill="#374151"><text x="16" y="28">Antes · B anterior</text><text x="${x.width + 32}" y="28">Corrección final</text></g></svg>`);
  await sharp({ create: { width, height: Math.max(x.height, y.height) + 60, channels: 4, background: "#f3f4f6" } })
    .composite([{ input: labels, top: 0, left: 0 }, { input: a, top: 44, left: 16 }, { input: b, top: 44, left: x.width + 32 }]).png().toFile(path.join(shots, name));
}

(async () => {
  const widths = [320, 360, 390, 430, 768, 769, 1024], summary = [];
  for (const width of widths) {
    const before = read(`before-${width}.json`), after = read(`after-${width}.json`);
    if (before.scrollY !== after.scrollY) throw new Error("Scroll mismatch");
    if (JSON.stringify(before.actions.map((c) => c.id)) !== JSON.stringify(after.actions.map((c) => c.id))) throw new Error("Product order changed");
    const all = after.actions.flatMap((card) => card.controls.map((control) => ({ id: card.id, label: control.label, box: control.box })));
    const crossCardCollisions = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      if (all[i].id === all[j].id) continue;
      const a = all[i].box, b = all[j].box;
      if (Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)) > 0.5) crossCardCollisions.push([all[i].id, all[j].id]);
    }
    if (crossCardCollisions.length) throw new Error(`Cross-card collisions: ${width}`);
    await pair(path.join(shots, `before-${width}.png`), path.join(shots, `after-${width}.png`), `comparison-${width}.png`);
    summary.push({ width, scrollY: after.scrollY, desktopPixels: after.desktopPixels, crossCardCollisions, cards: after.actions.map((card, i) => ({ id: card.id, name: card.name, beforeNameWidth: before.actions[i].nameWidth, afterNameWidth: card.nameWidth, beforeCharacters: before.actions[i].approximateVisibleCharacters, afterCharacters: card.approximateVisibleCharacters, beforeHeight: before.actions[i].root.height, afterHeight: card.root.height, marginTop: card.marginTop, headerHeight: card.header.height, photoWidth: card.photo.width, photoHeight: card.photo.height, priceSize: card.price.size, priceFits: card.price.fits, commercialActionsWrapped: card.controlsWrapped, controlsOnPhoto: card.controlsOnPhoto, favoriteAboveHeader: card.favorite.box.bottom <= card.header.y + 0.1 })) });
  }
  for (const id of ["p1", "p2"]) {
    const before = read("before-390.json"), card = before.actions.find((c) => c.id === id);
    const x = Math.max(0, Math.floor(card.root.x) - 4);
    const crop = await sharp(path.join(shots, "before-390.png")).extract({ left: x, top: Math.floor(card.root.y) - 4, width: Math.min(390 - x, Math.ceil(card.root.width) + 8), height: Math.ceil(card.root.height) + 8 }).png().toBuffer();
    await pair(crop, path.join(shots, `after-edge-${id}.png`), `comparison-card-${id}.png`);
  }
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, "comparison.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · acciones definitivas</title><style>body{max-width:1600px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}h1{font-size:24px}h2{font-size:18px}section{margin:28px 0}img{max-width:100%;height:auto;display:block}a{color:#a83c4b}</style><h1>Myckeo · corrección definitiva de acciones</h1><p>Ruta principal del servidor real de desarrollo en localhost:3000, con datos sintéticos y fotografías realistas. Mismo scroll (100 px), contenido y escala en las comparaciones. Los PNG conservan los píxeles originales; las tarjetas de altura diferente no se redimensionan.</p>${widths.map((width) => `<section><h2>${width} px</h2><a href="screenshots/comparison-${width}.png"><img src="screenshots/comparison-${width}.png" alt="Antes y después a ${width} px"></a><p><a href="screenshots/before-${width}.png">Antes original</a> · <a href="screenshots/after-${width}.png">Después original</a> · <a href="after-${width}.json">Medidas</a></p></section>`).join("\n")}<h2>Tarjetas a escala original, con alturas diferentes</h2>${["p1", "p2"].map((id) => `<section><img src="screenshots/comparison-card-${id}.png" alt="Tarjeta ${id}, antes y después"></section>`).join("\n")}<h2>Casos finales</h2>${["p4", "p5", "p7", "p8"].map((id) => `<section><img src="screenshots/after-edge-${id}.png" alt="Caso ${id}"></section>`).join("\n")}<h2>Estados activos</h2><img src="screenshots/after-active.png" alt="Seguir y favorito activos"><h2>Solicitud original de sesión</h2><img src="screenshots/after-login-request.png" alt="Solicitud de inicio de sesión"></html>`);
  console.log("7 viewport comparisons, 2 card comparisons, gallery and measures generated; no cross-card target intersections.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
