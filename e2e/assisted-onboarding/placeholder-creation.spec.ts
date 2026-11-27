import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { join, basename } from "node:path";
import {
  isolatedPrisma,
  seedFixtures,
  fixtureEmail,
  fixturePassword,
} from "./isolated-fixtures";
const prisma = isolatedPrisma();
const testSecret = "synthetic-provision-secret-isolated-only";
const genericError =
  "No se pudo preparar el negocio. Reintenta la misma operación.";
async function login(page: Page) {
  const csrf = await (await page.request.get("/api/auth/csrf")).json();
  await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrf.csrfToken,
      email: fixtureEmail,
      password: fixturePassword,
      callbackUrl: "http://127.0.0.1:5487/myckeoAdmin/incorporacion",
    },
    maxRedirects: 0,
  });
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user?.role).toBe("super_admin");
}
async function fill(page: Page, name: string, phone = "+573000000000") {
  await page.goto("/myckeoAdmin/incorporacion");
  await expect(
    page.getByRole("heading", { name: "Incorporación asistida", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nombre comercial", { exact: true }).fill(name);
  await page
    .getByLabel("Teléfono comercial autorizado", { exact: true })
    .fill(phone);
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
    .fill(
      "Información comercial completamente ficticia para verificar el alta administrativa.",
    );
}
async function operation(page: Page) {
  const ref = await page.evaluate(() =>
    localStorage.getItem("myckeo-assisted-operation-v1"),
  );
  expect(Boolean(ref)).toBe(true);
  return {
    ref,
    hash: createHmac("sha256", testSecret)
      .update(`assisted-v1:${ref}`)
      .digest("hex"),
  };
}
const countPlaceholders = () =>
  prisma.usuario.count({ where: { isPlaceholder: true } });
test.beforeAll(async () => {
  await seedFixtures(prisma);
});
test.afterAll(async () => {
  await prisma.$disconnect();
});

test("missing provisioning configuration is diagnosed, reloads safely and creates one complete suspended placeholder on concurrent retry", async ({
  page,
}) => {
  await login(page);
  const name = `Comercio sintético ${Date.now()}`;
  await fill(page, name);
  const beforeUsers = await countPlaceholders(),
    beforeBusinesses = await prisma.negocio.count();
  let initialRef: string | null = null;
  if (process.env.ASSISTED_TEST_START_WITHOUT_PROVISIONING_SECRET === "1") {
    await page
      .getByRole("button", { name: "Crear negocio suspendido" })
      .click();
    await expect(page.getByRole("status")).toHaveText(genericError);
    expect(await countPlaceholders()).toBe(beforeUsers);
    expect(await prisma.negocio.count()).toBe(beforeBusinesses);
    initialRef = (await operation(page)).ref;
    const runtime = realpathSync(process.env.ASSISTED_TEST_RUNTIME || "");
    expect(
      runtime.startsWith("/tmp/myckeo-assisted-v1-") &&
        basename(runtime) === "runtime",
    ).toBe(true);
    const log = join(process.env.ASSISTED_TEST_ARTIFACT_DIR!, "next-dev.log");
    const failureLogs = readFileSync(log, "utf8");
    expect(failureLogs.includes("PROVISIONING_SECRET_MISSING")).toBe(true);
    expect(failureLogs.includes(name)).toBe(false);
    expect(failureLogs.includes("+573000000000")).toBe(false);
    writeFileSync(
      join(runtime, ".env.local"),
      `ACCOUNT_PROVISIONING_HMAC_SECRET=${testSecret}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await expect
      .poll(() => readFileSync(log, "utf8").includes("Reload env: .env.local"))
      .toBe(true);
    console.log(
      "Missing-secret failure reproduced before persistence; isolated Next.js reloaded local configuration.",
    );
  }
  let concurrent = false;
  await page.route("**/myckeoAdmin/incorporacion", async (route) => {
    if (
      !concurrent &&
      route.request().method() === "POST" &&
      route.request().postData()?.includes('"operationId"')
    ) {
      concurrent = true;
      const results = await Promise.all([route.fetch(), route.fetch()]);
      expect(results.every((r) => r.ok())).toBe(true);
      await route.fulfill({ response: results[0] });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toHaveText("Operación completada.");
  const current = await operation(page);
  if (initialRef) expect(current.ref === initialRef).toBe(true);
  const user = await prisma.usuario.findUniqueOrThrow({
    where: { placeholderProvisioningKeyHash: current.hash },
    include: { negocio: { include: { categorias: true, secciones: true } } },
  });
  expect(user.isPlaceholder).toBe(true);
  expect(user.perfilCompleto).toBe(false);
  expect(user.role).toBe("negocio");
  expect(user.negocio?.estado).toBe("suspendido");
  expect(user.negocio?.usuarioId).toBe(user.id);
  expect(user.negocio?.nombre).toBe(name);
  expect(user.negocio?.ciudad).toBe("Bogotá");
  expect(user.negocio?.departamento).toBe("Cundinamarca");
  expect(user.negocio?.telefonoContacto).toBe("+573000000000");
  expect(user.negocio?.descripcion).toContain("completamente ficticia");
  expect(user.negocio?.categorias.map((c) => c.categoryId)).toEqual(["1"]);
  expect(user.negocio?.secciones.map((s) => s.sectionId)).toEqual(["s4"]);
  expect(await countPlaceholders()).toBe(beforeUsers + 1);
  expect(await prisma.negocio.count()).toBe(beforeBusinesses + 1);
  await expect(
    page.getByRole("heading", { name: `Gestionar ${name}`, exact: true }),
  ).toBeVisible();
  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(
    article.getByRole("link", { name: "Agregar productos" }),
  ).toHaveAttribute(
    "href",
    `/myckeoAdmin/crearProductos?businessId=${user.negocio!.id}`,
  );
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toHaveText("Operación completada.");
  const reused = await prisma.usuario.findUniqueOrThrow({
    where: { placeholderProvisioningKeyHash: current.hash },
    include: { negocio: true },
  });
  expect(reused.id).toBe(user.id);
  expect(reused.negocio?.id).toBe(user.negocio?.id);
  expect(await countPlaceholders()).toBe(beforeUsers + 1);
  expect(await prisma.negocio.count()).toBe(beforeBusinesses + 1);
  expect(concurrent).toBe(true);
});

test("a taxonomy rejection is specific and the same provisional user recovers without duplicates", async ({
  page,
}) => {
  await login(page);
  const name = `Recuperación sintética ${Date.now()}`;
  await fill(page, name, "+573000000001");
  const beforeUsers = await countPlaceholders(),
    beforeBusinesses = await prisma.negocio.count();
  let rejectOnce = true;
  await page.route("**/myckeoAdmin/incorporacion", async (route) => {
    const body = route.request().postData();
    if (
      rejectOnce &&
      route.request().method() === "POST" &&
      body?.includes('"operationId"')
    ) {
      rejectOnce = false;
      const payload = JSON.parse(body);
      const change = (v: unknown): void => {
        if (!v || typeof v !== "object") return;
        if ("operationId" in v && "categoriaIds" in v)
          (v as { categoriaIds: string[] }).categoriaIds = [
            "synthetic-nonexistent-category",
          ];
        else for (const child of Object.values(v)) change(child);
      };
      change(payload);
      await route.continue({ postData: JSON.stringify(payload) });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toContainText(
    "categoría seleccionada ya no está disponible",
  );
  const current = await operation(page);
  const pending = await prisma.usuario.findUniqueOrThrow({
    where: { placeholderProvisioningKeyHash: current.hash },
    include: { negocio: true },
  });
  expect(pending.isPlaceholder).toBe(true);
  expect(pending.negocio).toBeNull();
  expect(await countPlaceholders()).toBe(beforeUsers + 1);
  expect(await prisma.negocio.count()).toBe(beforeBusinesses);
  await page.getByRole("button", { name: "Crear negocio suspendido" }).click();
  await expect(page.getByRole("status")).toHaveText("Operación completada.");
  const recovered = await prisma.usuario.findUniqueOrThrow({
    where: { placeholderProvisioningKeyHash: current.hash },
    include: { negocio: true },
  });
  expect(recovered.id).toBe(pending.id);
  expect(recovered.negocio?.estado).toBe("suspendido");
  expect(recovered.negocio?.usuarioId).toBe(pending.id);
  expect(await countPlaceholders()).toBe(beforeUsers + 1);
  expect(await prisma.negocio.count()).toBe(beforeBusinesses + 1);
});
