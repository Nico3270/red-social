// Compare fresh before/after component captures and protect this visual-only scope.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../../..");
const req = createRequire(path.join(root, "package.json"));
const ts = req("typescript");
const { chromium } = req("playwright");
const load = (relative) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, relative), "utf8"));
const before = load("before/evidence/validation-results.json");
const after = load("after/evidence/validation-results.json");
const baseline = load("source-baseline.json");
const component = "src/dashboard/componentes/DashboardSections.tsx";
const stylesheet = "src/dashboard/componentes/dashboardMenu.module.css";
const hash = (p) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, p)))
    .digest("hex");
const changed = Object.keys(baseline.hashes).filter(
  (p) => hash(p) !== baseline.hashes[p],
);
assert.deepEqual(changed.sort(), [component, stylesheet].sort());
for (const p of Object.keys(after.sourceHashes))
  assert.equal(hash(p), after.sourceHashes[p]);

const parse = (source) =>
  ts.createSourceFile(
    "menu.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const oldSource = parse(
  fs.readFileSync(
    path.join(__dirname, "DashboardSections.tsx.before.txt"),
    "utf8",
  ),
);
const newSource = parse(fs.readFileSync(path.join(root, component), "utf8"));
const printer = ts.createPrinter({ removeComments: true });
function visit(node, test, output = []) {
  if (test(node)) output.push(node);
  node.forEachChild((child) => {
    visit(child, test, output);
  });
  return output;
}
const norm = (node, source) =>
  printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, "");
const dialog = (source) =>
  visit(
    source,
    (node) =>
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === "Dialog",
  )[0];
assert.equal(
  norm(dialog(newSource), newSource),
  norm(dialog(oldSource), oldSource),
  "Complete Dialog subtree unchanged",
);
const eventAttributes = (source) =>
  visit(
    source,
    (node) =>
      ts.isJsxAttribute(node) &&
      [
        "href",
        "onClick",
        "onClose",
        "onHelp",
        "autoFocus",
        "transitionDuration",
      ].includes(node.name.getText(source)),
  ).map((node) => norm(node, source));
assert.deepEqual(
  eventAttributes(newSource),
  eventAttributes(oldSource),
  "Navigation/help handlers and targets unchanged",
);
const main = (source) =>
  source.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === "DashboardSections",
  );
const state = (source) =>
  main(source)
    .body.statements.filter(ts.isVariableStatement)
    .map((node) => norm(node, source));
assert.deepEqual(
  state(newSource),
  state(oldSource),
  "Hooks and close callback unchanged",
);
assert.deepEqual(after.preservedBusinessRoutes, before.preservedBusinessRoutes);
assert.deepEqual(after.adminRoutes, before.adminRoutes);
assert.deepEqual(after.errors, []);

function luminance(rgb) {
  const channels = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return channels.reduce(
    (sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i],
    0,
  );
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const colors = {
  catalog: "#3974c6",
  operations: "#278459",
  presence: "#8355c6",
};
const comparisons = after.widths.map((width, i) => {
  const previous = before.widths[i];
  assert.equal(width.width, previous.width);
  assert.deepEqual(
    width.menus.map((m) => m.columns),
    previous.menus.map((m) => m.columns),
  );
  const cardDeltas = width.entries.map(
    (entry, index) => entry.row.height - previous.entries[index].row.height,
  );
  assert.ok(
    cardDeltas.every((delta) => Math.abs(delta) < 0.01),
    "Card heights unchanged at " + width.width,
  );
  const categories = width.sectionHeaders.filter(
    (header) => header.category in colors,
  );
  assert.equal(categories.length, 3);
  for (const header of width.sectionHeaders) {
    assert.ok(header.headerIconPresent && header.description);
    assert.equal(header.titleClipped, false);
    assert.equal(header.descriptionClipped, false);
    if (header.category) assert.equal(header.color, colors[header.category]);
    assert.ok(contrast(header.iconColor, header.iconBackground) >= 3);
  }
  return {
    width: width.width,
    beforeHeight: previous.documentScrollHeight,
    afterHeight: width.documentScrollHeight,
    heightDifference:
      width.documentScrollHeight - previous.documentScrollHeight,
    cardHeightDifference: cardDeltas,
    columns: width.menus.map((m) => m.columns),
    horizontalScroll: width.documentScrollWidth > width.width,
    categories: categories.map((header) => ({
      name: header.title,
      color: header.color,
      iconBackground: header.iconBackground,
      iconContrast: contrast(header.iconColor, header.iconBackground),
    })),
  };
});
const result = {
  createdAt: new Date().toISOString(),
  scope:
    "Visual-only comparison of isolated components. No authenticated sessions.",
  baselineFiles: Object.keys(baseline.hashes).length,
  changedProductFiles: changed,
  preservedFiles: Object.keys(baseline.hashes).length - changed.length,
  dialogSubtreeIdentical: true,
  navigationAndHelpAttributesIdentical: true,
  hooksAndCloseCallbackIdentical: true,
  elevenBusinessAndTwoAdminDestinationsPreserved: true,
  comparisons,
};
fs.writeFileSync(
  path.join(__dirname, "visual-comparison.json"),
  JSON.stringify(result, null, 2),
);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.DASHBOARD_AUDIT_BROWSER ||
      "/home/nico/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    for (const width of [390, 1440]) {
      const imageWidth = width === 390 ? 390 : 720;
      await page.setViewportSize({ width: imageWidth * 2 + 60, height: 900 });
      const pictures = ["before", "after"].map((stage, i) => {
        const data = fs
          .readFileSync(
            path.join(
              __dirname,
              stage,
              "screenshots",
              "menu-" + width + ".png",
            ),
          )
          .toString("base64");
        return (
          "<section><h2>" +
          (i ? "Después" : "Antes") +
          '</h2><img width="' +
          imageWidth +
          '" src="data:image/png;base64,' +
          data +
          '"></section>'
        );
      });
      await page.setContent(
        '<!doctype html><html lang="es"><style>body{margin:0;padding:20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;background:#fff;font:14px system-ui;color:#26272d}h2{margin:0 0 12px;font-size:16px}img{display:block;max-width:100%;height:auto;border:1px solid #e3e4e8;box-sizing:border-box}section{min-width:0}</style>' +
          pictures.join("") +
          "</html>",
      );
      await page
        .locator("img")
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode())),
        );
      await page.screenshot({
        path: path.join(__dirname, "comparison-" + width + ".png"),
        fullPage: true,
      });
    }
  } finally {
    await browser.close();
  }
  console.log(
    JSON.stringify(
      {
        changedProductFiles: changed,
        preservedFiles: result.preservedFiles,
        dialogsIdentical: true,
        routesPreserved: true,
        widths: comparisons.map((c) => ({
          width: c.width,
          beforeHeight: c.beforeHeight,
          afterHeight: c.afterHeight,
          cardHeightChanged: c.cardHeightDifference.some(Boolean),
          horizontalScroll: c.horizontalScroll,
        })),
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
