import { test, expect, chromium, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactDir = path.join(root, "test-results/new-product");
const paletteArtifacts = path.join(artifactDir, "palette-comparison");
const paletteMeasurements: Record<string, unknown>[] = [];
const independentArtifacts = path.join(artifactDir, "components-independent");
const independentMeasurements: Record<string, unknown>[] = [];
const widths = [320, 360, 390, 430, 768, 1024, 1440];
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZpkAAAAASUVORK5CYII=",
  "base64",
);
const photo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#eee6da"/><ellipse cx="250" cy="394" rx="150" ry="24" fill="#d6c6b2"/><rect x="120" y="95" width="260" height="300" rx="16" fill="#856449"/><rect x="145" y="170" width="210" height="140" rx="3" fill="#f7f3eb"/><text x="250" y="223" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#57432f">CAFÉ DE ORIGEN</text><text x="250" y="265" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#57432f">COLOMBIA</text></svg>',
);
let bundles: {
  current: string;
  before: string;
  css: string;
  beforeCss: string;
  tailwind: string;
};
const measurements: Record<string, unknown>[] = [];

test.beforeAll(async () => {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.mkdirSync(paletteArtifacts, { recursive: true });
  fs.mkdirSync(independentArtifacts, { recursive: true });
  const projectRequire = createRequire(path.join(root, "package.json"));
  const tsxRequire = createRequire(projectRequire.resolve("tsx/package.json"));
  const esbuild = tsxRequire("esbuild") as typeof import("esbuild");
  const boundaries = path.join(root, "e2e/new-product/boundaries.tsx");
  const originalForm = execFileSync(
    "git",
    [
      "show",
      "6e849626c6b3e77266bacf8dd9d5d69532395a51:src/ui/components/productos/CreateNewProduct.tsx",
    ],
    { encoding: "utf8" },
  );
  const originalUploader = execFileSync(
    "git",
    [
      "show",
      "6e849626c6b3e77266bacf8dd9d5d69532395a51:src/ui/components/autoUpload/AutoUploadMedia.tsx",
    ],
    { encoding: "utf8" },
  );
  async function build(before: boolean) {
    const result = await esbuild.build({
      entryPoints: ["e2e/new-product/harness.tsx"],
      absWorkingDir: root,
      bundle: true,
      write: false,
      outdir: "/tmp/myckeo-new-product-bundle",
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      logLevel: "error",
      define: { "process.env.NODE_ENV": '"development"' },
      alias: {
        "next/navigation": boundaries,
        "next/image": boundaries,
        "next/link": path.join(root, "e2e/new-product/link.tsx"),
        "@/config/fonts": boundaries,
        "@/ui/actions/productos/createNewProduct": boundaries,
      },
      plugins: [
        {
          name: "dashboard-fixture-contents",
          setup(build: import("esbuild").PluginBuild) {
            build.onResolve(
              { filter: /\/(SideBarDashboard|TopBarDashBoard)$/ },
              () => ({
                path: path.join(root, "e2e/new-product/dashboard.tsx"),
              }),
            );
          },
        },
        ...(before
          ? [
              {
                name: "baseline-from-git",
                setup(build: import("esbuild").PluginBuild) {
                  build.onLoad({ filter: /CreateNewProduct\.tsx$/ }, () => ({
                    contents: originalForm,
                    loader: "tsx",
                    resolveDir: path.join(root, "src/ui/components/productos"),
                  }));
                  build.onLoad({ filter: /AutoUploadMedia\.tsx$/ }, () => ({
                    contents: originalUploader,
                    loader: "tsx",
                    resolveDir: path.join(root, "src/ui/components/autoUpload"),
                  }));
                },
              },
            ]
          : []),
      ],
    });
    return {
      js: result.outputFiles.find((f) => f.path.endsWith(".js"))!.text,
      css: result.outputFiles.find((f) => f.path.endsWith(".css"))!.text,
    };
  }
  const current = await build(false);
  const before = await build(true);
  const tailwind = execFileSync(
    path.join(root, "node_modules/.bin/tailwindcss"),
    [
      "-i",
      "src/app/globals.css",
      "--content",
      "./src/ui/components/{productos,productos/newProduct,autoUpload}/**/*.tsx,./e2e/new-product/harness.tsx",
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
test.afterAll(() => {
  if (independentMeasurements.length)
    fs.writeFileSync(
      path.join(independentArtifacts, "responsive-measurements.json"),
      JSON.stringify(independentMeasurements, null, 2),
    );
  if (paletteMeasurements.length)
    fs.writeFileSync(
      path.join(paletteArtifacts, "responsive-measurements.json"),
      JSON.stringify(paletteMeasurements, null, 2),
    );
  const file = path.join(artifactDir, "responsive-measurements.json");
  const previous: Record<string, unknown>[] = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : [];
  const merged = new Map(
    [...previous, ...measurements].map((item) => [
      `${item.width ?? ""}:${item.state}`,
      item,
    ]),
  );
  fs.writeFileSync(file, JSON.stringify([...merged.values()], null, 2));
});

async function open(
  page: Page,
  options: {
    before?: boolean;
    palette?: "ruby" | "ocean";
    slowSave?: boolean;
    rejectSave?: boolean;
    rejectAI?: boolean;
    slowUpload?: boolean;
    failUpload?: boolean;
  } = {},
) {
  await page.addInitScript((config) => {
    Object.assign(window, { productTest: config });
  }, options);
  let uploadIndex = 0;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/styles.css")
      return route.fulfill({
        contentType: "text/css",
        body:
          bundles.tailwind +
          (options.before ? bundles.beforeCss : bundles.css) +
          fixtureCss,
      });
    if (url.pathname === "/bundle.js")
      return route.fulfill({
        contentType: "text/javascript",
        body: options.before ? bundles.before : bundles.current,
      });
    if (url.hostname === "localhost" && url.pathname === "/")
      return route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      });
    if (url.pathname === "/api/cloudinary/upload-authorization") {
      uploadIndex++;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
          resourceType: "image",
          deleteAuthorization: "fixture-proof",
          fields: {
            public_id: `myckeo/temporary/fixture-${uploadIndex}`,
            timestamp: "1700000000",
            overwrite: "false",
            context: "myckeo_cleanup=fixture-proof",
            signature: "fixture-signature",
            api_key: "fixture-key",
          },
        }),
      });
    }
    if (url.hostname === "api.cloudinary.com") {
      if (options.slowUpload)
        await new Promise((resolve) => setTimeout(resolve, 1200));
      if (options.failUpload)
        return route.fulfill({ status: 503, body: "fixture upload failure" });
      const publicId =
        route
          .request()
          .postData()
          ?.match(/name="public_id"\r\n\r\n([^\r]+)/)?.[1] ||
        "myckeo/temporary/fixture-1";
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v123/${publicId}.svg`,
          public_id: publicId,
          resource_type: "image",
        }),
      });
    }
    if (url.pathname === "/api/cloudinary/delete")
      return route.fulfill({
        contentType: "application/json",
        body: '{"success":true}',
      });
    if (url.pathname === "/fonts/inter.woff2")
      return route.fulfill({
        contentType: "font/woff2",
        body: fs.readFileSync(
          path.join(root, "src/assets/fonts/inter-latin-variable.woff2"),
        ),
      });
    if (url.pathname === "/fonts/title.woff2")
      return route.fulfill({
        contentType: "font/woff2",
        body: fs.readFileSync(
          path.join(
            root,
            "src/assets/fonts/montserrat-alternates-latin-700.woff2",
          ),
        ),
      });
    if (route.request().resourceType() === "image")
      return route.fulfill({
        contentType:
          url.hostname === "res.cloudinary.com" ? "image/svg+xml" : "image/png",
        body: url.hostname === "res.cloudinary.com" ? photo : pixel,
      });
    return route.abort();
  });
  const query = new URLSearchParams();
  if (options.before) query.set("before", "");
  if (options.palette) query.set("palette", options.palette);
  await page.goto(`http://localhost:3191/?${query}`);
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("button", { name: "Crear producto", exact: true }),
  ).toBeVisible();
}
const fixtureCss = `@font-face{font-family:Inter;src:url('/fonts/inter.woff2')}@font-face{font-family:Title;src:url('/fonts/title.woff2');font-weight:700}body{margin:0;background:#f5f5f5}.fixture-inter{font-family:Inter,Arial,sans-serif}.fixture-title{font-family:Title,Arial,sans-serif}.fixture-label{margin-bottom:16px;color:#9a3412;font:10px/24px Inter,Arial;text-align:right;pointer-events:none}.fixture-sidebar{height:100%;width:100%;background:#111827;color:#d1d5db;padding:28px 20px;font:14px Inter;box-sizing:border-box}.fixture-sidebar b{color:white;font-size:21px}.fixture-sidebar p{margin-top:30px}.fixture-sidebar .active{background:#374151;padding:12px;border-radius:8px}.fixture-topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font:14px Inter;background:#fff}.fixture-topbar button{min-width:44px;min-height:44px;border-radius:8px}.fixture-topbar span{color:#6b7280}`;
async function category(page: Page, name = "Comida") {
  await page
    .getByRole("combobox", { name: "Categoría *", exact: true })
    .fill(name);
  await page.getByRole("option", { name, exact: true }).click();
}
async function sections(page: Page, name = "Desayunos") {
  await page.getByRole("combobox", { name: "Secciones *" }).fill(name);
  await page.getByRole("option", { name, exact: true }).click();
  await page.keyboard.press("Escape");
}
async function upload(page: Page, count = 1) {
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: count }, (_, i) => ({
      name: `cafe-${i}.svg`,
      mimeType: "image/svg+xml",
      buffer: photo,
    })),
  );
}
async function complete(page: Page) {
  await page
    .getByLabel("Nombre del producto *", { exact: true })
    .fill("Café de origen colombiano");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Café de prueba con notas de chocolate. Texto escrito manualmente.");
  await category(page);
  await sections(page);
  await upload(page);
  await expect(
    page.getByText("1 fotografía subida.", { exact: true }),
  ).toBeVisible();
}
async function expandVariant(page: Page) {
  await page
    .getByRole("checkbox", { name: "Este producto tiene variantes" })
    .check();
  await page
    .getByRole("button", { name: "Agregar variante", exact: true })
    .click();
  const variant = page.getByRole("group", { name: "Variante 1", exact: true });
  await variant
    .getByLabel("Nombre que verá el cliente")
    .fill("Presentación familiar · bolsa de 1 kilogramo");
  await variant.getByRole("checkbox", { name: "Stock ilimitado" }).uncheck();
  await variant.getByLabel("Stock de la variante").fill("10");
  await variant.locator("summary").click();
  await variant.getByRole("button", { name: "Añadir opción" }).click();
  await variant.getByLabel("Atributo", { exact: true }).fill("Presentación");
  await variant
    .getByLabel("Valor visible", { exact: true })
    .fill("Bolsa de un kilogramo");
  return variant;
}
async function assertLayout(page: Page, width: number, state: string) {
  const result = await page.evaluate(() => {
    const visible = (element: Element) =>
      element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      }) &&
      !!(element as HTMLElement).offsetWidth &&
      !!(element as HTMLElement).offsetHeight &&
      getComputedStyle(element).opacity !== "0";
    const overflow = [
      ...document.querySelectorAll("main *, [role=dialog] *, [role=listbox] *"),
    ]
      .filter(visible)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right > innerWidth + 1 || rect.left < -1;
      })
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.slice(0, 70),
        rect: {
          x: el.getBoundingClientRect().x,
          width: el.getBoundingClientRect().width,
        },
      }));
    const clippedLabels = [...document.querySelectorAll("label")]
      .filter(visible)
      .filter((el) => el.scrollWidth > el.clientWidth + 2)
      .map((el) => el.textContent);
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow,
      clippedLabels,
      sidebarOverlap: (() => {
        const sidebar = document.querySelector(".fixture-sidebar");
        const form = document.querySelector("form");
        if (!sidebar || !form || !sidebar.checkVisibility()) return false;
        return (
          form.getBoundingClientRect().left <
          sidebar.getBoundingClientRect().right
        );
      })(),
      smallTargets: [
        ...document.querySelectorAll(
          "form button, form summary, form [role=button], header button, header a, [role=dialog] button",
        ),
      ]
        .filter(visible)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width < 43.5 || r.height < 43.5;
        })
        .map((el) => ({
          text: el.textContent || el.getAttribute("aria-label"),
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
    };
  });
  (state.startsWith("independent-")
    ? independentMeasurements
    : state.startsWith("refinement-")
      ? paletteMeasurements
      : measurements
  ).push({
    width,
    state,
    ...result,
  });
  expect(
    result.scrollWidth,
    `${width}/${state}: document overflow`,
  ).toBeLessThanOrEqual(result.viewport);
  expect(result.overflow, `${width}/${state}: offscreen content`).toEqual([]);
  expect(result.sidebarOverlap, `${width}/${state}: sidebar overlap`).toBe(
    false,
  );
  expect(result.smallTargets, `${width}/${state}: touch targets`).toEqual([]);
  expect(result.clippedLabels, `${width}/${state}: clipped labels`).toEqual([]);
}

for (const width of widths)
  test(`responsive ${width}: initial, gallery, menus, variants and dialogs`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { slowSave: true, rejectSave: true });
    await assertLayout(page, width, "initial");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${artifactDir}/${width}-after-initial.png`,
      fullPage: true,
    });
    await complete(page);
    await upload(page, 2);
    await expect(
      page.getByText("3 fotografías subidas.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Categoría *", exact: true })
      .click();
    await assertLayout(page, width, "category-menu");
    await page.screenshot({
      path: `${artifactDir}/${width}-category-menu.png`,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("combobox", { name: "Secciones *" }).click();
    await assertLayout(page, width, "sections-menu");
    await page.screenshot({
      path: `${artifactDir}/${width}-sections-menu.png`,
    });
    await page.keyboard.press("Escape");
    await expandVariant(page);
    await page
      .locator("summary")
      .filter({ hasText: "Detalles adicionales" })
      .click();
    await page
      .getByRole("button", { name: "Agregar atributo", exact: true })
      .click();
    await page.getByLabel("Nombre del atributo").fill("Material del empaque");
    await page.getByLabel("Valor del atributo").fill("Papel reciclable");
    await assertLayout(page, width, "expanded");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${artifactDir}/${width}-after-expanded.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Crear producto", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await assertLayout(page, width, "progress-dialog");
    await page.evaluate(() => window.productTest.releaseSave?.());
    await expect(
      page.getByRole("button", { name: "Volver al formulario" }),
    ).toBeVisible();
    await assertLayout(page, width, "error-dialog");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${artifactDir}/${width}-after-dialog.png` });
    await page.getByRole("button", { name: "Volver al formulario" }).click();
    await expect(
      page.getByLabel("Nombre del producto *", { exact: true }),
    ).toHaveValue("Café de origen colombiano");
  });

test("required messages, price zero, stock and keyboard classification", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByText("Escribe el nombre del producto.")).toBeVisible();
  await expect(
    page.getByLabel("Nombre del producto *", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Escribe una descripción para el producto."),
  ).toBeVisible();
  await expect(
    page.getByText("Selecciona una categoría.", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Agrega al menos una fotografía" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.productTest.submissions.length)).toBe(
    0,
  );
  await page
    .getByRole("combobox", { name: "Categoría *", exact: true })
    .fill("Comida");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.getByRole("combobox", { name: "Secciones *" }).fill("Desayunos");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Desayunos", { exact: true })).toBeVisible();
  await category(page, "Bebidas");
  await expect(page.getByText("Desayunos", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Selecciona al menos una sección."),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Stock ilimitado", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(
    page.getByText("Indica un stock válido, igual o mayor a cero."),
  ).toBeVisible();
});

test("AI is optional, previews results and requires explicit application", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Nombre del producto *", { exact: true }).fill("Café");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Mi descripción manual");
  await page.locator("summary").filter({ hasText: "Ayúdame" }).click();
  await page
    .getByRole("button", { name: "Generar descripción con IA" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Ingresa las características",
  );
  await page
    .getByLabel("Características principales")
    .fill("Origen colombiano");
  await page
    .getByRole("button", { name: "Generar descripción con IA" })
    .click();
  await expect(
    page.getByRole("region", { name: "Propuesta de IA" }),
  ).toBeVisible();
  await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
    "Mi descripción manual",
  );
  await page.getByRole("button", { name: "Usar propuesta" }).click();
  await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
    "Café cultivado en Colombia con notas de chocolate y un aroma suave.",
  );
  await expect(page.getByLabel("Descripción corta Opcional")).toHaveValue(
    "Café de origen colombiano.",
  );
  await page
    .locator("summary")
    .filter({ hasText: "Detalles adicionales" })
    .click();
  await expect(page.getByLabel("Palabras clave (opcional)")).toHaveValue(
    "café, colombia",
  );
});

test("photos show pending/complete, block create, remove and report errors locally", async ({
  page,
}) => {
  await open(page, { slowUpload: true });
  await upload(page);
  await expect(
    page.getByText("Pendiente de subida", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear producto", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("1 fotografía subida.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eliminar fotografía 1" }).click();
  await expect(
    page.getByText("1 fotografía subida.", { exact: true }),
  ).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await open(page, { failUpload: true });
  await upload(page);
  await expect(
    page.locator("#product-photos").getByRole("alert"),
  ).toContainText("Error al subir archivo");
  await expect(
    page.getByRole("button", { name: "Crear producto", exact: true }),
  ).toBeEnabled();
});

test("payload preserves components, attributes, variants, image URL, status and priority; blocks reentry", async ({
  page,
}) => {
  await open(page, { slowSave: true });
  await complete(page);
  const variant = await expandVariant(page);
  await variant.getByLabel("SKU interno (opcional)").fill("CAFE-1KG");
  await variant
    .getByLabel("URL de imagen específica (opcional)")
    .fill(
      "https://res.cloudinary.com/test-cloud/image/upload/v123/variant.svg",
    );
  await page
    .locator("summary")
    .filter({ hasText: "Detalles adicionales" })
    .click();
  await page.locator("summary").filter({ hasText: "Ayúdame" }).click();
  await page
    .getByRole("textbox", { name: "Componentes del producto", exact: true })
    .fill("Café\\nBolsa".replace("\\n", "\n"));
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page
    .getByRole("button", { name: "Agregar atributo", exact: true })
    .click();
  await page.getByLabel("Nombre del atributo").fill("Origen");
  await page.getByLabel("Valor del atributo").fill("Colombia");
  await page.getByLabel("Palabras clave (opcional)").fill("café, origen");
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
      button.form?.requestSubmit();
    });
  await expect(page.getByRole("dialog")).toContainText("Creando producto…");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  const submissions = await page.evaluate(() => window.productTest.submissions);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    precio: ["0"],
    prioridad: ["1"],
    status: ["disponible"],
    usaVariantes: ["true"],
    stockIlimitado: ["true"],
    componentes: ["Café", "Bolsa"],
    categoriaId: ["2"],
    seccionIds: ["s22"],
  });
  expect(JSON.parse(String(submissions[0].atributos[0]))).toEqual([
    { nombre: "Origen", valor: "Colombia" },
  ]);
  expect(JSON.parse(String(submissions[0].variantes[0]))[0]).toMatchObject({
    nombre: "Presentación familiar · bolsa de 1 kilogramo",
    sku: "CAFE-1KG",
    precio: null,
    stock: 10,
    stockIlimitado: false,
    isActive: true,
    options: [{ nombre: "Presentación", valor: "Bolsa de un kilogramo" }],
  });
  await page.evaluate(() => window.productTest.releaseSave?.());
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  await page.getByRole("button", { name: "Ver producto" }).click();
  expect(
    await page.evaluate(() => window.productTest.navigations[0]),
  ).toContain("/comida/desayunos/cafe-de-prueba-abcd");
  await expect(
    page.getByRole("button", { name: "Crear producto", exact: true }),
  ).toBeDisabled();
});

test("baseline screenshots use original form/uploader with identical fixture shell", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, { before: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${artifactDir}/${width}-before.png`,
      fullPage: true,
    });
  }
});

test("browser zoom 200%, reduced motion, focus and short-height menus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 420 });
  await open(page);
  await complete(page);
  await expandVariant(page);
  await assertLayout(page, 390, "short-height-expanded");
  await page
    .getByRole("combobox", { name: "Categoría *", exact: true })
    .click();
  await expect(page.getByRole("listbox")).toBeVisible();
  const menuRect = await page.getByRole("listbox").boundingBox();
  expect(menuRect!.y).toBeGreaterThanOrEqual(0);
  expect(menuRect!.y + menuRect!.height).toBeLessThanOrEqual(421);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ayuda", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await assertLayout(page, 390, "short-height-help");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ayuda", exact: true }),
  ).toBeFocused();
  const motion = await page.locator("form").evaluate((form) =>
    [...form.querySelectorAll("*")]
      .filter((el) => el.checkVisibility())
      .some(
        (el) =>
          getComputedStyle(el).animationName !== "none" ||
          getComputedStyle(el)
            .transitionDuration.split(",")
            .some((duration) => parseFloat(duration) > 0),
      ),
  );
  expect(motion).toBe(false);

  // A fresh Chromium profile sets its real browser zoom preference, not CSS zoom or DPR emulation.
  const profile = fs.mkdtempSync("/tmp/myckeo-product-zoom-");
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
    args: ["--window-size=1440,1000"],
  });
  try {
    const zoomedPage = context.pages()[0];
    await open(zoomedPage);
    const zoom = await zoomedPage.evaluate(() => ({
      innerWidth,
      outerWidth,
      dpr: devicePixelRatio,
    }));
    measurements.push({ state: "real-browser-zoom-200", ...zoom });
    expect(zoom.dpr).toBeCloseTo(2, 1);
    expect(zoom.outerWidth / zoom.innerWidth).toBeCloseTo(2, 1);
    await complete(zoomedPage);
    await expandVariant(zoomedPage);
    await assertLayout(zoomedPage, 1440, "real-browser-zoom-200");
    await zoomedPage.evaluate(() => window.scrollTo(0, 0));
    // CDP's DIP content size avoids Chromium's cropped fullPage capture at native browser zoom.
    const session = await context.newCDPSession(zoomedPage);
    const metrics = await session.send("Page.getLayoutMetrics");
    const capture = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: metrics.contentSize.width,
        height: metrics.contentSize.height,
        scale: 1,
      },
    });
    const screenshot = Buffer.from(capture.data, "base64");
    expect(screenshot.readUInt32BE(16)).toBeGreaterThanOrEqual(zoom.outerWidth);
    fs.writeFileSync(`${artifactDir}/1440-zoom-200.png`, screenshot);
  } finally {
    await context.close();
  }
});

test("stock mode changes do not leave a hidden required field; errors preserve data and allow retry", async ({
  page,
}) => {
  await open(page, { rejectSave: true });
  await complete(page);
  await page
    .getByRole("checkbox", { name: "Stock ilimitado", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(
    page.getByText("Indica un stock válido, igual o mayor a cero."),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Stock ilimitado", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No se pudo guardar");
  expect(await page.evaluate(() => window.productTest.submissions.length)).toBe(
    1,
  );
  await page.getByRole("button", { name: "Volver al formulario" }).click();
  await page.evaluate(() => {
    window.productTest.rejectSave = false;
  });
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  expect(await page.evaluate(() => window.productTest.submissions.length)).toBe(
    2,
  );
});

test("AI failure and invalid file errors stay local without losing manual content", async ({
  page,
}) => {
  await open(page, { rejectAI: true });
  await page
    .getByLabel("Nombre del producto *", { exact: true })
    .fill("Mi café");
  await page
    .getByLabel("Descripción *", { exact: true })
    .fill("Texto manual intacto");
  await page.locator("summary").filter({ hasText: "Ayúdame" }).click();
  await page.getByLabel("Características principales").fill("Suave");
  await page
    .getByRole("button", { name: "Generar descripción con IA" })
    .click();
  await expect(page.getByRole("alert")).toContainText("No fue posible generar");
  await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
    "Texto manual intacto",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "texto.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(
    page.locator("#product-photos").getByRole("alert"),
  ).toContainText("no es una imagen");
});

test("limited inventory and product status persist with a zero stock", async ({
  page,
}) => {
  await open(page);
  await complete(page);
  await page
    .getByRole("checkbox", { name: "Stock ilimitado", exact: true })
    .uncheck();
  await page.getByLabel("Stock disponible *", { exact: true }).fill("0");
  await page.getByLabel("Precio base *", { exact: true }).fill("12000.5");
  await page.getByRole("combobox", { name: "Estado del producto" }).click();
  await page.getByRole("option", { name: "Agotado", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  expect(
    await page.evaluate(() => window.productTest.submissions[0]),
  ).toMatchObject({
    stockIlimitado: ["false"],
    stock: ["0"],
    precio: ["12000.5"],
    status: ["agotado"],
    usaVariantes: ["false"],
  });
});

test("variant own price, inactive state and removing optional data keep the payload intact", async ({
  page,
}) => {
  await open(page);
  await complete(page);
  const variant = await expandVariant(page);
  await variant
    .getByLabel("Precio de la variante", { exact: true })
    .fill("25000");
  await variant
    .getByRole("checkbox", { name: "Activa", exact: true })
    .uncheck();
  await variant.getByRole("button", { name: "Añadir opción" }).click();
  await variant
    .getByRole("button", { name: "Eliminar opción 2 de variante 1" })
    .click();
  await page
    .locator("summary")
    .filter({ hasText: "Detalles adicionales" })
    .click();
  await page
    .getByRole("button", { name: "Agregar atributo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Eliminar atributo 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  const payload = await page.evaluate(() => window.productTest.submissions[0]);
  expect(payload.atributos).toBeUndefined();
  expect(JSON.parse(String(payload.variantes[0]))[0]).toMatchObject({
    precio: 25000,
    isActive: false,
    stock: 10,
    options: [{ nombre: "Presentación", valor: "Bolsa de un kilogramo" }],
  });
});

const refinementComponents = [
  "Café arábica de origen colombiano",
  "Bolsa con cierre reutilizable y barrera de protección para conservar su aroma",
  "Válvula desgasificadora",
];
const paletteColors = {
  ruby: {
    accent: "rgb(201, 53, 69)",
    soft: "rgb(255, 240, 241)",
    hover: "rgb(171, 41, 56)",
  },
  ocean: {
    accent: "rgb(37, 99, 235)",
    soft: "rgb(239, 246, 255)",
    hover: "rgb(29, 78, 216)",
  },
};

for (const palette of ["ruby", "ocean"] as const) {
  for (const width of widths)
    test(`refinement-${palette} responsive ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, { palette, slowSave: true, rejectSave: true });
      const create = page.getByRole("button", {
        name: "Crear producto",
        exact: true,
      });
      await expect(create).toHaveCSS(
        "background-color",
        paletteColors[palette].accent,
      );
      if (width === 390) {
        await create.hover();
        await expect(create).toHaveCSS(
          "background-color",
          paletteColors[palette].hover,
        );
        await page.mouse.move(0, 0);
        await expect(create).toHaveCSS(
          "background-color",
          paletteColors[palette].accent,
        );
        await page.getByLabel("Descripción *", { exact: true }).focus();
        await expect(
          page
            .locator("#product-description")
            .locator("..")
            .locator("fieldset"),
        ).toHaveCSS("border-color", paletteColors[palette].accent);
      }

      await assertLayout(page, width, `refinement-${palette}-initial`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `${paletteArtifacts}/${palette}-${width}-initial.png`,
        fullPage: true,
      });
      await complete(page);
      await page.locator("summary").filter({ hasText: "Ayúdame" }).click();
      await page
        .getByLabel("Características principales")
        .fill(
          "Café suave de origen colombiano, tueste medio. Describe con precisión lo que incluye.",
        );
      await page
        .getByRole("textbox", { name: "Componentes del producto", exact: true })
        .fill(refinementComponents.join("\n"));
      await page.getByRole("button", { name: "Agregar", exact: true }).click();
      await page
        .getByRole("button", { name: "Generar descripción con IA" })
        .click();
      await expect(
        page.getByRole("region", { name: "Propuesta de IA" }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Descripción *", { exact: true }),
      ).toHaveValue(
        "Café de prueba con notas de chocolate. Texto escrito manualmente.",
      );
      expect(
        await page.evaluate(
          () => window.productTest.aiRequests?.[0].componentes,
        ),
      ).toEqual(refinementComponents);
      const chips = page.getByRole("group", { name: "Componentes agregados" });
      await expect(chips.getByRole("button")).toHaveCount(3);
      await assertLayout(page, width, `refinement-${palette}-assistant-open`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `${paletteArtifacts}/${palette}-${width}-assistant.png`,
        fullPage: true,
      });
      await expandVariant(page);
      await assertLayout(page, width, `refinement-${palette}-variants`);
      await page
        .getByRole("combobox", { name: "Categoría *", exact: true })
        .click();
      await expect(
        page.getByRole("option", { name: "Comida", exact: true }),
      ).toHaveCSS("background-color", paletteColors[palette].soft);
      await assertLayout(page, width, `refinement-${palette}-category-menu`);
      await page.screenshot({
        path: `${paletteArtifacts}/${palette}-${width}-category.png`,
      });
      await page.keyboard.press("Escape");
      await page.getByRole("combobox", { name: "Secciones *" }).click();
      await assertLayout(page, width, `refinement-${palette}-sections-menu`);
      await page.keyboard.press("Escape");
      await create.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByRole("progressbar")).toHaveCSS(
        "color",
        paletteColors[palette].accent,
      );
      await assertLayout(page, width, `refinement-${palette}-progress-dialog`);
      await page.evaluate(() => window.productTest.releaseSave?.());
      await expect(
        page.getByRole("button", { name: "Volver al formulario" }),
      ).toBeVisible();
      await assertLayout(page, width, `refinement-${palette}-error-dialog`);
      await page.screenshot({
        path: `${paletteArtifacts}/${palette}-${width}-dialog.png`,
      });
    });

  test(`refinement-${palette} components persist independently, survive AI errors and remain explicit on apply`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 420 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, { palette, rejectSave: true, rejectAI: true });
    await complete(page);
    const summary = page.locator("summary").filter({ hasText: "Ayúdame" });
    await summary.click();
    await expect(
      page.getByRole("textbox", {
        name: "Componentes del producto",
        exact: true,
      }),
    ).toHaveCount(1);
    await page
      .getByRole("textbox", { name: "Componentes del producto", exact: true })
      .fill("Café arábica");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Componentes del producto", exact: true })
      .fill("Bolsa reutilizable\nAzúcar");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const chips = page.getByRole("group", { name: "Componentes agregados" });
    await chips.getByRole("button", { name: "Azúcar", exact: true }).focus();
    await page.keyboard.press("Delete");
    await expect(chips.getByRole("button")).toHaveCount(2);
    await summary.click();
    await expect(
      page.getByRole("textbox", {
        name: "Componentes del producto",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Crear producto", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("No se pudo guardar");
    const beforeAI = await page.evaluate(() => ({
      calls: window.productTest.aiCalls,
      payload: window.productTest.submissions[0],
    }));
    expect(beforeAI.calls).toBe(0);
    expect(beforeAI.payload.componentes).toEqual([
      "Café arábica",
      "Bolsa reutilizable",
    ]);
    await page.getByRole("button", { name: "Volver al formulario" }).click();
    await summary.click();
    await expect(chips.getByRole("button")).toHaveCount(2);
    await page
      .getByLabel("Características principales")
      .fill("Tueste medio, presentación para regalo.");
    await page
      .getByRole("button", { name: "Generar descripción con IA" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "No fue posible generar",
    );
    await expect(chips.getByRole("button")).toHaveCount(2);
    await summary.click();
    await summary.click();
    await expect(chips.getByRole("button")).toHaveCount(2);
    await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
      "Café de prueba con notas de chocolate. Texto escrito manualmente.",
    );
    await page.evaluate(() => {
      window.productTest.rejectAI = false;
    });
    await page
      .getByRole("button", { name: "Generar descripción con IA" })
      .click();
    await expect(
      page.getByRole("region", { name: "Propuesta de IA" }),
    ).toBeVisible();
    const requests = await page.evaluate(() => window.productTest.aiRequests);
    expect(requests).toHaveLength(2);
    expect(
      requests?.every(
        (request) =>
          request.componentes.join("|") === "Café arábica|Bolsa reutilizable",
      ),
    ).toBe(true);
    await page
      .getByLabel("Descripción *", { exact: true })
      .fill("Edición manual posterior a generar la propuesta.");
    await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
      "Edición manual posterior a generar la propuesta.",
    );
    await assertLayout(page, 390, `refinement-${palette}-short-height`);
    await page.getByRole("button", { name: "Usar propuesta" }).click();
    await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
      "Café cultivado en Colombia con notas de chocolate y un aroma suave.",
    );
    await expect(chips.getByRole("button")).toHaveCount(2);
    await summary.click();
    await page.evaluate(() => {
      window.productTest.rejectSave = false;
    });
    await page
      .getByRole("button", { name: "Crear producto", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Tu producto está listo",
    );
    expect(
      await page.evaluate(() => window.productTest.submissions[1].componentes),
    ).toEqual(["Café arábica", "Bolsa reutilizable"]);
    await assertLayout(page, 390, `refinement-${palette}-short-height-dialog`);
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`independent-responsive ${width}: visible components with AI closed`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const region = page.getByRole("region", {
      name: "Componentes del producto",
      exact: true,
    });
    const input = region.getByRole("textbox", {
      name: "Componentes del producto",
      exact: true,
    });
    await expect(region).toBeVisible();
    await expect(input).toBeVisible();
    const controls = await page
      .locator("#product-name, #product-components-input, #product-description")
      .evaluateAll((elements) => elements.map((element) => element.id));
    expect(controls).toEqual([
      "product-name",
      "product-components-input",
      "product-description",
    ]);
    const headings = await page.locator("form h2").allTextContents();
    expect(headings.slice(0, 4)).toEqual([
      "Fotografías",
      "Información del producto",
      "Componentes del producto",
      "Precio e inventario",
    ]);
    const assistant = page.locator("details").filter({
      has: page.getByText("Ayúdame a escribir la descripción", {
        exact: true,
      }),
    });
    expect(
      await assistant.evaluate((element: HTMLDetailsElement) => element.open),
    ).toBe(false);
    await expect(
      assistant.getByRole("textbox", {
        name: "Componentes del producto",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Crear producto", exact: true }),
    ).toHaveCSS("background-color", "rgb(201, 53, 69)");
    await input.fill(refinementComponents.join("\n"));
    await region.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(
      region
        .getByRole("group", { name: "Componentes agregados" })
        .getByRole("button"),
    ).toHaveCount(3);
    await assertLayout(page, width, "independent-components-ai-closed");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${independentArtifacts}/${width}-components-visible.png`,
      fullPage: true,
    });
    await assistant.locator("summary").click();
    await expect(
      assistant.getByRole("note", { name: "Componentes usados por la IA" }),
    ).toContainText(refinementComponents[0]);
    await expect(input).toBeVisible();
    await assertLayout(page, width, "independent-assistant-open");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${independentArtifacts}/${width}-assistant-open.png`,
      fullPage: true,
    });
    await assistant.locator("summary").click();
    await expect(input).toBeVisible();
    await expect(
      region
        .getByRole("group", { name: "Componentes agregados" })
        .getByRole("button"),
    ).toHaveCount(3);
  });
}

test("independent-components add/remove, keep duplicates and blanks policy, persist without ever opening AI", async ({
  page,
}) => {
  await open(page, { rejectSave: true });
  await complete(page);
  const region = page.getByRole("region", {
    name: "Componentes del producto",
    exact: true,
  });
  const input = region.getByRole("textbox", {
    name: "Componentes del producto",
    exact: true,
  });
  const add = region.getByRole("button", { name: "Agregar", exact: true });
  const chips = region.getByRole("group", { name: "Componentes agregados" });
  await input.fill("  Café arábica  \n\nBolsa reutilizable\nCafé arábica");
  await add.click();
  await expect(chips.getByRole("button")).toHaveCount(3);
  await input.fill("   \n   ");
  await add.click();
  await expect(chips.getByRole("button")).toHaveCount(3);
  await input.fill("Azúcar");
  await add.click();
  await chips.getByRole("button", { name: "Azúcar", exact: true }).focus();
  await page.keyboard.press("Delete");
  await expect(chips.getByRole("button")).toHaveCount(3);
  await page
    .getByLabel("Nombre del producto *", { exact: true })
    .fill("Café de regalo");
  await page.getByLabel("Precio base *", { exact: true }).fill("24000");
  await page
    .locator("summary")
    .filter({ hasText: "Detalles adicionales" })
    .click();
  await page.getByLabel("Palabras clave (opcional)").fill("café, regalo");
  await page
    .locator("summary")
    .filter({ hasText: "Detalles adicionales" })
    .click();
  await expect(chips.getByRole("button")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No se pudo guardar");
  const result = await page.evaluate(() => ({
    aiCalls: window.productTest.aiCalls,
    payload: window.productTest.submissions[0],
  }));
  expect(result.aiCalls).toBe(0);
  expect(result.payload.componentes).toEqual([
    "Café arábica",
    "Bolsa reutilizable",
    "Café arábica",
  ]);
  await page.getByRole("button", { name: "Volver al formulario" }).click();
  await expect(chips.getByRole("button")).toHaveCount(3);
  await page.evaluate(() => {
    window.productTest.rejectSave = false;
  });
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  expect(
    await page.evaluate(() => window.productTest.submissions[1].componentes),
  ).toEqual(["Café arábica", "Bolsa reutilizable", "Café arábica"]);
  expect(await page.evaluate(() => window.productTest.aiCalls)).toBe(0);
});

test("independent-AI context and failures preserve components and manual description", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 420 });
  await open(page, { rejectAI: true });
  await complete(page);
  const region = page.getByRole("region", {
    name: "Componentes del producto",
    exact: true,
  });
  await region
    .getByRole("textbox", { name: "Componentes del producto", exact: true })
    .fill("Café arábica\nBolsa reutilizable");
  await region.getByRole("button", { name: "Agregar", exact: true }).click();
  const summary = page.locator("summary").filter({ hasText: "Ayúdame" });
  await summary.click();
  await page
    .getByLabel("Características principales")
    .fill("Tueste medio, presentación para regalo.");
  await page
    .getByRole("button", { name: "Generar descripción con IA" })
    .click();
  await expect(page.getByRole("alert")).toContainText("No fue posible generar");
  await expect(
    region
      .getByRole("group", { name: "Componentes agregados" })
      .getByRole("button"),
  ).toHaveCount(2);
  await summary.click();
  await summary.click();
  await expect(
    region.getByRole("textbox", {
      name: "Componentes del producto",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.productTest.rejectAI = false;
  });
  await page
    .getByRole("button", { name: "Generar descripción con IA" })
    .click();
  await expect(
    page.getByRole("region", { name: "Propuesta de IA" }),
  ).toBeVisible();
  await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
    "Café de prueba con notas de chocolate. Texto escrito manualmente.",
  );
  const calls = await page.evaluate(() => window.productTest.aiRequests);
  expect(calls).toHaveLength(2);
  expect(
    calls?.every(
      (call) =>
        call.componentes.join("|") === "Café arábica|Bolsa reutilizable",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Usar propuesta" }).click();
  await expect(page.getByLabel("Descripción *", { exact: true })).toHaveValue(
    "Café cultivado en Colombia con notas de chocolate y un aroma suave.",
  );
  await assertLayout(page, 390, "independent-short-height");
  await summary.click();
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  expect(
    await page.evaluate(() => window.productTest.submissions[0].componentes),
  ).toEqual(["Café arábica", "Bolsa reutilizable"]);
  await assertLayout(page, 390, "independent-small-dialog");
});

test("independent-create without any components or AI", async ({ page }) => {
  await open(page);
  await complete(page);
  await page
    .getByRole("button", { name: "Crear producto", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tu producto está listo",
  );
  const result = await page.evaluate(() => ({
    payload: window.productTest.submissions[0],
    aiCalls: window.productTest.aiCalls,
  }));
  expect(result.payload.componentes).toBeUndefined();
  expect(result.aiCalls).toBe(0);
});
