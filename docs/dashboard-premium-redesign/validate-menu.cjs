// Local component/navigation validation. No auth adapter, sessions, APIs or database.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const req = createRequire(path.join(root, "package.json"));
const ts = req("typescript");
const esbuild = req("esbuild");
const { chromium } = req("playwright");
const artifactRoot = process.env.DASHBOARD_MENU_EVIDENCE_DIR
  ? path.resolve(process.env.DASHBOARD_MENU_EVIDENCE_DIR)
  : __dirname;
const out = path.join(artifactRoot, "evidence");
const shots = path.join(artifactRoot, "screenshots");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(shots, { recursive: true });
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const hash = (p) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, p)))
    .digest("hex");
const pagePath = "src/app/dashboard/page.tsx";
const dataPath = "src/dashboard/dashboardMenu.ts";
const componentPath = "src/dashboard/componentes/DashboardSections.tsx";
const stylePath = "src/dashboard/componentes/dashboardMenu.module.css";
const baseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, "source-baseline.json"), "utf8"),
);
const originalPage = execFileSync(
  "git",
  ["show", baseline.revision + ":" + pagePath],
  { cwd: root, encoding: "utf8" },
);
assert.equal(
  crypto.createHash("sha256").update(originalPage).digest("hex"),
  baseline.hashes[pagePath],
  "Baseline page must match the recorded initial source",
);
const parse = (source) =>
  ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const before = parse(originalPage),
  after = parse(read(pagePath));
const printer = ts.createPrinter({ removeComments: true });
const normalize = (node, source) =>
  printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, "");
const visit = (node, predicate, found = []) => {
  if (predicate(node)) found.push(node);
  node.forEachChild((child) => {
    visit(child, predicate, found);
  });
  return found;
};
const guards = (sf) =>
  visit(sf, ts.isIfStatement).map((n) => normalize(n.expression, sf));
assert.deepEqual(
  guards(after),
  guards(before),
  "Role/restriction conditions must remain identical",
);
const functionBody = (sf) => sf.statements.find(ts.isFunctionDeclaration).body;
const variableInits = (sf) =>
  functionBody(sf)
    .statements.filter(ts.isVariableStatement)
    .map((n) => normalize(n, sf));
assert.deepEqual(
  variableInits(after),
  variableInits(before),
  "No added data fetching or auth/role variables",
);
const restrictedReturn = (sf) =>
  visit(
    sf,
    (n) =>
      ts.isIfStatement(n) && n.expression.getText(sf) === "businessRestricted",
  )[0].thenStatement;
assert.equal(
  normalize(restrictedReturn(after), after),
  normalize(restrictedReturn(before), before),
  "Restricted business branch unchanged",
);
assert.equal(
  normalize(functionBody(after).statements.at(-1), after),
  normalize(functionBody(before).statements.at(-1), before),
  "User/admin fallback unchanged",
);

const compiledData = ts.transpileModule(read(dataPath), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const dataContext = { exports: {} };
vm.runInNewContext(compiledData, dataContext);
const { dashboardGroups, dashboardQuickActions, superAdminGroups } = JSON.parse(
  JSON.stringify(dataContext.exports),
);
const businessEntries = [
  ...dashboardQuickActions,
  ...dashboardGroups.flatMap((g) => [...g.sections]),
];
const adminEntries = superAdminGroups.flatMap((g) => [...g.sections]);
const originalRoutes = visit(
  before,
  (n) => ts.isPropertyAssignment(n) && n.name.getText(before) === "url",
).map((n) => n.initializer.text);
const originalBusinessRoutes = originalRoutes.filter(
  (url) => !["/myckeoAdmin", "/dashboard/editar-usuario"].includes(url),
);
const expectedBusiness = [
  ...originalBusinessRoutes,
  "/dashboard/organizacion-catalogo",
].sort();
assert.deepEqual(businessEntries.map((e) => e.url).sort(), expectedBusiness);
assert.deepEqual(adminEntries.map((e) => e.url).sort(), [
  "/dashboard/editar-usuario",
  "/myckeoAdmin",
]);
assert.equal(new Set(businessEntries.map((e) => e.id)).size, 11);
assert.equal(
  new Set(businessEntries.map((e) => e.url)).size,
  11,
  "No duplicate navigation entries",
);
for (const entry of [...businessEntries, ...adminEntries]) {
  assert.ok(
    fs.existsSync(path.join(root, "src/app", entry.url, "page.tsx")),
    "Existing destination: " + entry.url,
  );
  assert.ok(entry.descripcion && entry.resumen && entry.titulo);
}
const changedExistingSources = Object.keys(baseline.hashes).filter(
  (p) => hash(p) !== baseline.hashes[p],
);
assert.deepEqual(
  changedExistingSources.sort(),
  [pagePath, componentPath].sort(),
  "No existing internal module, shell, auth, API or Prisma source changed",
);

const entrySource = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import Box from '@mui/material/Box';
import Menu from './src/dashboard/componentes/DashboardSections';
import {dashboardGroups,dashboardQuickActions,superAdminGroups} from './src/dashboard/dashboardMenu';
const root=createRoot(document.getElementById('root'));
window.renderMenu=(width,administrative=false,collapsed=false,businessName=null)=>root.render(
  <Box sx={{display:'flex',minHeight:'100vh',overflowX:'hidden'}}>
    <Box sx={{flex:1,ml:width<=768?0:collapsed?'4rem':'200px',overflowX:'hidden'}}>
      <Box component="main" sx={{mt:'4rem',minHeight:'calc(100vh - 4rem)',bgcolor:'grey.100',p:{xs:2,sm:3,md:4},overflowX:'hidden'}}>
        <div className="max-w-7xl mx-auto p-0 sm:p-2">
          <Menu key={String(administrative)+String(collapsed)}
            groups={administrative?superAdminGroups:dashboardGroups}
            quickActions={administrative?undefined:dashboardQuickActions}
            administrative={administrative} businessName={businessName}/>
        </div>
      </Box>
    </Box>
  </Box>);
window.renderMenu(innerWidth,new URLSearchParams(location.search).has('administrative'));
`;

(async () => {
  const built = await esbuild.build({
    absWorkingDir: root,
    stdin: { contents: entrySource, loader: "tsx", resolveDir: root },
    outfile: "/tmp/myckeo-dashboard-redesign-preview/menu.js",
    bundle: true,
    write: false,
    jsx: "automatic",
    format: "iife",
    platform: "browser",
    minify: true,
    metafile: true,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "existing-local-font",
        setup(build) {
          build.onResolve({ filter: /^next\/font\/local$/ }, () => ({
            path: "inter",
            namespace: "local-font",
          }));
          build.onLoad({ filter: /.*/, namespace: "local-font" }, () => ({
            contents:
              'export default function localFont(){return {className:"redesign-inter"}}',
            loader: "js",
          }));
        },
      },
    ],
    logLevel: "error",
  });
  const script = built.outputFiles.find((f) => f.path.endsWith(".js")).text;
  const componentCss = built.outputFiles.find((f) =>
    f.path.endsWith(".css"),
  ).text;
  const globalCssPath = "/tmp/myckeo-dashboard-redesign-tailwind.css";
  execFileSync(
    process.execPath,
    [
      req.resolve("tailwindcss/lib/cli"),
      "-i",
      "src/app/globals.css",
      "-o",
      globalCssPath,
      "--minify",
    ],
    { cwd: root, stdio: "pipe" },
  );
  const css =
    fs.readFileSync(globalCssPath, "utf8") +
    "\n" +
    componentCss +
    '\n@font-face{font-family:RedesignInter;src:url(/inter.woff2) format("woff2");font-weight:100 900;font-display:swap}.redesign-inter{font-family:RedesignInter,Arial,sans-serif}';
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.DASHBOARD_AUDIT_BROWSER ||
      "/home/nico/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  });
  const results = {
    scope:
      "Isolated production menu, actual metadata/CSS/MUI/Next Link. No sessions or auth mocks. Geometry host copies current shell offsets/padding only, without rendering sidebar/topbar. Font adapter loads existing local Inter asset. Navigation is intercepted, never runs destination modules.",
    sourceRevision: baseline.revision,
    widths: [],
    help: [],
    navigation: [],
    roleStateVerification: {
      method:
        "Static AST comparison with initial source and source hash comparison; no authenticated role simulation",
      roleConditionsIdentical: true,
      authAndRestrictionEvaluationIdentical: true,
      restrictedBranchIdentical: true,
      userAndAdminFallbackIdentical: true,
      sharedLayoutAndSessionPolicyUntouched: true,
    },
    originalBusinessRoutes,
    preservedBusinessRoutes: businessEntries.map((e) => e.url),
    adminRoutes: adminEntries.map((e) => e.url),
    changedExistingSources,
    errors: [],
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => results.errors.push(error.message));
    const html =
      '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/menu.css"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"production"}}</script><script src="/menu.js"></script></body></html>';
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "dashboard-menu.local") return route.abort();
      if (url.pathname === "/menu.js")
        return route.fulfill({ contentType: "text/javascript", body: script });
      if (url.pathname === "/menu.css")
        return route.fulfill({ contentType: "text/css", body: css });
      if (url.pathname === "/inter.woff2")
        return route.fulfill({
          contentType: "font/woff2",
          body: fs.readFileSync(
            path.join(root, "src/assets/fonts/inter-latin-variable.woff2"),
          ),
        });
      if (url.pathname === "/")
        return route.fulfill({ contentType: "text/html", body: html });
      return route.fulfill({
        contentType: "text/html",
        body: "<p>Destino interceptado para validar el enlace. El módulo interno no se ejecuta.</p>",
      });
    });
    async function reset(administrative = false) {
      await page.goto(
        "http://dashboard-menu.local/" +
          (administrative ? "?administrative" : ""),
      );
      await page
        .getByRole("heading", { name: "Panel de gestión", exact: true })
        .waitFor();
      await page.evaluate(() => document.fonts.ready.then(() => {}));
    }
    async function render(
      width,
      administrative = false,
      collapsed = false,
      businessName = null,
    ) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        (args) => window.renderMenu(...args),
        [width, administrative, collapsed, businessName],
      );
      await page.waitForTimeout(50);
    }
    async function geometry(width, collapsed = false) {
      return page.evaluate(
        ({ width, collapsed }) => {
          const rect = (element) => {
            const r = element.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              right: r.right,
              bottom: r.bottom,
            };
          };
          const entries = [...document.querySelectorAll("nav li")].map((li) => {
            const a = li.querySelector("a"),
              b = li.querySelector("button"),
              icon = a.querySelector("svg");
            const link = rect(a),
              help = rect(b),
              iconRect = rect(icon);
            const intersect = (x, y) =>
              Math.max(0, Math.min(x.right, y.right) - Math.max(x.x, y.x)) *
              Math.max(0, Math.min(x.bottom, y.bottom) - Math.max(x.y, y.y));
            return {
              href: a.getAttribute("href"),
              row: rect(li),
              link,
              help,
              iconHelpOverlap: intersect(iconRect, help),
              linkHelpOverlap: intersect(link, help),
              clippedText: [...li.querySelectorAll("span")]
                .filter(
                  (e) => e.clientWidth && e.scrollWidth > e.clientWidth + 1,
                )
                .map((e) => e.textContent),
              clippedRow: li.scrollWidth > li.clientWidth + 1,
            };
          });
          const menus = [...document.querySelectorAll("nav ul")].map((ul) => ({
            columns: getComputedStyle(ul).gridTemplateColumns,
            gap: getComputedStyle(ul).gap,
            rect: rect(ul),
          }));
          const sidebarRight = width <= 768 ? 0 : collapsed ? 64 : 250;
          return {
            width,
            height: innerHeight,
            collapsed,
            documentScrollWidth: document.documentElement.scrollWidth,
            documentScrollHeight: document.documentElement.scrollHeight,
            firstContentX: Math.min(
              document.querySelector("h1").getBoundingClientRect().x,
              ...entries.map((e) => e.row.x),
            ),
            sidebarRight,
            entries,
            menus,
            sectionHeaders: [...document.querySelectorAll("nav > section")].map(
              (section) => {
                const heading = section.querySelector("h2");
                const description = section.querySelector("p");
                const headerIcon = section.querySelector(":scope > header svg");
                const icon = section.querySelector("li a svg");
                return {
                  title: heading.textContent,
                  description: description?.textContent ?? null,
                  category: section.dataset.category ?? null,
                  color: getComputedStyle(section)
                    .getPropertyValue("--section-accent")
                    .trim(),
                  iconColor: icon ? getComputedStyle(icon).color : null,
                  iconBackground: icon
                    ? getComputedStyle(icon.parentElement).backgroundColor
                    : null,
                  titleClipped: heading.scrollWidth > heading.clientWidth + 1,
                  descriptionClipped: description
                    ? description.scrollWidth > description.clientWidth + 1
                    : false,
                  headerIconPresent: Boolean(headerIcon),
                };
              },
            ),
            nestedControls: document.querySelectorAll("a button,a a,button a")
              .length,
          };
        },
        { width, collapsed },
      );
    }
    function assertGeometry(g, expectedCount) {
      assert.equal(
        g.documentScrollWidth,
        g.width,
        "No horizontal document scroll at " + g.width,
      );
      assert.equal(g.entries.length, expectedCount);
      assert.equal(g.nestedControls, 0);
      assert.ok(
        g.firstContentX >= g.sidebarRight,
        "Menu content clears known sidebar bounds at " + g.width,
      );
      for (const e of g.entries) {
        assert.equal(
          e.iconHelpOverlap,
          0,
          "Icon does not overlap help at " + g.width,
        );
        assert.equal(
          e.linkHelpOverlap,
          0,
          "Link and help targets do not overlap",
        );
        assert.equal(e.clippedRow, false, "No clipped row: " + e.href);
        assert.deepEqual(e.clippedText, [], "No clipped label or description");
        assert.ok(e.help.width >= 44 && e.help.height >= 44);
        assert.ok(e.link.height >= 44 && e.link.width >= 44);
        assert.ok(e.row.x >= g.sidebarRight && e.row.right <= g.width);
      }
    }
    await reset();
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
      await render(width);
      const g = await geometry(width);
      assertGeometry(g, 11);
      assert.deepEqual(
        (
          await page
            .locator("nav a")
            .evaluateAll((as) => as.map((a) => a.getAttribute("href")))
        ).sort(),
        expectedBusiness,
      );
      results.widths.push(g);
      await page.screenshot({
        path: path.join(shots, "menu-" + width + ".png"),
        fullPage: true,
      });
    }
    // Boundary widths include the old shell's 768/769 and 899/900 transitions.
    results.boundaries = [];
    for (const width of [599, 600, 639, 640, 767, 769, 899, 900, 1023]) {
      await render(width);
      const g = await geometry(width);
      assertGeometry(g, 11);
      results.boundaries.push({
        width,
        contentX: g.firstContentX,
        sidebarRight: g.sidebarRight,
        columns: g.menus.map((m) => m.columns),
      });
    }
    await render(1024, false, true);
    results.collapsed = await geometry(1024, true);
    assertGeometry(results.collapsed, 11);
    await render(390);
    for (const entry of businessEntries) {
      const button = page.getByRole("button", {
        name: "Información sobre " + entry.titulo,
        exact: true,
      });
      await button.click();
      const dialog = page.getByRole("dialog", {
        name: entry.titulo,
        exact: true,
      });
      await dialog.waitFor();
      assert.equal(await dialog.getAttribute("aria-modal"), "true");
      assert.equal(
        await page
          .getByRole("button", { name: "Cerrar información", exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
        "Initial modal focus",
      );
      assert.equal(
        await dialog.getByText(entry.descripcion, { exact: true }).count(),
        1,
      );
      assert.equal(
        await dialog.getByRole("link").getAttribute("href"),
        entry.url,
      );
      assert.equal(
        await page.evaluate(() => getComputedStyle(document.body).overflow),
        "hidden",
      );
      for (let step = 0; step < 5; step++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await dialog.evaluate((e) => e.contains(document.activeElement)),
          true,
          "Tab remains inside dialog",
        );
      }
      for (let step = 0; step < 3; step++) {
        await page.keyboard.press("Shift+Tab");
        assert.equal(
          await dialog.evaluate((e) => e.contains(document.activeElement)),
          true,
          "Shift+Tab remains inside dialog",
        );
      }
      if (entry.id === "products")
        await page.screenshot({
          path: path.join(shots, "help-390.png"),
          fullPage: false,
        });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.equal(
        await button.evaluate((e) => e === document.activeElement),
        true,
        "Focus restored to trigger",
      );
      results.help.push({
        title: entry.titulo,
        descriptionPreserved: true,
        correctDestination: true,
        initialFocus: true,
        tabContained: true,
        escapeCloses: true,
        focusRestored: true,
      });
    }
    await page
      .getByRole("button", {
        name: "Información sobre Gestión de Productos",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Cerrar información", exact: true })
      .click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page
      .getByRole("button", {
        name: "Información sobre Gestión de Productos",
        exact: true,
      })
      .click();
    await page
      .locator(".MuiDialog-container")
      .click({ position: { x: 2, y: 2 } });
    assert.equal(await page.getByRole("dialog").count(), 0);
    results.closeButtonAndBackdrop = true;
    await page.keyboard.press("Tab");
    await page
      .getByRole("link", { name: "Gestión de Productos", exact: true })
      .focus();
    results.focusOutline = await page
      .getByRole("link", { name: "Gestión de Productos", exact: true })
      .evaluate((e) => ({
        style: getComputedStyle(e).outlineStyle,
        width: getComputedStyle(e).outlineWidth,
        color: getComputedStyle(e).outlineColor,
      }));
    assert.equal(results.focusOutline.style, "solid");
    await page.screenshot({
      path: path.join(shots, "keyboard-focus-390.png"),
      fullPage: true,
    });

    // Native link activation is intercepted locally; destination/auth flows are not executed.
    for (const entry of businessEntries) {
      await reset();
      await page.getByRole("link", { name: entry.titulo, exact: true }).click();
      await page.waitForURL("http://dashboard-menu.local" + entry.url);
      results.navigation.push({
        title: entry.titulo,
        path: new URL(page.url()).pathname,
        kind: "native click, locally intercepted",
      });
    }
    await reset();
    await page.getByRole("link", { name: "Reservas", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("http://dashboard-menu.local/dashboard/reservas");
    results.keyboardLink = true;
    await reset();
    await page
      .getByRole("button", {
        name: "Información sobre Gestión de Productos",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").getByRole("link").click();
    await page.waitForURL("http://dashboard-menu.local/dashboard/productos");
    results.dialogLink = true;

    await reset(true);
    await render(390, true);
    assertGeometry(await geometry(390), 2);
    assert.equal(
      await page
        .getByRole("heading", { name: "Acciones rápidas", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(
      (
        await page
          .locator("nav a")
          .evaluateAll((as) => as.map((a) => a.getAttribute("href")))
      ).sort(),
      ["/dashboard/editar-usuario", "/myckeoAdmin"],
    );
    await page.screenshot({
      path: path.join(shots, "administrative-menu-390.png"),
      fullPage: true,
    });
    results.administrativePresentation =
      "Actual superAdminGroups passed directly to menu; no role/session simulation";
    results.adminHelp = [];
    results.adminNavigation = [];
    for (const entry of adminEntries) {
      await reset(true);
      const trigger = page.getByRole("button", {
        name: "Información sobre " + entry.titulo,
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: entry.titulo,
        exact: true,
      });
      await dialog.waitFor();
      assert.equal(
        await dialog.getByText(entry.descripcion, { exact: true }).count(),
        1,
      );
      assert.equal(
        await dialog.getByRole("link").getAttribute("href"),
        entry.url,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Cerrar información", exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await dialog.evaluate((e) => e.contains(document.activeElement)),
        true,
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.equal(
        await trigger.evaluate((e) => e === document.activeElement),
        true,
      );
      results.adminHelp.push({
        title: entry.titulo,
        descriptionPreserved: true,
        initialFocus: true,
        focusContained: true,
        escapeCloses: true,
        focusRestored: true,
      });
      await page.getByRole("link", { name: entry.titulo, exact: true }).click();
      await page.waitForURL("http://dashboard-menu.local" + entry.url);
      results.adminNavigation.push(new URL(page.url()).pathname);
    }

    await reset();
    await render(
      320,
      false,
      false,
      "Nombre extenso para comprobar el ajuste del texto. ".repeat(8),
    );
    assertGeometry(await geometry(320), 11);
    results.longNameProp =
      "Controlled text stress test passed; not an authenticated business name or session";
    await render(320);
    await page.evaluate(() => {
      const text = [...document.querySelectorAll("main *")].filter(
        (element) =>
          element.childElementCount === 0 && element.textContent.trim(),
      );
      const sizes = text.map((element) => ({
        element,
        font: parseFloat(getComputedStyle(element).fontSize),
        line: parseFloat(getComputedStyle(element).lineHeight),
      }));
      for (const { element, font, line } of sizes) {
        element.style.fontSize = font * 2 + "px";
        if (Number.isFinite(line)) element.style.lineHeight = line * 2 + "px";
      }
    });
    results.textEnlargement = await geometry(320);
    assertGeometry(results.textEnlargement, 11);
    results.textEnlargement.scope =
      "CSS stress test: actual text font sizes and line heights doubled at 320px; not a browser zoom certification";
    await reset();
    await render(320);
    await page.setViewportSize({ width: 320, height: 480 });
    await page
      .getByRole("button", {
        name: "Información sobre Nuevo Producto",
        exact: true,
      })
      .click();
    results.shortDialog = await page.getByRole("dialog").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        viewport: innerHeight,
        scrollHeight: e.scrollHeight,
        clientHeight: e.clientHeight,
      };
    });
    assert.ok(
      results.shortDialog.top >= 0 && results.shortDialog.bottom <= 480,
    );
    await page.keyboard.press("Escape");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await render(390);
    await page
      .getByRole("button", { name: "Información sobre Reservas", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    results.normalMotionDialog = true;
    await page.emulateMedia({ reducedMotion: "reduce" });
    results.reducedMotion = await page
      .locator("nav li")
      .first()
      .evaluate((e) => getComputedStyle(e).transitionDuration);
    assert.equal(results.reducedMotion, "0s");
    assert.deepEqual(results.errors, []);
    results.sourceHashes = Object.fromEntries(
      [
        pagePath,
        dataPath,
        componentPath,
        stylePath,
        "src/ui/components/dashboard/perfil/LayoutDashboardComponent.tsx",
        "src/app/dashboard/layout.tsx",
        "src/auth.config.ts",
      ].map((p) => [p, hash(p)]),
    );
    results.renderedSources = Object.keys(built.metafile.inputs).filter((p) =>
      p.startsWith("src/"),
    );
    results.createdAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(out, "validation-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          widths: results.widths.map((w) => ({
            width: w.width,
            columns: w.menus.map((m) => m.columns),
            contentX: w.firstContentX,
            sidebarRight: w.sidebarRight,
            scrollWidth: w.documentScrollWidth,
            scrollHeight: w.documentScrollHeight,
          })),
          helpChecks: results.help.length,
          navigationClicks: results.navigation.length,
          boundaries: results.boundaries.length,
          roleStateVerification: results.roleStateVerification,
          changedExistingSources,
          errors: results.errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
