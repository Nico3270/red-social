const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  folder = path.join(root, "docs/audits/mobile-premium-v2-evidence"),
  cases = [];
function add(tag, label, width = 390) {
  cases.push({
    label,
    width,
    published: `published-${tag}.png`,
    v1: `v1-${tag}.png`,
    v2: `after-${tag}.png`,
  });
}
for (const width of [320, 360, 390, 430, 768, 769, 1440])
  for (const position of ["top", "scroll"])
    add(
      `${width}-${position}`,
      `${width} px · ${position === "top" ? "inicio" : "scroll 950"}`,
      width,
    );
for (const [tag, label] of Object.entries({
  commerce: "Solo oferta comercial",
  sparse: "Inventario escaso",
  social: "Solo social",
  media: "Publicación con medio",
  reviews: "Reseñas vinculadas",
  personal: "Sesión personal",
  owner: "Propietario",
  incomplete: "Perfil incompleto",
}))
  for (const position of ["top", "scroll"])
    add(
      `${tag}-390-${position}`,
      `${label} · ${position === "top" ? "inicio" : "scroll 950"}`,
    );
add(
  "categories-390",
  "Categorías · horizontal publicada / desplegadas V1 y V2",
);
for (const [tag, label] of Object.entries({
  search: "Búsqueda",
  city: "Ubicación",
  variants: "Variantes",
  publication: "Diálogo de publicación",
  video: "Diálogo de video · H.264 no certificado",
  "profile-owner": "Perfil propietario",
}))
  add(`${tag}-390`, label);
for (const state of ["empty", "loading", "pending-types", "error", "settled"])
  add(`state-${state}-390`, "Estado controlado · " + state);
for (const [tag, label] of Object.entries({
  food: "Comida",
  shoe: "Calzado",
  fashion: "Moda",
  social: "Publicación social",
  poster: "Póster de video",
  review: "Reseña relacionada",
}))
  cases.push({
    label: "Tarjeta · " + label,
    width: 390,
    published: `published-key-${tag}-390.png`,
    v1: `v1-key-${tag}-390.png`,
    v2: `v2-key-${tag}-390.png`,
  });
for (const entry of cases)
  for (const key of ["published", "v1", "v2"])
    if (!fs.existsSync(path.join(folder, entry[key])))
      throw Error("Missing " + entry[key]);
fs.writeFileSync(
  path.join(folder, "comparison-manifest.json"),
  JSON.stringify(cases, null, 2),
);
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · Mobile Premium V2</title><style>*{box-sizing:border-box}body{margin:0;background:#fbf9fb;color:#302333;font:15px/1.5 system-ui}header{max-width:1600px;margin:auto;padding:20px}h1{font-size:26px;margin:0 0 8px}p{margin:8px 0}a{color:#a52c50}select,button{min-height:44px;font:inherit;color:inherit;padding:8px;border:1px solid #d6bdc8;border-radius:10px;background:white;max-width:100%}label{display:block;margin:12px 0 6px}select{width:min(100%,780px)}button{margin:8px 8px 0 0;cursor:pointer}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0 16px 24px;max-width:2100px;margin:auto}figure{margin:0;min-width:0;background:#fff;border:1px solid #ecdce3;border-radius:14px;overflow:hidden}figcaption{padding:12px;font-weight:650}.frame{overflow:auto;text-align:center}img{max-width:100%;height:auto;display:block;margin:auto}.native img{max-width:none}@media(max-width:800px){main{grid-template-columns:1fr}}.note{font-size:13px;color:#675268}</style><header><h1>Myckeo · Mobile Premium V2</h1><p>Publicada <code>89f2741</code> → V1 <code>251f295</code> → V2 local. La cabecera se mantiene en 64 px y desaparece la franja comercial de 48 px. Negocio permanece en la barra o en Perfil según sesión. Imágenes con su proporción original, menos espacio entre título y acciones, navegación con color y acentos de marca.</p><p><a href="../MYCKEO_MOBILE_PREMIUM_V2.md">Diagnóstico, decisiones, pruebas y límites</a> · <a href="verification-summary.json">Resumen de verificaciones</a></p><p class="note">Mismo inventario público congelado y fotografías cacheadas. El scroll es de 950 px en las tres versiones; al cambiar las alturas puede verse una tarjeta diferente. Las sesiones y estados se controlan en un entorno aislado. Los recortes de tarjeta se capturan directamente en el navegador, sin retocar las imágenes.</p><label for="case">Comparación</label><select id="case"></select><p id="status" aria-live="polite"></p><button id="previous">Anterior</button><button id="next">Siguiente</button><button id="zoom" aria-pressed="false">Tamaño original</button><p class="note">Las capturas de inventario general de publicada y V1 se reutilizan de la entrega anterior. Los detalles de tarjetas y la referencia de escritorio se recapturan en sus commits. Teclado/safe-area: simulación; H.264 y dispositivos reales pendientes. No hay publicación de V2.</p><p class="note"><a href="after-keyboard-search-390.png">Teclado: búsqueda V2</a> · <a href="after-keyboard-cart-390.png">Teclado: carrito V2</a></p></header><main>${[
  ["published", "Publicada · 89f2741"],
  ["v1", "Prototipo V1 · 251f295"],
  ["v2", "Propuesta V2"],
]
  .map(
    ([id, title]) =>
      `<figure><figcaption>${title} · <a id="${id}Link">PNG original</a></figcaption><div class="frame"><img id="${id}" alt="${title}"></div></figure>`,
  )
  .join(
    "",
  )}</main><script>const cases=${JSON.stringify(cases)},select=document.querySelector('#case');cases.forEach((c,i)=>select.add(new Option(c.label,i)));function show(){const c=cases[select.selectedIndex];for(const key of ['published','v1','v2']){document.getElementById(key).src=c[key];document.getElementById(key+'Link').href=c[key];}document.getElementById('status').textContent=(select.selectedIndex+1)+' / '+cases.length+' · '+c.label;}select.onchange=show;document.getElementById('previous').onclick=()=>{select.selectedIndex=(select.selectedIndex+cases.length-1)%cases.length;show()};document.getElementById('next').onclick=()=>{select.selectedIndex=(select.selectedIndex+1)%cases.length;show()};document.getElementById('zoom').onclick=e=>{e.currentTarget.setAttribute('aria-pressed',document.querySelector('main').classList.toggle('native'))};show();</script></html>`;
fs.writeFileSync(path.join(folder, "index.html"), html);
if (process.argv.includes("--package")) {
  const dest = "/home/nico/worktrees/myckeo-mobile-premium-v2-review-20261126";
  if (fs.existsSync(dest)) throw Error("Refusing to overwrite existing review");
  fs.mkdirSync(path.join(dest, "docs/audits"), { recursive: true });
  fs.cpSync(folder, path.join(dest, "docs/audits/mobile-premium-v2-evidence"), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(root, "docs/audits/MYCKEO_MOBILE_PREMIUM_V2.md"),
    path.join(dest, "docs/audits/MYCKEO_MOBILE_PREMIUM_V2.md"),
  );
  fs.writeFileSync(
    path.join(dest, "index.html"),
    '<!doctype html><html lang="es"><meta charset="utf-8"><title>Myckeo V2</title><h1>Myckeo · Mobile Premium V2</h1><p><a href="docs/audits/mobile-premium-v2-evidence/index.html">Abrir comparador publicada / V1 / V2</a></p><p><a href="docs/audits/MYCKEO_MOBILE_PREMIUM_V2.md">Leer informe</a></p><p>Extraer antes de abrir. La revisión funciona sin red.</p></html>',
  );
  const git = (...args) =>
    cp.execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  fs.writeFileSync(
    path.join(dest, "revision.json"),
    JSON.stringify(
      {
        branch: git("branch", "--show-current"),
        commit: git("rev-parse", "HEAD"),
        v1: "251f29501891a6896d85dbbb0f4d4d95ab151ded",
        published: "89f2741578ec666fbcdcabb1e1d23126b5609f31",
        worktree: root,
      },
      null,
      2,
    ),
  );
  cp.execFileSync("python3", [
    "-c",
    "import sys,zipfile\nfrom pathlib import Path\nr=Path(sys.argv[1])\nwith zipfile.ZipFile(str(r)+'.zip','x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:\n for p in sorted(r.rglob('*')):\n  if p.is_file(): z.write(p,p.relative_to(r.parent))",
    dest,
  ]);
  console.log(dest + ".zip");
}
console.log(cases.length + " triple comparisons");
