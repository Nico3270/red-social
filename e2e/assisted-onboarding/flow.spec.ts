import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import {
  isolatedPrisma,
  seedFixtures,
  fixturePassword,
  fixtureEmail,
} from "./isolated-fixtures";

const prisma = isolatedPrisma();
const png = readFileSync("e2e/assisted-onboarding/synthetic-product.png");
async function media(context: BrowserContext) {
  await context.route("https://api.cloudinary.com/**", async (route) => {
    const body = route.request().postData() || "";
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(body)?.[1];
    if (!publicId)
      return route.fulfill({
        status: 400,
        json: { error: "Synthetic upload rejected" },
      });
    await route.fulfill({
      json: {
        secure_url: `https://res.cloudinary.com/onboarding-synthetic/image/upload/v1/${publicId}.png`,
        public_id: publicId,
        resource_type: "image",
      },
    });
  });
  await context.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await context.route("https://**.google-analytics.com/**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  await context.route("https://res.cloudinary.com/**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await context.route("**/_next/image?**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
}
async function login(page: Page, email = fixtureEmail) {
  // Real NextAuth credentials endpoint; no fabricated session cookie.
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  const response = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrf.csrfToken,
      email,
      password: fixturePassword,
      callbackUrl: "http://127.0.0.1:5487/myckeoAdmin/incorporacion",
    },
    maxRedirects: 0,
  });
  expect([200, 302, 303]).toContain(response.status());
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user?.email).toBe(email);
}
async function manage(page: Page, name: string) {
  await page.goto("/myckeoAdmin/incorporacion");
  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .getByRole("button", { name: "Demo y activación" })
    .click();
}
async function absentFromPublic(
  page: Page,
  slug: string,
  productSlugs: string[],
) {
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).not.toContain(`/perfil/${slug}`);
  for (const p of productSlugs) expect(xml).not.toContain(`/producto/${p}`);
  const profile = await page.request.get(`/perfil/${slug}`);
  expect([200, 404]).toContain(profile.status());
  expect(await profile.text()).toContain(
    "Error al cargar el perfil del negocio.",
  );
  expect(
    (await (await page.request.get(`/api/negocios/${slug}`)).json()).negocio,
  ).toBeUndefined();
  for (const p of productSlugs.slice(0, 1)) {
    const response = await page.request.get(`/producto/${p}`);
    expect(await response.text()).toContain("Se ha producido un error");
    const api = await (await page.request.get(`/api/productos/${slug}`)).json();
    expect(api.products).toEqual([]);
  }
}

test.beforeAll(async ({ request }) => {
  await seedFixtures(prisma);
  expect(
    (await request.post("http://127.0.0.1:16447", { data: ["FLUSHDB"] })).ok(),
  ).toBe(true);
});
test.afterAll(async () => {
  await prisma.$disconnect();
});

test("superadministrator completes the entire assisted flow with synthetic data", async ({
  page,
  browser,
}) => {
  await media(page.context());
  await login(page);
  await page.goto("/myckeoAdmin/incorporacion");
  await expect(
    page.getByRole("heading", { name: "Incorporación asistida", exact: true }),
  ).toBeVisible();
  const name = `Taller Ficticio ${Date.now()}`;
  await page.getByLabel("Nombre comercial", { exact: true }).fill(name);
  await page
    .getByLabel(/^Departamento/)
    .selectOption({ label: "Cundinamarca" });
  await page.getByLabel(/^Ciudad/).selectOption({ label: "Bogotá" });
  await page
    .getByLabel(/^Categoría/)
    .selectOption({ label: "Moda y Accesorios" });
  await page.getByLabel(/^Sección/).selectOption({ label: "Accesorios" });
  await page
    .getByLabel("Descripción autorizada")
    .fill("Perfil totalmente ficticio para validar incorporación asistida.");
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toHaveText("Operación completada.");
  const created = await prisma.negocio.findFirstOrThrow({
    where: { nombre: name },
    include: { usuario: true },
  });
  expect(created.estado).toBe("suspendido");
  expect(created.usuario.isPlaceholder).toBe(true);
  const ownerId = created.usuarioId;
  // A repeated submission with the same operation cannot create another identity.
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toHaveText("Operación completada.");
  expect(await prisma.negocio.count({ where: { nombre: name } })).toBe(1);

  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await article.getByRole("link", { name: "Editar perfil" }).click();
  await expect(page).toHaveURL(/\/myckeoAdmin\/editar\//);
  await expect(
    page.getByRole("heading", { name: "Editar negocio", exact: true }),
  ).toBeVisible();
  await page
    .locator("textarea")
    .first()
    .fill(
      "Perfil ficticio revisado por el administrador para este ensayo integral.",
    );
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.negocio.findUniqueOrThrow({ where: { id: created.id } }))
          .descripcion,
    )
    .toBe(
      "Perfil ficticio revisado por el administrador para este ensayo integral.",
    );
  await page.goto(`/myckeoAdmin/crearProductos?businessId=${created.id}`);
  await expect(
    page.getByRole("heading", {
      name: "Crear productos asistidos",
      exact: true,
    }),
  ).toBeVisible();
  let concurrentSaves = 0;
  await page.route(
    `**/myckeoAdmin/crearProductos?businessId=${created.id}`,
    async (route) => {
      if (
        !concurrentSaves &&
        route.request().method() === "POST" &&
        route.request().postData()?.includes('"operationId"')
      ) {
        concurrentSaves = 2;
        const responses = await Promise.all([route.fetch(), route.fetch()]);
        expect(responses.every((r) => r.ok())).toBe(true);
        await route.fulfill({ response: responses[0] });
      } else await route.continue();
    },
  );
  for (let i = 1; i <= 5; i++) {
    await page.locator("#product-name").fill(`Accesorio ficticio ${i}`);
    await page
      .locator("#product-price")
      .fill(i === 1 ? "$ 28.000,50" : "28000");
    await page
      .locator("#base-description")
      .fill(
        `Accesorio sintético número ${i}, diseñado exclusivamente para verificar este ensayo sin datos reales.`,
      );
    await page
      .getByRole("button", { name: "Preparar sin IA", exact: true })
      .click();
    await expect(page.locator("#draft-name")).toHaveValue(
      `Accesorio ficticio ${i}`,
    );
    await page
      .getByRole("button", { name: "Guardar producto", exact: true })
      .click();
    await expect
      .poll(() => prisma.product.count({ where: { negocioId: created.id } }))
      .toBe(i);
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: `sintetica-${i}.png`,
        mimeType: "image/png",
        buffer: png,
      });
    await expect(
      page.getByText("Imágenes en uploader: 1", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Guardar imágenes/ }),
    ).toBeEnabled();
    await page.getByRole("button", { name: /Guardar imágenes/ }).click();
    await expect
      .poll(() =>
        prisma.image.count({ where: { product: { negocioId: created.id } } }),
      )
      .toBe(i);
    if (i < 5)
      await page
        .getByRole("button", {
          name: "Guardar y crear otro producto",
          exact: true,
        })
        .click();
  }
  const products = await prisma.product.findMany({
    where: { negocioId: created.id },
    include: { imagenes: true },
    orderBy: { createdAt: "asc" },
  });
  expect(products).toHaveLength(5);
  expect(products.every((p) => p.status === "oculto")).toBe(true);
  expect(products[0].precio).toBe(28000.5);
  expect(concurrentSaves).toBe(2);
  const imageIds = products.flatMap((p) => p.imagenes.map((img) => img.id));
  await page.goto(
    `/myckeoAdmin/crearProductos?businessId=${created.id}&productId=${products[0].id}`,
  );
  await page.locator("#product-name").waitFor();
  await page
    .getByRole("button", { name: "Preparar sin IA", exact: true })
    .click();
  await expect(page.locator("#draft-name")).toHaveValue(products[0].nombre);
  await page.locator("#draft-price").fill("29.000,50");
  await page
    .getByRole("button", { name: "Guardar producto", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: products[0].id },
          })
        ).precio,
    )
    .toBe(29000.5);
  expect(await prisma.product.count({ where: { negocioId: created.id } })).toBe(
    5,
  );
  expect(
    await prisma.image.findMany({ where: { id: { in: imageIds } } }),
  ).toHaveLength(5);

  const anon = await browser.newContext({
    baseURL: "http://127.0.0.1:5487",
    viewport: { width: 390, height: 844 },
  });
  await media(anon);
  const guest = await anon.newPage();
  await absentFromPublic(
    guest,
    created.slug,
    products.map((p) => p.slug),
  );

  await manage(page, name);
  const management = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: `Gestionar ${name}`,
      exact: true,
    }),
  });
  for (const p of products)
    await management.getByLabel(new RegExp(p.nombre)).check();
  await management.getByLabel("Tengo autorización", { exact: false }).check();
  await management
    .getByRole("button", { name: "Generar demo privada · 7 días" })
    .click();
  const demoInput = management.getByLabel("Enlace de demo", { exact: true });
  await expect(demoInput).toBeVisible();
  const demoUrl = await demoInput.inputValue();
  const demoResponse = await guest.goto(demoUrl);
  expect(demoResponse?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(guest.getByRole("heading", { name, exact: true })).toBeVisible();
  expect(guest.url()).not.toContain("#");
  await expect(
    guest.getByRole("heading", { name: /Accesorio ficticio/ }),
  ).toHaveCount(5);
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(await guest.locator('script[src*="googletagmanager"]').count()).toBe(
    0,
  );
  await mkdir("docs/assisted-onboarding-v1", { recursive: true });
  await guest.screenshot({
    path: "docs/assisted-onboarding-v1/demo-mobile.png",
    fullPage: true,
  });
  await absentFromPublic(
    guest,
    created.slug,
    products.map((p) => p.slug),
  );

  await management
    .getByLabel("Verifiqué manualmente identidad", { exact: false })
    .check();
  await management
    .getByRole("button", { name: "Generar activación segura" })
    .click();
  const activationInput = management.getByLabel(
    "Enlace de activación · 1 hora",
    { exact: false },
  );
  await expect(activationInput).toBeVisible();
  const activationUrl = await activationInput.inputValue();
  expect(activationUrl !== demoUrl).toBe(true);
  await guest.goto(activationUrl);
  await expect(guest.locator("#activation-nombre")).toBeVisible();
  await guest.waitForLoadState("networkidle");
  await guest.locator("#activation-nombre").fill("Persona");
  await guest.locator("#activation-apellido").fill("Ficticia");
  await guest
    .locator("#activation-email")
    .fill("other-owner@onboarding.invalid");
  await guest.locator("#activation-username").fill(`ficticio_${Date.now()}`);
  await guest
    .locator("#activation-departamento")
    .selectOption({ label: "Cundinamarca" });
  await guest
    .locator("#activation-ciudadCompleta")
    .selectOption({ label: "Bogotá" });
  await guest.locator("#activation-genero").selectOption("otro");
  await guest.locator("#activation-fechaNacimiento").fill("1990-01-01");
  await guest.locator("#activation-password").fill("FictitiousOnly2026!");
  await guest
    .locator("#activation-confirmPassword")
    .fill("FictitiousOnly2026!");
  await guest.getByRole("button", { name: /Activar mi cuenta/ }).click();
  await expect(
    guest.getByText("Este correo no está disponible. Usa otro.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (await prisma.usuario.findUniqueOrThrow({ where: { id: ownerId } }))
      .isPlaceholder,
  ).toBe(true);
  await guest
    .locator("#activation-email")
    .fill(`owner-${Date.now()}@onboarding.invalid`);
  await guest.locator("#activation-password").fill("FictitiousOnly2026!");
  await guest
    .locator("#activation-confirmPassword")
    .fill("FictitiousOnly2026!");
  await guest.getByRole("button", { name: /Activar mi cuenta/ }).click();

  await expect
    .poll(
      async () =>
        (await prisma.usuario.findUniqueOrThrow({ where: { id: ownerId } }))
          .isPlaceholder,
    )
    .toBe(false);
  const activated = await prisma.negocio.findUniqueOrThrow({
    where: { id: created.id },
  });
  expect(activated.usuarioId).toBe(ownerId);
  expect(activated.estado).toBe("suspendido");
  expect(
    await prisma.image.findMany({ where: { id: { in: imageIds } } }),
  ).toHaveLength(5);
  await absentFromPublic(
    guest,
    created.slug,
    products.map((p) => p.slug),
  );
  await manage(page, name);
  for (const p of products.slice(0, 4))
    await management.getByLabel(new RegExp(p.nombre)).check();
  await management.getByLabel("Tengo autorización", { exact: false }).check();
  await management
    .getByRole("button", { name: "Aprobar y publicar selección" })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.negocio.findUniqueOrThrow({ where: { id: created.id } }))
          .estado,
    )
    .toBe("activo");
  expect(
    await prisma.product.count({
      where: { negocioId: created.id, status: "disponible" },
    }),
  ).toBe(4);
  const publicResponse = await guest.goto(`/perfil/${created.slug}`);
  expect(publicResponse?.status()).toBe(200);
  await expect(guest.getByText(name, { exact: true }).first()).toBeVisible();
  const publicCatalog = await guest.request.get(
    `/api/productos/${created.slug}`,
  );
  expect(publicCatalog.headers()["cache-control"]).toContain("no-store");
  expect((await publicCatalog.json()).products).toHaveLength(4);
  const xml = await (await guest.request.get("/sitemap.xml")).text();
  expect(xml).toContain(`/perfil/${created.slug}`);
  expect(xml).toContain(`/producto/${products[0].slug}`);
  expect(xml).not.toContain(`/producto/${products[4].slug}`);
  await management
    .getByRole("button", { name: "Suspender negocio", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await prisma.negocio.findUniqueOrThrow({ where: { id: created.id } }))
          .estado,
    )
    .toBe("suspendido");
  await absentFromPublic(
    guest,
    created.slug,
    products.map((p) => p.slug),
  );
  await management.getByRole("button", { name: "Revocar demos" }).click();
  await expect
    .poll(() =>
      prisma.businessDemoLink.count({
        where: { negocioId: created.id, revokedAt: null },
      }),
    )
    .toBe(0);
  await guest.goto(demoUrl);
  await expect(guest.getByRole("heading", { name, exact: true })).toHaveCount(
    0,
  );
  // A new link is independent of the revoked one; the fragment never reaches
  // Next's request URL or the HTML snapshot.
  await management
    .getByRole("button", { name: "Generar demo privada · 7 días" })
    .click();
  await expect
    .poll(() =>
      prisma.businessDemoLink.count({
        where: { negocioId: created.id, revokedAt: null },
      }),
    )
    .toBe(1);
  const renewedUrl = await demoInput.inputValue();
  const rawDemo = new URL(renewedUrl).hash.slice("#token=".length);
  const storedDemo = await prisma.businessDemoLink.findFirstOrThrow({
    where: { negocioId: created.id, revokedAt: null },
  });
  expect(
    storedDemo.tokenHash ===
      createHash("sha256").update(`business-demo:v1:${rawDemo}`).digest("hex"),
  ).toBe(true);
  expect(JSON.stringify(storedDemo).includes(rawDemo)).toBe(false);
  const origin = "http://127.0.0.1:5487";
  const claimCannotOpenDemo = await guest.request.post(
    "/api/business-demo/bootstrap",
    {
      headers: { origin },
      data: { token: new URL(activationUrl).hash.slice("#token=".length) },
    },
  );
  expect(claimCannotOpenDemo.status()).toBe(410);
  const badToken = rawDemo.slice(0, -1) + (rawDemo.endsWith("A") ? "B" : "A");
  const tampered = await guest.request.post("/api/business-demo/bootstrap", {
    headers: { origin },
    data: { token: badToken },
  });
  expect(tampered.status()).toBe(410);
  await prisma.businessDemoLink.update({
    where: { id: storedDemo.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expired = await guest.request.post("/api/business-demo/bootstrap", {
    headers: { origin },
    data: { token: rawDemo },
  });
  expect(expired.status()).toBe(410);
  const expiredContext = await browser.newContext({ baseURL: origin });
  const expiredPage = await expiredContext.newPage();
  await expiredPage.goto(renewedUrl);
  await expect(expiredPage.locator('p[role="alert"]')).toContainText(
    "expiró o fue revocada",
  );
  await expect(
    expiredPage.getByRole("heading", { name, exact: true }),
  ).toHaveCount(0);
  await expiredContext.close();
  const excessive = await Promise.all(
    Array.from({ length: 65 }, () =>
      guest.request.post("/api/business-demo/bootstrap", {
        headers: { origin },
        data: { token: "C".repeat(43) },
      }),
    ),
  );
  expect(excessive.some((r) => r.status() === 429)).toBe(true);
  expect(excessive.every((r) => [410, 429].includes(r.status()))).toBe(true);
  await anon.close();
});
