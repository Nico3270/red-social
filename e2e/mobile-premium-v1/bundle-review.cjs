// Offline review package. Does not build, deploy or alter application/runtime configuration.
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  evidence = path.join(root, "docs/audits/mobile-premium-v1-evidence");
const pairs = [];
function pair(tag, label, width, position = "") {
  pairs.push({
    label,
    width,
    position,
    before: `before-${tag}.png`,
    after: `after-${tag}.png`,
  });
}
for (const width of [320, 360, 390, 430, 768, 769, 1440])
  for (const position of ["top", "scroll"])
    pair(
      `${width}-${position}`,
      `Mixto · ${width} px · ${position === "top" ? "inicio" : "scroll 950"}`,
      width,
      position,
    );
for (const [tag, label] of Object.entries({
  commerce: "Solo comercial",
  sparse: "Inventario escaso",
  social: "Solo social",
  media: "Publicaciones con medios",
  reviews: "Reseñas vinculadas",
  personal: "Sesión personal",
  owner: "Propietario",
  incomplete: "Perfil incompleto",
}))
  for (const position of ["top", "scroll"])
    pair(
      `${tag}-390-${position}`,
      `${label} · 390 px · ${position === "top" ? "inicio" : "scroll 950"}`,
      390,
      position,
    );
pair(
  "categories-390",
  "Categorías · antes horizontales / después desplegadas",
  390,
);
for (const [tag, label] of Object.entries({
  search: "Búsqueda",
  city: "Selector de ciudad",
  variants: "Variantes del producto",
  publication: "Publicación con imagen",
  video: "Video original · reproducción no certificada",
  "profile-owner": "Menú del propietario",
}))
  pair(`${tag}-390`, label + " · 390 px", 390);
for (const state of ["empty", "loading", "pending-types", "error", "settled"])
  pair(`state-${state}-390`, `Estado controlado: ${state} · 390 px`, 390);
for (const item of pairs)
  for (const key of ["before", "after"])
    if (!fs.existsSync(path.join(evidence, item[key])))
      throw Error("Missing " + item[key]);
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · Móvil Premium V1</title><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#172033;font:15px/1.5 system-ui}header{padding:20px;max-width:1480px;margin:auto}h1{font-size:24px;margin:0 0 8px}p{margin:8px 0}a{color:#a52b40}label{display:block;margin-top:12px}select,button{font:inherit;min-height:44px;padding:8px;border:1px solid #94a3b8;border-radius:8px;background:white;color:inherit;max-width:100%}select{width:min(100%,700px)}button{margin:8px 8px 0 0;cursor:pointer}main{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 16px 24px;max-width:1800px;margin:auto}figure{margin:0;min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}figcaption{padding:12px;font-weight:600}.frame{overflow:auto;text-align:center}img{width:auto;max-width:100%;height:auto;display:block;margin:auto}.native img{max-width:none}@media(max-width:650px){main{grid-template-columns:1fr}}</style><header><h1>Myckeo · Móvil Premium V1</h1><p>Prototipo local para revisión. Base publicada <code>89f2741</code>. Propuesta móvil hasta 768 px; escritorio conservado.</p><p>Ambas versiones usan el mismo inventario público congelado y sus fotografías. Inicio y scroll de 950 px; al cambiar alturas puede variar la tarjeta visible. Las sesiones y los estados se simulan en el navegador aislado. No son capturas de dos momentos distintos del catálogo público.</p><p><a href="../MYCKEO_MOBILE_PREMIUM_V1.md">Diagnóstico, decisiones, comprobaciones y límites</a> · <a href="public-baseline-390.png">Entrada pública real de referencia</a></p><label for="case">Comparación</label><select id="case"></select><p id="status" aria-live="polite"></p><button id="previous">Anterior</button><button id="next">Siguiente</button><button id="zoom" aria-pressed="false">Tamaño original</button><p>Video: se conserva la fuente MP4 y los controles nativos. Chromium de este entorno no dispone de decodificador H.264. El teclado virtual y los insets se verifican mediante simulación de viewport; falta validación en iOS/Android reales.</p></header><main><figure><figcaption>Antes · publicada · <a id="beforeLink">Abrir PNG</a></figcaption><div class="frame"><img id="before" alt="Versión publicada"></div></figure><figure><figcaption>Después · propuesta · <a id="afterLink">Abrir PNG</a></figcaption><div class="frame"><img id="after" alt="Propuesta móvil"></div></figure></main><script>const cases=${JSON.stringify(pairs)};const selector=document.querySelector('#case');cases.forEach((c,i)=>selector.add(new Option(c.label,i)));function show(){const c=cases[selector.selectedIndex];for(const key of ['before','after']){document.querySelector('#'+key).src=c[key];document.querySelector('#'+key+'Link').href=c[key];}document.querySelector('#status').textContent=(selector.selectedIndex+1)+' / '+cases.length+' · '+c.label;}selector.onchange=show;document.querySelector('#previous').onclick=()=>{selector.selectedIndex=(selector.selectedIndex+cases.length-1)%cases.length;show()};document.querySelector('#next').onclick=()=>{selector.selectedIndex=(selector.selectedIndex+1)%cases.length;show()};document.querySelector('#zoom').onclick=e=>{const on=document.querySelector('main').classList.toggle('native');e.currentTarget.setAttribute('aria-pressed',on);};show();</script></html>`;
fs.writeFileSync(path.join(evidence, "index.html"), html);
fs.writeFileSync(
  path.join(evidence, "comparison-manifest.json"),
  JSON.stringify(pairs, null, 2),
);
if (process.argv.includes("--package")) {
  const dest = "/home/nico/worktrees/myckeo-mobile-premium-v1-review-20261125";
  if (fs.existsSync(dest))
    throw Error(
      "Review folder already exists; preserve it or choose a new destination",
    );
  fs.mkdirSync(path.join(dest, "docs/audits"), { recursive: true });
  fs.cpSync(
    evidence,
    path.join(dest, "docs/audits/mobile-premium-v1-evidence"),
    { recursive: true },
  );
  fs.copyFileSync(
    path.join(root, "docs/audits/MYCKEO_MOBILE_PREMIUM_V1.md"),
    path.join(dest, "docs/audits/MYCKEO_MOBILE_PREMIUM_V1.md"),
  );
  fs.writeFileSync(
    path.join(dest, "index.html"),
    '<!doctype html><html lang="es"><meta charset="utf-8"><title>Myckeo · Revisión móvil</title><h1>Myckeo · Móvil Premium V1</h1><p><a href="docs/audits/mobile-premium-v1-evidence/index.html">Abrir comparador antes/después</a></p><p><a href="docs/audits/MYCKEO_MOBILE_PREMIUM_V1.md">Leer informe</a></p><p>Todo el comparador funciona sin red. Extráelo antes de abrir index.html.</p></html>',
  );
  const revision = {
    branch: cp
      .execFileSync("git", ["branch", "--show-current"], {
        cwd: root,
        encoding: "utf8",
      })
      .trim(),
    commit: cp
      .execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      })
      .trim(),
    base: "89f2741578ec666fbcdcabb1e1d23126b5609f31",
    worktree: root,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(dest, "revision.json"),
    JSON.stringify(revision, null, 2),
  );
  cp.execFileSync("zip", ["-rq", dest + ".zip", path.basename(dest)], {
    cwd: path.dirname(dest),
  });
  console.log(dest + ".zip");
}
console.log(pairs.length + " offline before/after pairs");
