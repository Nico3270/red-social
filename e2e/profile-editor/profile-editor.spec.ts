import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

let bundle: string;
let styles: string;
const root = process.cwd();
const testPublicId = "myckeo/temporary/11111111-1111-4111-8111-111111111111";
const testUploadedUrl = `https://res.cloudinary.com/test-cloud/image/upload/v123/${testPublicId}.svg`;
const testGrant = {
  uploadUrl: "https://api.cloudinary.com/v1_1/test-cloud/image/upload",
  resourceType: "image",
  deleteAuthorization: "isolated-fixture-proof",
  fields: {
    public_id: testPublicId,
    timestamp: "1700000000",
    overwrite: "false",
    context: "myckeo_cleanup=isolated-fixture-proof",
    signature: "fixture-signature",
    api_key: "public-test-key",
  },
};

test.beforeAll(() => {
  styles = execFileSync(
    path.join(root, "node_modules/.bin/tailwindcss"),
    [
      "-i",
      "src/app/globals.css",
      "--content",
      "./src/ui/components/{dashboard/perfil,map-picker,autoUpload,divider}/*.tsx",
      "--minify",
    ],
    { cwd: root, maxBuffer: 2 * 1024 * 1024 },
  ).toString();
  const shim = path.join(root, "e2e/profile-editor/mocks/boundaries.tsx");
  // pnpm no expone un binario raíz para dependencias transitivas.
  // tsx ya declara esbuild y su versión está fijada en el lockfile del proyecto.
  const projectRequire = createRequire(path.join(root, "package.json"));
  const tsxRequire = createRequire(projectRequire.resolve("tsx/package.json"));
  bundle = execFileSync(
    tsxRequire.resolve("esbuild/bin/esbuild"),
    [
      "e2e/profile-editor/harness.tsx",
      "--bundle",
      "--format=iife",
      "--platform=browser",
      "--jsx=automatic",
      "--log-level=error",
      '--define:process.env.NODE_ENV="development"',
      '--define:process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="public-test-placeholder"',
      '--define:process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="test-cloud"',
      '--define:process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="test-preset"',
      ...[
        "@react-google-maps/api",
        "next-auth/react",
        "next/navigation",
        "next/image",
        "@prisma/client",
        "@/config/fonts",
        "@/actions/perfil/actualizarPerfil",
      ].map((name) => `--alias:${name}=${shim}`),
    ],
    { cwd: root, maxBuffer: 12 * 1024 * 1024 },
  ).toString();
});

async function open(
  page: Page,
  control: Record<string, unknown> = {},
  mapOnly: boolean | "uploaderOnly" = false,
) {
  await page.addInitScript((value) => {
    Object.assign(window, { profileTest: value });
  }, control);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "localhost") {
      if (url.pathname === "/api/cloudinary/upload-authorization")
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(testGrant),
        });
      if (url.pathname === "/styles.css")
        return route.fulfill({ contentType: "text/css", body: styles });
      if (url.pathname === "/bundle.js")
        return route.fulfill({ contentType: "text/javascript", body: bundle });
      if (url.pathname === "/")
        return route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><body style="margin:0"><main style="max-width:760px;margin:auto;padding:16px"><div id="root"></div></main><script src="/bundle.js"></script></body></html>',
        });
    }
    if (route.request().resourceType() === "image")
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZpkAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    return route.abort(); // Toda integración externa debe estar simulada.
  });
  await page.goto(
    `http://localhost:3179/${mapOnly === "uploaderOnly" ? "?uploaderOnly" : mapOnly ? "?mapOnly" : ""}`,
  );
  await expect(
    mapOnly === "uploaderOnly"
      ? page.getByRole("button", { name: "Añadir archivo multimedia" })
      : mapOnly
        ? page.getByRole("button", { name: "Usar mi ubicación", exact: true })
        : page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeVisible();
}
const latitude = (page: Page) => page.locator('input[name="latitudNegocio"]');
const longitude = (page: Page) => page.locator('input[name="longitudNegocio"]');
const save = (page: Page) =>
  page.getByRole("button", { name: "Guardar cambios", exact: true });

test("carga coordenadas guardadas sin geolocalizar ni buscar automáticamente", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId("map")).toHaveAttribute(
    "data-center",
    JSON.stringify({ lat: 6.24, lng: -75.58 }),
  );
  expect(
    await page.evaluate(() => [
      window.profileTest.geoCalls,
      window.profileTest.geocodeCalls.length,
    ]),
  ).toEqual([0, 0]);
  await expect(page.getByLabel("Teléfono de Contacto (Opcional)")).toHaveValue(
    "3001234567",
  );
});

test("sin ubicación ni ciudad muestra Colombia sin inventar un marcador", async ({
  page,
}) => {
  await open(page, {}, true);
  await expect(page.getByTestId("map")).toHaveAttribute(
    "data-center",
    JSON.stringify({ lat: 4.5, lng: -73.5 }),
  );
  await expect(page.getByTestId("marker")).toHaveCount(0);
  await expect(page.getByTestId("selection")).toHaveText("null");
  await page.getByRole("button", { name: "Simular clic en mapa" }).click();
  await expect(page.getByTestId("selection")).toHaveText(
    JSON.stringify({ lat: 6.25184, lng: -75.56359 }),
  );
});

test("geolocalización válida bloquea doble clic y actualiza marcador y formulario", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Usar mi ubicación", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("button", { name: "Obteniendo ubicación…" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.profileTest.geoCalls)).toBe(1);
  await page.evaluate(() =>
    window.profileTest.geoSuccess?.({
      coords: { latitude: 4.65, longitude: -74.05 },
    } as GeolocationPosition),
  );
  await expect(latitude(page)).toHaveValue("4.65");
  await expect(longitude(page)).toHaveValue("-74.05");
  await expect(page.getByTestId("marker")).toHaveAttribute(
    "data-position",
    JSON.stringify({ lat: 4.65, lng: -74.05 }),
  );
});

for (const [code, message] of [
  [1, "Activa el permiso de ubicación"],
  [2, "No pudimos determinar tu ubicación"],
  [3, "La ubicación está tardando demasiado"],
  [99, "Ocurrió un error al obtener tu ubicación"],
] as const) {
  test(`geolocalización: código ${code} conserva datos y mapa manual`, async ({
    page,
  }) => {
    await open(page, { geoCode: code });
    await page
      .getByRole("button", { name: "Usar mi ubicación", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: message }),
    ).toBeVisible();
    await expect(latitude(page)).toHaveValue("6.24");
    await expect(longitude(page)).toHaveValue("-75.58");
    await page.getByTestId("marker").click();
    await expect(latitude(page)).toHaveValue("6.25184");
  });
}
for (const control of [
  { geoUnavailable: true },
  { geoThrow: true },
  { geoInvalid: true },
]) {
  test(`API ausente, excepción o coordenadas inválidas ${JSON.stringify(control)}`, async ({
    page,
  }) => {
    await open(page, control);
    await page
      .getByRole("button", { name: "Usar mi ubicación", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Ubicación del negocio" })
        .getByRole("alert"),
    ).toBeVisible();
    await expect(latitude(page)).toHaveValue("6.24");
    await expect(
      page.getByLabel("Dirección del Negocio (Opcional)"),
    ).toHaveValue("Calle 10 # 20-30");
  });
}

test("la selección manual posterior descarta una respuesta tardía de geolocalización", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Usar mi ubicación", exact: true })
    .click();
  await page.getByTestId("marker").click();
  await page.evaluate(() =>
    window.profileTest.geoSuccess?.({
      coords: { latitude: 0, longitude: 0 },
    } as GeolocationPosition),
  );
  await expect(latitude(page)).toHaveValue("6.25184");
});

test("búsqueda de ciudad navega, requiere confirmar y no cambia ciudad ni dirección", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Buscar ciudad o dirección").fill("Bogotá, Colombia");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("button", { name: "Bogotá, Colombia", exact: true })
    .click();
  await expect(page.getByTestId("map")).toHaveAttribute(
    "data-center",
    JSON.stringify({ lat: 4.65, lng: -74.05 }),
  );
  await expect(latitude(page)).toHaveValue("6.24");
  await expect(page.getByLabel("Dirección del Negocio (Opcional)")).toHaveValue(
    "Calle 10 # 20-30",
  );
  await expect(
    page.getByRole("combobox", { name: "Ciudad", exact: true }),
  ).toHaveText("Medellín");
  await page.getByRole("button", { name: "Confirmar este punto" }).click();
  await expect(latitude(page)).toHaveValue("4.65");
});

test("seleccionar sugerencia de municipio es navegación, sin guardar su centro", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Buscar ciudad o dirección").fill("Tunja");
  await page
    .getByRole("option", { name: "Tunja, Boyacá, Colombia", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar este punto" }),
  ).toBeVisible();
  await expect(latitude(page)).toHaveValue("6.24");
  expect(await page.evaluate(() => window.profileTest.geocodeCalls)).toEqual([
    "Tunja, Boyacá, Colombia",
  ]);
});

test("búsqueda de dirección por Enter, ajuste y conservación tras guardar y recargar (persistencia simulada)", async ({
  page,
}) => {
  await open(page);
  await page.getByLabel("Buscar ciudad o dirección").fill("Calle 72 Bogotá");
  await page.getByLabel("Buscar ciudad o dirección").press("Enter");
  await page
    .getByRole("button", { name: "Calle 72, Bogotá, Colombia", exact: true })
    .click();
  await expect(latitude(page)).toHaveValue("6.24");
  await page.getByTestId("marker").click();
  await save(page).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Perfil actualizado correctamente.",
  );
  await page.reload();
  await expect(latitude(page)).toHaveValue("6.25184");
  await expect(longitude(page)).toHaveValue("-75.56359");
});

for (const code of [
  "REQUEST_DENIED",
  "OVER_QUERY_LIMIT",
  "ZERO_RESULTS",
  "UNKNOWN_ERROR",
]) {
  test(`búsqueda fallida ${code} mantiene coordenadas y selección manual`, async ({
    page,
  }) => {
    await open(page, { geocodeFail: code });
    await page.getByLabel("Buscar ciudad o dirección").fill("Bucaramanga");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Ubicación del negocio" })
        .getByRole("alert"),
    ).toBeVisible();
    await expect(latitude(page)).toHaveValue("6.24");
    await page.getByTestId("marker").click();
    await expect(latitude(page)).toHaveValue("6.25184");
  });
}

test("fallo del script del mapa conserva ubicación al guardar otros datos", async ({
  page,
}) => {
  await open(page, { mapsFail: true });
  await expect(
    page.getByText("No pudimos cargar el mapa.", { exact: false }),
  ).toBeVisible();
  await save(page).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Perfil actualizado correctamente.",
  );
  expect(
    await page.evaluate(() => window.profileTest.saved?.latitudNegocio),
  ).toBe(6.24);
});

test("la ciudad inicial sin coordenadas sirve de referencia sin persistir el centro", async ({
  page,
}) => {
  await open(page, {
    initial: { latitudNegocio: null, longitudNegocio: null },
  });
  await expect(
    page.getByRole("button", { name: "Confirmar este punto" }),
  ).toBeVisible();
  await expect(latitude(page)).toHaveValue("");
  await save(page).click();
  expect(
    await page.evaluate(() => window.profileTest.saved?.latitudNegocio),
  ).toBeNull();
});

test("guardado bloquea doble clic, muestra carga y conserva teléfono, dirección e imágenes", async ({
  page,
}) => {
  await open(page, { slowSave: true });
  await page.getByLabel("Teléfono de Contacto (Opcional)").fill("3115556677");
  await save(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator("button[type=submit]")).toBeDisabled();
  await expect(page.locator("button[type=submit]")).toContainText("Guardando…");
  await expect(
    page.getByLabel("Dirección del Negocio (Opcional)"),
  ).toBeDisabled();
  await page.evaluate(() => window.profileTest.releaseSave?.());
  await expect(page.getByRole("dialog")).toContainText(
    "Perfil actualizado correctamente.",
  );
  const submissions = await page.evaluate(() => window.profileTest.submissions);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    telefonoNegocio: "+573115556677",
    direccionNegocio: "Calle 10 # 20-30",
    imagenPerfil: "https://example.test/profile.png",
    imagenPortada: "https://example.test/cover.png",
    instagram: "https://instagram.com/negocio",
    latitudNegocio: 6.24,
    longitudNegocio: -75.58,
  });
});

for (const control of [
  { rejectSave: true },
  { throwSave: true },
  { expireSession: true },
]) {
  test(`rechazo recuperable conserva formulario ${JSON.stringify(control)}`, async ({
    page,
  }) => {
    await open(page, control);
    await page
      .getByLabel("Dirección del Negocio (Opcional)")
      .fill("Dirección editada");
    await save(page).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toContainText(
      "Perfil actualizado correctamente.",
    );
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(
      page.getByLabel("Dirección del Negocio (Opcional)"),
    ).toHaveValue("Dirección editada");
    await expect(save(page)).toBeEnabled();
    await expect(latitude(page)).toHaveValue("6.24");
  });
}

test("datos inválidos impiden envío", async ({ page }) => {
  await open(page);
  await page.getByLabel("Descripción del Negocio", { exact: true }).fill("");
  await save(page).click();
  await expect(
    page.getByText("La descripción del negocio es obligatoria", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.profileTest.submissions),
  ).toHaveLength(0);
});

test("fallo al refrescar sesión después de guardar no presenta rechazo de la escritura", async ({
  page,
}) => {
  await open(page, { failSessionUpdate: true });
  await save(page).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Perfil actualizado correctamente.",
  );
  expect(
    await page.evaluate(() => window.profileTest.submissions),
  ).toHaveLength(1);
});

test("desmontar con solicitudes pendientes no provoca errores de componente", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, { slowSave: true });
  await page
    .getByRole("button", { name: "Usar mi ubicación", exact: true })
    .click();
  await save(page).click();
  await page.evaluate(() => {
    window.profileTest.rootUnmount?.();
    window.profileTest.releaseSave?.();
    window.profileTest.geoSuccess?.({
      coords: { latitude: 0, longitude: 0 },
    } as GeolocationPosition);
  });
  await expect(page.locator("#root")).toBeEmpty();
  await page.waitForTimeout(700);
  expect(errors).toEqual([]);
});

test("móvil: controles y botón caben en el viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const mapWidth = await page
    .getByRole("region", { name: "Ubicación del negocio" })
    .boundingBox();
  expect(mapWidth!.width).toBeLessThanOrEqual(390);
  const button = await save(page).boundingBox();
  expect(button!.width).toBeGreaterThan(290);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("region", { name: "Ubicación del negocio" }).screenshot({
    path: "test-results/playwright/profile-editor/map-mobile.png",
  });
});

test("reemplazo fallido de imagen conserva el asset previo sin borrado remoto", async ({
  page,
}) => {
  await open(page);
  const deletes: string[] = [];
  await page.route("**/api/cloudinary/delete", (route) => {
    deletes.push(route.request().url());
    return route.abort();
  });
  await page.route("https://api.cloudinary.com/**", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "simulated upload failure" } }),
    }),
  );
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "new-image.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
      ),
    });
  await expect(
    page.getByRole("alert").filter({ hasText: "Error al subir archivo" }),
  ).toBeVisible();
  await save(page).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Perfil actualizado correctamente.",
  );
  expect(deletes).toEqual([]);
  expect(
    await page.evaluate(() => window.profileTest.saved?.imagenPerfil),
  ).toBe("https://example.test/profile.png");
});

const svgFixture = {
  name: "new-image.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
  ),
};
const temporaryDeleteButton = (page: Page) =>
  page.getByRole("button", {
    name: `Eliminar imagen ${testPublicId}`,
    exact: true,
  });
async function successfulUpload(page: Page) {
  await page.route("https://api.cloudinary.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: testUploadedUrl,
        public_id: testPublicId,
        resource_type: "image",
      }),
    }),
  );
  await page.locator('input[type="file"]').first().setInputFiles(svgFixture);
  await expect(temporaryDeleteButton(page)).toBeVisible();
}

test("uploader compartido: reemplazo correcto conserva asset anterior y usa subida firmada", async ({
  page,
}) => {
  await open(page, {}, "uploaderOnly");
  let deletes = 0;
  let uploads = 0;
  await page.route("**/api/cloudinary/delete", (route) => {
    deletes++;
    return route.abort();
  });
  await page.route("https://api.cloudinary.com/**", (route) => {
    uploads++;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: testUploadedUrl,
        public_id: testPublicId,
        resource_type: "image",
      }),
    });
  });
  await page.locator('input[type="file"]').first().setInputFiles(svgFixture);
  await expect(temporaryDeleteButton(page)).toBeVisible();
  expect(await page.evaluate(() => window.profileTest.draftImages)).toBe(
    testUploadedUrl,
  );
  expect(uploads).toBe(1);
  expect(deletes).toBe(0);
});

test("uploader compartido: fallo de autorización o subida no pierde referencia guardada", async ({
  page,
}) => {
  await open(page, {}, "uploaderOnly");
  let deletes = 0;
  await page.route("**/api/cloudinary/delete", (route) => {
    deletes++;
    return route.abort();
  });
  await page.route("**/api/cloudinary/upload-authorization", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.locator('input[type="file"]').first().setInputFiles(svgFixture);
  await expect(page.locator("#upload-error")).toContainText(
    "Error al subir archivo",
  );
  expect(await page.evaluate(() => window.profileTest.draftImages)).toBe(
    "https://example.test/profile.png",
  );
  expect(deletes).toBe(0);
});

for (const status of [403, 503]) {
  test(`uploader: rechazo de limpieza ${status} conserva el nuevo archivo y referencia`, async ({
    page,
  }) => {
    await open(page, {}, "uploaderOnly");
    await successfulUpload(page);
    await page.route("**/api/cloudinary/delete", (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Limpieza denegada" }),
      }),
    );
    await temporaryDeleteButton(page).click();
    await expect(page.locator("#upload-error")).toContainText(
      "Error al eliminar archivo",
    );
    await expect(temporaryDeleteButton(page)).toBeVisible();
    expect(await page.evaluate(() => window.profileTest.draftImages)).toBe(
      testUploadedUrl,
    );
  });
}

test("uploader: limpieza autorizada de temporal comunica la referencia vacía", async ({
  page,
}) => {
  await open(page, {}, "uploaderOnly");
  await successfulUpload(page);
  await page.route("**/api/cloudinary/delete", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, deleted: 1 }),
    }),
  );
  await temporaryDeleteButton(page).click();
  await expect(temporaryDeleteButton(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.profileTest.draftImages),
  ).toBeUndefined();
});

test("uploader: archivo en uso se retira solo del borrador sin borrado remoto", async ({
  page,
}) => {
  await open(page, {}, "uploaderOnly");
  await successfulUpload(page);
  await page.route("**/api/cloudinary/delete", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "ASSET_IN_USE" }),
    }),
  );
  await temporaryDeleteButton(page).click();
  await expect(temporaryDeleteButton(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.profileTest.draftImages),
  ).toBeUndefined();
  await expect(page.locator("#upload-error")).toBeEmpty();
});

test("uploader: asset antiguo sin prueba se desvincula localmente sin llamar al endpoint", async ({
  page,
}) => {
  await open(page, {}, "uploaderOnly");
  let deletes = 0;
  await page.route("**/api/cloudinary/delete", (route) => {
    deletes++;
    return route.abort();
  });
  await page
    .getByRole("button", {
      name: "Eliminar imagen https://example.test/profile.png",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(() => window.profileTest.draftImages),
  ).toBeUndefined();
  expect(deletes).toBe(0);
});
