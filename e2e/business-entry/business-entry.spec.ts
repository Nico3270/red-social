import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
const evidence = "docs/audits/business-entry-evidence";
const email = "new-owner@business-audit.invalid",
  password = "AuditLocal123!";
async function setup(page: Page) {
  await page
    .context()
    .route("**/*", (route) =>
      new URL(route.request().url()).origin === "http://127.0.0.1:3421"
        ? route.continue()
        : route.abort(),
    );
  await page
    .context()
    .addCookies([
      { name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(() => {
    if (!localStorage.getItem("preferences-storage"))
      localStorage.setItem(
        "preferences-storage",
        JSON.stringify({
          state: {
            ciudad: "Tunja",
            departamento: "Boyacá",
            preferencias: [],
            secciones: [],
            seenIds: [],
            userLat: null,
            userLong: null,
          },
          version: 0,
        }),
      );
  });
}
async function captureEntry(page: Page, width: number) {
  await expect
    .poll(() =>
      page.locator("[data-feed-item-key]").evaluateAll((items) =>
        items.every((item) => {
          for (let el: Element | null = item; el; el = el.parentElement)
            if (Number(getComputedStyle(el).opacity) < 0.999) return false;
          return true;
        }),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: `${evidence}/entry-${width}.png` });
}
async function login(page: Page, email: string) {
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Correo Electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Iniciar Sesión", exact: true })
    .click();
}
async function createBusiness(page: Page, name: string) {
  await expect(
    page.getByRole("heading", { name: "Crear un negocio", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const form = page.locator("form");
  await form.getByRole("button", { name: "Comida", exact: true }).click();
  await form
    .getByRole("button", { name: "Comida Rápida", exact: true })
    .click();
  await form.locator('input[name="nombre"]').fill(name);
  await form
    .locator('textarea[name="descripcion"]')
    .fill("Negocio sintético para validar exclusivamente el entorno aislado.");
  const selects = form.getByRole("combobox");
  await selects.nth(0).click();
  await page.getByRole("option", { name: "Boyacá", exact: true }).click();
  await selects.nth(1).click();
  await page.getByRole("option", { name: "Tunja", exact: true }).click();
  await form.locator('input[name="telefonoContacto"]').fill("3100000000");
  await form
    .getByRole("button", { name: "Crear negocio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/editar-perfil/, {
    timeout: 60000,
  });
  await expect(
    page.getByText("No pudimos cargar la información del negocio.", {
      exact: true,
    }),
  ).toHaveCount(0);
}
test("mobile entry → business credentials registration → business creation → management", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("[data-feed-product-id]").first().waitFor();
  const entry = page.getByRole("link", {
    name: "Tengo un negocio",
    exact: true,
  });
  await expect(entry).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Cambiar ubicación/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir búsqueda" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await captureEntry(page, 390);
  await entry.click();
  await expect(page).toHaveURL(/\/auth\/new-account\?tipo=negocio/);
  await expect(
    page.getByRole("heading", {
      name: "Crea tu Cuenta de Negocio",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inicia sesión", exact: true }),
  ).toHaveAttribute("href", "/auth/login?tipo=negocio");
  await expect(
    page.getByRole("button", { name: "Iniciar con Google", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Nombre del administrador", { exact: true })
    .fill("Ana");
  await page
    .getByLabel("Apellido del administrador", { exact: true })
    .fill("Sintética");
  await page.getByLabel("Correo Electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page
    .getByLabel("Selecciona un departamento", { exact: true })
    .selectOption("Boyacá");
  await page
    .getByLabel("Selecciona una ciudad", { exact: true })
    .selectOption("Tunja");
  await page
    .getByLabel("Selecciona tu género", { exact: true })
    .selectOption("otro");
  await page
    .getByPlaceholder("Selecciona tu fecha de nacimiento")
    .fill("01/01/1990");
  await page
    .getByLabel("Aceptar Políticas de Privacidad y Cookies", { exact: true })
    .check();
  await page.screenshot({
    path: `${evidence}/business-register-390.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/crear_negocio\//, { timeout: 60000 });
  await createBusiness(page, "Negocio Sintético Auditoría");
  await page.screenshot({ path: `${evidence}/business-created-390.png` });
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.user.role).toBe("negocio");
  expect(session.user.hasManagedBusiness).toBe(true);
  expect(session.user.perfilCompleto).toBe(true);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Tengo un negocio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  writeFileSync(
    `${evidence}/credentials-flow.json`,
    JSON.stringify(
      {
        email,
        role: session.user.role,
        businessCreated: !!session.user.negocioId,
        managedBusiness: session.user.hasManagedBusiness,
        finalPath: new URL(page.url()).pathname,
      },
      null,
      2,
    ),
  );
});
test("desktop entry and personal registration remain available; existing account resumes without registration", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.locator("[data-feed-product-id]").first().waitFor();
  await expect(
    page.getByRole("link", { name: "Tengo un negocio", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await captureEntry(page, 1440);
  await page
    .getByRole("link", { name: "Tengo un negocio", exact: true })
    .click();
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Elegir otro tipo de cuenta" })
    .click();
  await page.getByText("Cuenta Personal", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Crea tu Cuenta Personal", exact: true }),
  ).toBeVisible();
  await page.goto("/auth/new-account?tipo=negocio");
  await page.getByRole("link", { name: "Inicia sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login\?tipo=negocio/);
  await expect(
    page.getByRole("link", { name: "Regístrate", exact: true }),
  ).toHaveAttribute("href", "/auth/new-account?tipo=negocio");
  await login(page, "existing-personal@business-audit.invalid");
  await expect(page).toHaveURL(/\/crear_negocio\/existing-personal/, {
    timeout: 60000,
  });
  await page.goto("/");
  await page
    .getByRole("link", { name: "Tengo un negocio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/crear_negocio\/existing-personal/);
});
test("incomplete account resumes personal details then business creation; intent grants no user-ID permission", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/auth/login?tipo=negocio");
  await login(page, "incomplete-personal@business-audit.invalid");
  await expect(page).toHaveURL(/\/dashboard\/editar-usuario\?negocio=1/, {
    timeout: 60000,
  });
  await page.locator("select#departamento").selectOption("Boyacá");
  await page.locator("select#ciudad").selectOption("Tunja");
  await page.getByRole("button", { name: /Guardar/ }).click();
  await expect(page).toHaveURL(/\/crear_negocio\/incomplete-personal/, {
    timeout: 60000,
  });
  await page.goto("/crear_negocio/existing-personal");
  await expect(
    page.getByText(
      "Error: No tienes permiso para crear un perfil para este usuario.",
      { exact: true },
    ),
  ).toBeVisible();
});
