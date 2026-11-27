const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp"),
  crypto = require("node:crypto");
const out = path.resolve(__dirname, "../../docs/mobile-feed-actions-refined"),
  shots = path.join(out, "screenshots");
const read = (n) => JSON.parse(fs.readFileSync(path.join(out, n), "utf8"));
async function pair(width) {
  const a = path.join(shots, `A-${width}.png`),
    b = path.join(shots, `B-${width}.png`),
    m = await sharp(a).metadata();
  const total = width * 2 + 48;
  const labels = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="44"><g font-family="Arial,sans-serif" font-size="15" fill="#374151"><text x="16" y="28">A · oreja de 4 px</text><text x="${width + 32}" y="28">B · integrado (elegido)</text></g></svg>`,
  );
  await sharp({
    create: {
      width: total,
      height: m.height + 60,
      channels: 4,
      background: "#f3f4f6",
    },
  })
    .composite([
      { input: labels, top: 0, left: 0 },
      { input: a, top: 44, left: 16 },
      { input: b, top: 44, left: width + 32 },
    ])
    .png()
    .toFile(path.join(shots, `comparison-${width}.png`));
}
(async () => {
  for (const w of [390, 430]) await pair(w);
  const summary = [320, 360, 390, 430, 768, 769, 1024].map((width) => {
    const a = read(`A-${width}.json`),
      b = read(`B-${width}.json`),
      before = read(`before-${width}.json`);
    return {
      width,
      desktopPixels: b.desktopPixels,
      crossCardCollisions: b.cross,
      cards: b.actions.map((c, i) => ({
        id: c.id,
        name: c.name,
        nameWidthBefore: before.actions[i].nameWidth,
        nameWidthA: a.actions[i].nameWidth,
        nameWidthB: c.nameWidth,
        charactersBefore: before.actions[i].approximateVisibleCharacters,
        charactersA: a.actions[i].approximateVisibleCharacters,
        charactersB: c.approximateVisibleCharacters,
        heightBefore: before.actions[i].root.height,
        heightB: c.root.height,
        marginBefore: before.actions[i].marginTop,
        marginB: c.marginTop,
        headerHeight: c.header.height,
        photo: c.photo,
        priceFits: c.price.fits,
        controlsOnPhoto: c.controlsOnPhoto,
        wrapped: c.controlsWrapped,
      })),
    };
  });
  fs.writeFileSync(
    path.join(out, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  const before = read("source-state-before.json");
  const changed = [],
    missing = [];
  for (const [file, hash] of Object.entries(before)) {
    if (!fs.existsSync(file)) {
      missing.push(file);
      continue;
    }
    const next = crypto
      .createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    if (hash !== next) changed.push(file);
  }
  fs.writeFileSync(
    path.join(out, "source-integrity.json"),
    JSON.stringify(
      { compared: Object.keys(before).length, changed, missing },
      null,
      2,
    ),
  );
  if (
    changed.length !== 1 ||
    changed[0] !== "src/ui/components/productos/feedProductCard.module.css" ||
    missing.length
  )
    throw Error("Unexpected source changes");
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · A/B refinado</title><style>body{max-width:1100px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}h1{font-size:24px}h2{font-size:18px}img{max-width:100%;height:auto;display:block;margin-bottom:24px}a{color:#a83c4b}.edges{display:flex;flex-wrap:wrap;gap:16px}.edges img{max-width:210px;object-fit:contain;align-self:flex-start}</style><h1>Myckeo · acciones refinadas</h1><p>Recomendación: B. Favorito contenido, header de 44 px y acciones comerciales simétricas. Capturas del componente productivo servido por Next.js, con datos sintéticos y fotografías realistas. Mismo contenido, escala y scroll de 100 px. A asoma solo 4 px.</p>${[390, 430].map((w) => `<h2>${w} px</h2><a href="screenshots/comparison-${w}.png"><img src="screenshots/comparison-${w}.png" alt="A y B a ${w} px"></a><p><a href="screenshots/A-${w}.png">A original</a> · <a href="screenshots/B-${w}.png">B original</a></p>`).join("")}<h2>Casos B</h2><div class="edges">${["p1", "p2", "p4", "p5", "p7", "p8"].map((id) => `<img src="screenshots/B-edge-${id}.png" alt="Caso ${id}">`).join("")}</div><h2>Activo y anónimo</h2><img src="screenshots/B-active.png" alt="Seguir y favorito activos"><img src="screenshots/B-login-request.png" alt="Solicitud de sesión"><h2>Responsive completo</h2>${[320, 360, 768, 769, 1024].map((w) => `<p><a href="screenshots/B-${w}.png">B a ${w} px</a></p>`).join("")}<p><a href="summary.json">Mediciones</a> · <a href="source-integrity.json">Integridad de fuentes</a></p></html>`;
  fs.writeFileSync(path.join(out, "comparison.html"), html);
  console.log(
    JSON.stringify(
      {
        summary: summary
          .filter((s) => [390, 430, 769, 1024].includes(s.width))
          .map((s) => ({
            width: s.width,
            desktopPixels: s.desktopPixels,
            longName: s.cards.find((c) => c.id === "p7"),
          })),
        sourceChanges: changed,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
