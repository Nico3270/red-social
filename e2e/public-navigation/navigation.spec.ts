import { test, expect, chromium, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(
  root,
  "test-results/public-navigation",
  process.env.NAVIGATION_EVIDENCE_TAG || "",
);
const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];
const routes = [
  "/dashboard/crear-publicacion",
  "/dashboard/servicios",
  "/dashboard/productos/nuevo_producto",
  "/dashboard/orders",
  "/dashboard/transacciones",
  "/dashboard/encuestas",
  "/dashboard/reservas",
];
const searchResults = [
  {
    id: "1",
    name: "Café de origen colombiano",
    type: "producto",
    slug: "cafe-producto",
  },
  {
    id: "2",
    name: "Cafetería de prueba",
    type: "negocio",
    slug: "cafe-negocio",
  },
  { id: "3", name: "Categoría de prueba", type: "category", slug: "comida" },
  {
    id: "4",
    name: "Servicio de prueba",
    type: "servicio",
    slug: "cafe-servicio",
    tab: "Negocio",
  },
  {
    id: "5",
    name: "Usuario de prueba",
    type: "usuario",
    slug: "usuario-prueba",
  },
];
const checks: Record<string, unknown>[] = [];
let bundles: {
  current: string;
  before: string;
  css: string;
  beforeCss: string;
  tailwind: string;
};
const baselineSources = new Map<string, string>();

test.beforeAll(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const requireProject = createRequire(path.join(root, "package.json"));
  const esbuild = createRequire(requireProject.resolve("tsx/package.json"))(
    "esbuild",
  ) as typeof import("esbuild");
  const files = [
    "src/ui/components/topMenu/TopMenu.tsx",
    "src/ui/components/topMenuMobile/TopMenuMobile.tsx",
    "src/ui/components/topMenu/Crear.tsx",
    "src/busqueda/componentes/SearchBar.tsx",
  ];
  const oldDir = fs.mkdtempSync("/tmp/myckeo-nav-baseline-");
  for (const file of files) {
    const source = execFileSync(
      "git",
      ["show", `6e849626c6b3e77266bacf8dd9d5d69532395a51:${file}`],
      { encoding: "utf8" },
    );
    baselineSources.set(path.join(root, file), source);
    fs.writeFileSync(path.join(oldDir, path.basename(file)), source);
  }
  async function build(before: boolean) {
    const result = await esbuild.build({
      entryPoints: ["e2e/public-navigation/harness.tsx"],
      absWorkingDir: root,
      bundle: true,
      write: false,
      outdir: "/tmp/myckeo-navigation-bundle",
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      logLevel: "error",
      define: { "process.env.NODE_ENV": '"development"' },
      alias: {
        "@/ui": path.join(root, "e2e/public-navigation/ui.ts"),
        "next/navigation": path.join(
          root,
          "e2e/public-navigation/boundaries.tsx",
        ),
        "next-auth/react": path.join(
          root,
          "e2e/public-navigation/boundaries.tsx",
        ),
        "next/image": path.join(root, "e2e/public-navigation/boundaries.tsx"),
        "next/link": path.join(root, "e2e/public-navigation/link.tsx"),
        "@/config/fonts": path.join(
          root,
          "e2e/public-navigation/boundaries.tsx",
        ),
        "@/preferences/actions/updateUserPreferences": path.join(
          root,
          "e2e/public-navigation/boundaries.tsx",
        ),
      },
      plugins: before
        ? [
            {
              name: "original-navigation",
              setup(build: import("esbuild").PluginBuild) {
                build.onLoad(
                  { filter: /(TopMenu|TopMenuMobile|Crear|SearchBar)\.tsx$/ },
                  (args) => {
                    const source = baselineSources.get(args.path);
                    return source
                      ? {
                          contents: source,
                          loader: "tsx",
                          resolveDir: path.dirname(args.path),
                        }
                      : undefined;
                  },
                );
              },
            },
          ]
        : [],
    });
    return {
      js: result.outputFiles.find((f) => f.path.endsWith(".js"))!.text,
      css: result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "",
    };
  }
  const current = await build(false),
    before = await build(true);
  const tailwind = execFileSync(
    path.join(root, "node_modules/.bin/tailwindcss"),
    [
      "-i",
      "src/app/globals.css",
      "--content",
      `./src/ui/components/{topMenu,topMenuMobile,menu-section-bar,side-bar}/**/*.tsx,./src/busqueda/componentes/*.tsx,./src/app/**/layout.tsx,${oldDir}/*.tsx`,
      "--minify",
    ],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 },
  ).toString();
  bundles = {
    current: current.js,
    before: before.js,
    css: current.css,
    beforeCss: before.css,
    tailwind,
  };
});
test.afterAll(() =>
  fs.writeFileSync(
    path.join(dir, "layout-measurements.json"),
    JSON.stringify(checks, null, 2),
  ),
);

async function open(
  page: Page,
  {
    role = "negocio",
    before = false,
    route = "/",
    cartCount = 2,
    failedSearch = false,
  }: {
    role?: string | null;
    before?: boolean;
    route?: string;
    cartCount?: number;
    failedSearch?: boolean;
  } = {},
) {
  await page.addInitScript(
    (config) => {
      window.navigationTest = {
        ...config,
        navigations: [],
        preferenceWrites: 0,
      };
      document.cookie = "myckeo-consent=true; path=/";
    },
    { role, path: route, cartCount },
  );
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/styles.css")
      return route.fulfill({
        contentType: "text/css",
        body:
          bundles.tailwind +
          (before ? bundles.beforeCss : bundles.css) +
          fixtureCss,
      });
    if (url.pathname === "/bundle.js")
      return route.fulfill({
        contentType: "text/javascript",
        body: before ? bundles.before : bundles.current,
      });
    if (url.pathname === "/api/search") {
      if (failedSearch)
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"error":"Simulado"}',
        });
      const query = url.searchParams.get("query");
      if (query === "lento")
        await new Promise((resolve) => setTimeout(resolve, 700));
      return route
        .fulfill({
          contentType: "application/json",
          body: JSON.stringify(
            query === "vacio"
              ? []
              : searchResults.map((r) =>
                  query === "lento" ? { ...r, name: "Respuesta antigua" } : r,
                ),
          ),
        })
        .catch(() => {});
    }
    if (
      url.pathname === "/fonts/inter.woff2" ||
      url.pathname === "/fonts/title.woff2"
    )
      return route.fulfill({
        contentType: "font/woff2",
        body: fs.readFileSync(
          path.join(
            root,
            url.pathname.includes("inter")
              ? "src/assets/fonts/inter-latin-variable.woff2"
              : "src/assets/fonts/montserrat-alternates-latin-700.woff2",
          ),
        ),
      });
    if (url.pathname.startsWith("/imgs/")) {
      const file = path.join(root, "public", decodeURIComponent(url.pathname));
      if (fs.existsSync(file))
        return route.fulfill({
          body: fs.readFileSync(file),
          contentType: file.endsWith(".png") ? "image/png" : "image/webp",
        });
      return route.abort();
    }
    if (url.hostname === "localhost" && url.pathname === "/")
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      });
    return route.abort();
  });
  await page.goto("http://localhost:3192/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("header")).toBeVisible();
}
const fixtureCss =
  "@font-face{font-family:Inter;src:url('/fonts/inter.woff2')}@font-face{font-family:Title;src:url('/fonts/title.woff2');font-weight:700}body{margin:0;font-family:Inter,Arial,sans-serif}.fixture-title{font-family:Title,Arial,sans-serif}.fixture-page{min-height:1100px;padding:28px 20px 100px;background:#fafafa}.fixture-page>p:first-child{font-size:11px;color:#9a3412;text-align:right}.fixture-page h1{font-size:30px;font-weight:650;margin-top:30px}.fixture-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}.fixture-cards article{padding:24px 12px;min-height:160px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;color:#6b7280}@media(max-width:500px){.fixture-cards{grid-template-columns:1fr}}";
async function searchInput(page: Page) {
  const trigger = page.getByRole("button", {
    name: "Abrir búsqueda",
    exact: true,
  });
  if (await trigger.isVisible()) await trigger.click();
  const input = page.getByRole("combobox", {
    name: "Buscar productos, negocios o categorías",
    exact: true,
  });
  await input.focus();
  return input;
}
async function measure(page: Page, width: number, state: string) {
  const data = await page.evaluate(() => {
    const visible = (e: Element) =>
      e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
      e.getBoundingClientRect().width > 0 &&
      e.getBoundingClientRect().height > 0;
    const top = document.querySelector("header");
    const candidates = [
      ...document.querySelectorAll(
        "header > div:first-child a,header > div:first-child button,header > div:first-child input,nav[aria-label='Navegación principal'] a,nav[aria-label='Navegación principal'] button,[role=dialog], [role=dialog] input, [role=listbox]",
      ),
    ].filter(visible);
    const outside = candidates
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.left < -1 || r.right > innerWidth + 1;
      })
      .map((e) => ({
        text: e.getAttribute("aria-label") || e.textContent?.trim(),
        x: e.getBoundingClientRect().x,
        width: e.getBoundingClientRect().width,
      }));
    const primary = [
      ...document.querySelectorAll(
        "header > div:first-child a,header > div:first-child button,header > div:first-child input,nav[aria-label='Navegación principal'] a,nav[aria-label='Navegación principal'] button",
      ),
    ].filter(visible);
    const smallTargets = primary
      .filter(
        (e) =>
          e.matches("a,button") &&
          (e.getBoundingClientRect().width < 43.5 ||
            e.getBoundingClientRect().height < 43.5),
      )
      .map((e) => e.getAttribute("aria-label") || e.textContent?.trim());
    const collisions: string[][] = [];
    for (let i = 0; i < primary.length; i++)
      for (let j = i + 1; j < primary.length; j++) {
        const a = primary[i].getBoundingClientRect(),
          b = primary[j].getBoundingClientRect();
        if (
          a.right > b.left + 1 &&
          a.left < b.right - 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1
        )
          collisions.push([
            primary[i].getAttribute("aria-label") ||
              primary[i].textContent?.trim() ||
              "input",
            primary[j].getAttribute("aria-label") ||
              primary[j].textContent?.trim() ||
              "input",
          ]);
      }
    const brand =
      top?.querySelector('a[href="/"] span') ||
      top?.querySelector('a[href="/"]');
    const search = top?.querySelector(
      'button[aria-label="Abrir búsqueda"],input[role=combobox]',
    );
    const overlap =
      brand && search
        ? (() => {
            const a = brand.getBoundingClientRect(),
              b = search.getBoundingClientRect();
            return (
              a.right > b.left + 1 &&
              a.left < b.right &&
              a.top < b.bottom &&
              a.bottom > b.top
            );
          })()
        : false;
    const dialog = document
      .querySelector("[role=dialog]")
      ?.getBoundingClientRect();
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      outside,
      smallTargets,
      collisions,
      brandSearchOverlap: Boolean(overlap),
      dialog: dialog
        ? { top: dialog.top, bottom: dialog.bottom, height: innerHeight }
        : null,
    };
  });
  checks.push({ width, state, ...data });
  expect(
    data.documentWidth,
    `${width} ${state} document overflow`,
  ).toBeLessThanOrEqual(data.viewport);
  expect(data.outside, `${width} ${state} offscreen controls`).toEqual([]);
  expect(data.smallTargets, `${width} ${state} small touch targets`).toEqual(
    [],
  );
  expect(data.collisions, `${width} ${state} overlapping controls`).toEqual([]);
  expect(data.brandSearchOverlap, `${width} ${state} brand overlap`).toBe(
    false,
  );
  if (data.dialog) {
    expect(data.dialog.top).toBeGreaterThanOrEqual(0);
    expect(data.dialog.bottom).toBeLessThanOrEqual(data.dialog.height + 1);
  }
}
async function createButton(page: Page) {
  return page.getByRole("button", { name: "Crear", exact: true });
}
async function checkCreate(page: Page, width: number, suffix = "after") {
  const button = await createButton(page);
  await button.click();
  const dialog = page.getByRole("dialog", { name: "¿Qué deseas crear?" });
  await expect(dialog).toBeVisible();
  expect(
    await dialog
      .locator("a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(routes);
  await measure(page, width, "create-dialog");
  await expect(
    page.getByRole("button", { name: "Cerrar Crear" }),
  ).toBeInViewport();
  for (const link of await dialog.locator("a").all()) {
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeInViewport();
  }
  await dialog.locator("a").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dir}/${width}-create-${suffix}.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("button", { name: "Cerrar Crear" }).click();
  await expect(dialog).toHaveCount(0);
  await button.click();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
}

for (const width of widths)
  test(`navigation ${width}: roles, search and complete create dialog`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const role of [null, "user", "negocio"]) {
      await open(page, { role });
      await measure(page, width, `header-${role ?? "guest"}`);
      await expect(
        page.locator("header").getByText("Myckeo", { exact: true }),
      ).toBeVisible();
      const nav = page.getByRole("navigation", {
        name: "Navegación principal",
      });
      await expect(nav.locator('a[href="/carro"]')).toBeVisible();
      await expect(nav.locator('a[href="/favoritos"]')).toBeVisible();
      const canCreate = width <= 768 ? role === "user" : role === "negocio";
      await expect(await createButton(page)).toHaveCount(canCreate ? 1 : 0);
      if (width <= 768 && role === "negocio")
        await expect(nav.locator('a[href="/dashboard"]')).toBeVisible();
      if (role === "negocio") {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${dir}/${width}-header-after.png` });
      }
      const input = await searchInput(page);
      await input.fill("cafe");
      await expect(page.getByRole("option")).toHaveCount(5);
      await measure(page, width, `search-${role ?? "guest"}`);
      await page.screenshot({ path: `${dir}/${width}-search-after.png` });
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      expect(
        await page.evaluate(() => window.navigationTest.navigations.at(-1)),
      ).toBe("/producto/cafe-producto");
      if (canCreate) await checkCreate(page, width);
    }
  });

test("search result destinations, stale responses, errors, blur and profile access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, { role: "negocio", cartCount: 0 });
  await expect(
    page
      .getByRole("navigation", { name: "Navegación principal" })
      .locator('a[href="/empty"]'),
  ).toBeVisible();
  const urls = [
    "/producto/cafe-producto",
    "/perfil/cafe-negocio",
    "/category/comida",
    "/perfil/cafe-servicio?tab=Negocio",
    "/perfil/usuario-prueba",
  ];
  for (let i = 0; i < urls.length; i++) {
    const input = await searchInput(page);
    await input.fill("cafe");
    await expect(page.getByRole("option")).toHaveCount(5);
    await page.getByRole("option").nth(i).click();
    expect(
      await page.evaluate(() => window.navigationTest.navigations.at(-1)),
    ).toBe(urls[i]);
  }
  const input = await searchInput(page);
  await input.fill("lento");
  await page.waitForTimeout(350);
  await input.fill("rapido");
  await expect(page.getByRole("option").first()).toContainText(
    "Café de origen",
  );
  await page.waitForTimeout(750);
  await expect(page.getByRole("option").first()).not.toContainText("antigua");
  await input.fill("vacio");
  await expect(page.getByRole("status")).toContainText(
    "No encontramos resultados",
  );
  await input.fill("cafe");
  await expect(page.getByRole("option")).toHaveCount(5);
  await page.locator(".fixture-cards article").last().click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.getByRole("button", { name: /^Perfil/ }).click();
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.unrouteAll({ behavior: "wait" });
  await open(page, { role: null, failedSearch: true });
  await (await searchInput(page)).fill("cafe");
  await expect(page.getByRole("status")).toContainText("No pudimos buscar");
});

for (const width of [390, 1440])
  test(`create navigation routes ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { role: width < 769 ? "user" : "negocio" });
    for (const route of routes) {
      await (await createButton(page)).click();
      await page.getByRole("dialog").locator(`a[href="${route}"]`).click();
      expect(
        await page.evaluate(() => window.navigationTest.navigations.at(-1)),
      ).toBe(route);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    expect(
      await page.evaluate(() => window.navigationTest.preferenceWrites),
    ).toBe(0);
  });

test("category, product and business profile headers preserve actions", async ({
  page,
}) => {
  for (const width of [390, 1024, 1440])
    for (const route of [
      "/category/comida",
      "/producto/cafe",
      "/perfil/cafe",
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, { role: "negocio", route });
      await measure(page, width, route);
      await expect(
        page.getByRole("button", { name: /Cambiar ubicación/ }),
      ).toBeVisible();
    }
});

test("before screenshots reproduce desktop overlap and cropped create modal", async ({
  page,
}) => {
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { before: true, role: width <= 768 ? "user" : "negocio" });
    await page.evaluate(() => scrollTo(0, 0));
    checks.push({
      width,
      state: "baseline-header",
      ...(await page.evaluate(() => {
        const brand = (document.querySelector("header a span") ||
          document.querySelector("header a"))!.getBoundingClientRect();
        const input = document
          .querySelector("header input")!
          .parentElement!.getBoundingClientRect();
        return {
          viewport: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          brand: { left: brand.left, right: brand.right },
          search: { left: input.left, right: input.right },
          brandSearchOverlap:
            brand.right > input.left &&
            brand.top < input.bottom &&
            brand.bottom > input.top,
        };
      })),
    });
    await page.screenshot({ path: `${dir}/${width}-header-before.png` });
    await page
      .getByRole("button", { name: /^Crear/ })
      .evaluate((button: HTMLButtonElement) => button.click());
    await page.waitForTimeout(350);
    const bounds = await page
      .getByRole("heading", { name: "¿Qué deseas crear?" })
      .boundingBox();
    checks.push({ width, state: "baseline-create-title", bounds });
    if (width > 768) expect(bounds!.y).toBeLessThan(0);
    await page.screenshot({ path: `${dir}/${width}-create-before.png` });
  }
});

test("real browser zoom 200% and short viewports", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page, { role: "user" });
  await page.screenshot({ path: `${dir}/390-header-user-after.png` });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { role: "user" });
    await page.getByRole("button", { name: /Cambiar ubicación/ }).click();
    const title = page.getByRole("heading", { name: "Actualizar Ubicación", exact: true });
    await expect(title).toBeInViewport();
    await page.mouse.click(2, 2);
    await expect(title).toHaveCount(0);
    expect(await page.evaluate(() => window.navigationTest.preferenceWrites)).toBe(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 420 });
  await open(page, { role: "user" });
  await checkCreate(page, 320, "short-after");
  const input = await searchInput(page);
  await input.fill("cafe");
  await expect(page.getByRole("option")).toHaveCount(5);
  await measure(page, 320, "short-search");
  await page.keyboard.press("Escape");
  for (const width of [1440, 1920]) {
    const profile = fs.mkdtempSync("/tmp/myckeo-navigation-zoom-");
    fs.mkdirSync(path.join(profile, "Default"));
    fs.writeFileSync(
      path.join(profile, "Default/Preferences"),
      JSON.stringify({
        partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } },
      }),
    );
    const context = await chromium.launchPersistentContext(profile, {
      headless: true,
      executablePath: process.env.PRODUCT_TEST_BROWSER,
      viewport: null,
      args: [`--window-size=${width},1000`],
    });
    try {
      const zoomed = context.pages()[0];
      await open(zoomed, { role: width === 1440 ? "user" : "negocio" });
      const zoom = await zoomed.evaluate(() => ({
        innerWidth,
        outerWidth,
        dpr: devicePixelRatio,
      }));
      expect(zoom.dpr).toBeCloseTo(2, 1);
      checks.push({ width, state: "native-zoom-200", ...zoom });
      await measure(zoomed, width, "zoom-header");
      await checkCreate(zoomed, width, "zoom-200-after");
      await (await searchInput(zoomed)).fill("cafe");
      await expect(zoomed.getByRole("option")).toHaveCount(5);
      await measure(zoomed, width, "zoom-search");
      await zoomed.keyboard.press("Escape");
      await expect(zoomed.getByRole("dialog")).toHaveCount(0);
      const client = await context.newCDPSession(zoomed);
      const metrics = await client.send("Page.getLayoutMetrics");
      const capture = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: metrics.contentSize.width,
          height: 1000,
          scale: 1,
        },
      });
      fs.writeFileSync(
        `${dir}/${width}-zoom-200.png`,
        Buffer.from(capture.data, "base64"),
      );
    } finally {
      await context.close();
    }
  }
});

test("keyboard focus, scroll restoration, responsive search and admin profiles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.evaluate(() => scrollTo(0, 400));
  const previousY = await page.evaluate(() => scrollY);
  const trigger = await createButton(page);
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).toBe("hidden");
  const close = page.getByRole("button", { name: "Cerrar Crear" });
  await dialog.locator("a").last().focus();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator("a").last()).toBeFocused();
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 300);
  expect(await page.evaluate(() => scrollY)).toBe(previousY);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(previousY);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).not.toBe("hidden");

  await page.setViewportSize({ width: 1024, height: 900 });
  const input = await searchInput(page);
  await input.fill("cafe");
  await expect(page.getByRole("option")).toHaveCount(5);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("combobox")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveValue("cafe");
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("combobox").fill("otra búsqueda");
  await expect(page.getByRole("option")).toHaveCount(5);

  for (const width of [390, 1440])
    for (const role of ["admin", "super_admin"]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, { role });
      await expect(await createButton(page)).toHaveCount(width <= 768 ? 1 : 0);
      await page.getByRole("button", { name: /^Perfil/ }).click();
      await expect(
        page.getByRole("link", {
          name: role === "admin" ? "Perfil 2" : "Myckeo Admin",
          exact: true,
        }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
});
