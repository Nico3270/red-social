// Pair native development captures; never resize or retouch the original UI.
const fs = require("node:fs"), path = require("node:path"), sharp = require("sharp");
const out = path.resolve(__dirname, "../../docs/mobile-feed-social-actions");
const shots = path.join(out, "screenshots");
const read = (file) => JSON.parse(fs.readFileSync(path.join(out, file), "utf8"));

async function compose(files, labels, destination) {
  const meta = await sharp(files[0]).metadata();
  const width = meta.width * files.length + 16 * (files.length + 1);
  const titles = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><g font-family="Arial,sans-serif" font-size="15" fill="#374151">${labels.map((label, i) => `<text x="${16 + i * (meta.width + 16)}" y="28">${label}</text>`).join("")}</g></svg>`);
  const images = [];
  for (let i = 0; i < files.length; i++) {
    const m = await sharp(files[i]).metadata();
    if (m.width !== meta.width || m.height !== meta.height) throw new Error(`Incomparable images: ${destination}`);
    images.push({ input: files[i], left: 16 + i * (meta.width + 16), top: 44 });
  }
  await sharp({ create: { width, height: meta.height + 60, channels: 4, background: "#f3f4f6" } }).composite([{ input: titles, left: 0, top: 0 }, ...images]).png().toFile(path.join(shots, destination));
}

(async () => {
  const widths = [320, 360, 390, 430, 768, 769, 1024], summary = [];
  for (const width of widths) {
    const states = ["before", "A", "B"].map((phase) => ({ phase, ...read(`${phase}-${width}.json`) }));
    const ids = states[0].social.map((c) => c.id);
    if (new Set(ids).size !== ids.length || states.some((state) => JSON.stringify(state.social.map((c) => c.id)) !== JSON.stringify(ids))) throw new Error("Product order/identity changed");
    if (states.some((state) => state.scrollY !== states[0].scrollY)) throw new Error("Different scroll positions");
    await compose(["A", "B"].map((phase) => path.join(shots, `${phase}-${width}.png`)), ["A · sociales en foto", "B · seguir junto al avatar"], `comparison-AB-${width}.png`);
    await compose(["before", "A", "B"].map((phase) => path.join(shots, `${phase}-${width}.png`)), ["Antes", "A", "B · seleccionada"], `comparison-all-${width}.png`);
    summary.push({ width, states: states.map((state) => ({ phase: state.phase, scrollY: state.scrollY, desktopPixels: state.desktopPixels, cards: state.social.map((card) => ({ id: card.id, name: card.name, nameAvailableWidth: card.nameAvailableWidth, nameElementWidth: card.nameWidth, fullNameWidth: card.fullNameWidth, approximateVisibleCharacters: card.approximateVisibleCharacters, fullNameVisible: card.fullNameVisible, height: card.height, headerHeight: card.headerHeight, photoWidth: card.photoWidth, photoHeight: card.photoHeight, controlsOnPhoto: card.controlsOnPhoto, paintedPhotoPercent: card.paintedPhotoPercent, touchPhotoPercent: card.touchPhotoPercent })) })) });
  }
  for (const id of ["p1", "p2", "p4", "p5", "p7", "p8"]) await compose(["A", "B"].map((phase) => path.join(shots, `${phase}-edge-${id}.png`)), ["A", "B"], `comparison-edge-${id}.png`);
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, "comparison.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · acciones sociales A/B</title><style>body{max-width:1700px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}h1{font-size:24px}h2{font-size:18px}section{margin:28px 0}img{display:block;max-width:100%;height:auto}a{color:#a83c4b}</style><h1>Myckeo · acciones sociales A/B</h1><p>Ambas disposiciones se aplicaron y capturaron secuencialmente en el componente productivo de localhost:3000/. B queda activa. Las comparaciones usan los mismos datos, fotografías y scroll; los PNG conservan los píxeles originales. El visor puede reducir su presentación.</p>${widths.map((width) => `<section><h2>${width} px</h2><a href="screenshots/comparison-AB-${width}.png"><img src="screenshots/comparison-AB-${width}.png" alt="A y B a ${width} px"></a><p><a href="screenshots/comparison-all-${width}.png">Antes / A / B</a> · <a href="A-${width}.json">Mediciones A</a> · <a href="B-${width}.json">Mediciones B</a></p></section>`).join("\n")}<h2>Casos: foto clara, oscura, variantes, agotado y nombre largo</h2>${["p1", "p2", "p4", "p5", "p7", "p8"].map((id) => `<section><img src="screenshots/comparison-edge-${id}.png" alt="Caso ${id}: A y B"></section>`).join("\n")}<h2>Estado social activo</h2><img src="screenshots/B-active.png" alt="B: siguiendo y favorito"><h2>Solicitud de inicio de sesión original</h2><img src="screenshots/B-login-request.png" alt="Solicitud de sesión"></html>`);
  console.log("A/B comparisons, baseline comparison, edge-case pairs, summary and local gallery generated.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
