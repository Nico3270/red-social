import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const evidence = "docs/audits/postgres-integration-evidence";
const fixture = JSON.parse(
  readFileSync(`${evidence}/browser-fixtures.json`, "utf8"),
) as {
  rows: { key: string; id: string; tier: number; type: string }[];
  productSlug: string;
  phone: string;
};
type RequestPage = {
  city: string;
  type: string;
  cursor?: string;
  seenIds: string[];
  category?: string;
};
async function setup(page: Page) {
  const requests: RequestPage[] = [];
  const errors: string[] = [];
  const statuses: number[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.request().headers()["next-action"])
      statuses.push(response.status());
  });
  await page
    .context()
    .addCookies([
      { name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(() =>
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
    ),
  );
  await page.context().route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== "http://127.0.0.1:3419")
      return route.abort();
    if (request.method() === "POST") {
      let args;
      try {
        args = JSON.parse(request.postData() || "null", (_key, value) =>
          value === "$undefined" ? undefined : value,
        );
      } catch {}
      // Only actual read actions are allowed. Never substitute their responses.
      if (
        !request.headers()["next-action"] ||
        !["products", "publications", "services", "businesses"].includes(
          args?.[0],
        )
      )
        return route.abort();
      requests.push({
        city: args[1].ciudad,
        type: args[0],
        cursor: args[1].cursor,
        seenIds: args[1].seenIds,
        category: args[1].categoriaSlug,
      });
    }
    return route.continue();
  });
  return { requests, statuses, errors };
}
async function keys(page: Page) {
  return page
    .locator("[data-feed-item-key]")
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-feed-item-key")!),
    );
}
async function drain(page: Page, tab = "para ti") {
  for (let i = 0; i < 35; i++) {
    if (await page.getByText(`No hay más ${tab}.`, { exact: true }).count())
      break;
    await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
    // Allow the intersection observer, actual Server Action and React layout to settle.
    await page.waitForTimeout(400);
  }
  await expect(
    page.getByText(`No hay más ${tab}.`, { exact: true }),
  ).toBeVisible();
}
function complete(actual: string[], expected: string[], city = "Tunja") {
  expect([...actual].sort()).toEqual([...expected].sort());
  expect(new Set(actual).size).toBe(actual.length);
  const tiers = actual.map((key) =>
    city === "Tunja"
      ? key.includes("-local-")
        ? 0
        : key.includes("-dept-")
          ? 1
          : 2
      : key.includes("-national-")
        ? 0
        : 2,
  );
  expect(tiers).toEqual([...tiers].sort());
}
async function changeCity(page: Page) {
  await page.getByRole("button", { name: /Cambiar ubicación/ }).click();
  const selects = page.getByRole("combobox").filter({ visible: true });
  await selects.nth((await selects.count()) - 2).click();
  await page.getByRole("option", { name: "Cundinamarca", exact: true }).click();
  const current = page.getByRole("combobox").filter({ visible: true });
  await current.nth((await current.count()) - 1).click();
  await page.getByRole("option", { name: "Bogotá", exact: true }).click();
  await page
    .getByRole("button", { name: "Actualizar Ubicación", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cambiar ubicación: Bogotá" }),
  ).toBeVisible();
}

test("PostgreSQL: mobile feed, all tiers and pages, new selection, product WhatsApp and card actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await page.goto("/");
  await expect(page.locator("[data-feed-product-id]").first()).toBeVisible({
    timeout: 60_000,
  });
  await drain(page);
  const initial = await keys(page);
  complete(
    initial,
    fixture.rows.map((row) => row.key),
  );
  expect(
    state.requests.some(
      (request) =>
        request.city === "Tunja" && request.cursor?.startsWith("fg2."),
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${evidence}/postgres-feed-tunja-390.png`,
    fullPage: true,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await changeCity(page);
  // Existing seen policy recycles once after all previously delivered IDs are exhausted.
  await expect
    .poll(
      () =>
        state.requests.filter((request) => request.city === "Bogotá").length,
    )
    .toBeGreaterThanOrEqual(4);
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await drain(page);
  const changed = await keys(page);
  complete(
    changed,
    fixture.rows.map((row) => row.key),
    "Bogotá",
  );
  expect(
    state.requests.some(
      (request) =>
        request.city === "Bogotá" && request.cursor?.startsWith("fg2."),
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${evidence}/postgres-feed-bogota-390.png`,
    fullPage: true,
  });
  const card = page.locator("[data-feed-product-id]").first();
  await card.scrollIntoViewIfNeeded();
  const link = card.locator('a[href^="https://wa.me/"]');
  expect(new URL((await link.getAttribute("href"))!).pathname).toBe(
    `/${fixture.phone}`,
  );
  const dimensions = await card.evaluate((el) => {
    const wa = el
      .querySelector('a[href^="https://wa.me/"]')!
      .getBoundingClientRect();
    const cart = [...el.querySelectorAll("button")]
      .find((b) =>
        /Agregar .* al carrito/.test(b.getAttribute("aria-label") || ""),
      )!
      .getBoundingClientRect();
    const price = el
      .querySelector('[class*="priceBlock"]')!
      .getBoundingClientRect();
    const avatar = el
      .querySelector('[class*="avatarPhoto"]')!
      .getBoundingClientRect();
    const badge = el
      .querySelector('[class*="avatarIcon"]')!
      .getBoundingClientRect();
    return {
      sameRow:
        Math.abs(wa.top - cart.top) < 12 &&
        price.bottom > wa.top &&
        price.top < wa.bottom,
      badgeOverlap:
        Math.min(avatar.right, badge.right) >
          Math.max(avatar.left, badge.left) &&
        Math.min(avatar.bottom, badge.bottom) > Math.max(avatar.top, badge.top),
      waHeight: wa.height,
      cartHeight: cart.height,
    };
  });
  expect(dimensions.sameRow).toBe(true);
  expect(dimensions.badgeOverlap).toBe(true);
  expect(dimensions.waHeight).toBe(44);
  expect(dimensions.cartHeight).toBe(44);
  const previousUrl = page.url();
  await card.getByRole("button", { name: /Agregar .* al carrito/ }).click();
  expect(page.url()).toBe(previousUrl);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(`/producto/${fixture.productSlug}`);
  const productLink = page.locator('a[href^="https://wa.me/"]').first();
  await expect(productLink).toBeVisible();
  const destination = new URL((await productLink.getAttribute("href"))!);
  expect(destination.pathname).toBe(`/${fixture.phone}`);
  expect(destination.searchParams.get("text")).toContain(fixture.productSlug);
  expect(destination.searchParams.get("text")).toContain(
    `/producto/${fixture.productSlug}`,
  );
  await page.screenshot({ path: `${evidence}/postgres-product-390.png` });
  expect(state.errors).toEqual([]);
  expect(state.statuses.length).toBeGreaterThan(8);
  expect(state.statuses.every((status) => status === 200)).toBe(true);
  writeFileSync(
    `${evidence}/browser-postgres-mobile.json`,
    JSON.stringify(
      {
        initial,
        changed,
        requests: state.requests,
        statuses: state.statuses,
        errors: state.errors,
        dimensions,
        destination: destination.toString(),
      },
      null,
      2,
    ),
  );
});

test("PostgreSQL: category filters, desktop and contact/category route regressions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await setup(page);
  await page.goto("/category/comida");
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
  await drain(page, "productos");
  const actual = await keys(page);
  complete(
    actual,
    fixture.rows
      .filter(
        (row) => row.type === "products" && !row.id.includes("wrong-category"),
      )
      .map((row) => row.key),
  );
  expect(actual).toHaveLength(36);
  expect(state.requests.every((request) => request.category === "comida")).toBe(
    true,
  );
  await page.screenshot({
    path: `${evidence}/postgres-category-comida-1440.png`,
    fullPage: true,
  });
  const routes: Record<string, number> = {};
  for (const route of [
    "/contacto",
    "/category/moda",
    "/category/negocios",
    "/category/audit-missing-category",
    "/audit-missing-category",
  ]) {
    const response = await page.goto(route);
    routes[route] = response!.status();
    expect(response!.status()).toBe(route.includes("missing") ? 404 : 200);
    if (route === "/contacto")
      await expect(
        page.locator('a[href="mailto:soporte@myckeo.com"]'),
      ).toBeVisible();
  }
  expect(state.errors).toEqual([]);
  writeFileSync(
    `${evidence}/browser-postgres-category.json`,
    JSON.stringify(
      {
        keys: actual,
        requests: state.requests,
        statuses: state.statuses,
        errors: state.errors,
        routes,
      },
      null,
      2,
    ),
  );
});
