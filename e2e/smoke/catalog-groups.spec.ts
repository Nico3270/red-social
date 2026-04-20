import { expect, test, type Page } from "@playwright/test";
import {
  getCatalogGroupsProfileFixture,
  getCatalogGroupsProfileSkipReason,
  getTraditionalProfileUrl,
  smokeFixtures,
} from "./lib/fixtures";

const PROFILE_FLOW_FAILURE_PATTERN =
  /(ClientFetchError|ERR_CONNECTION_REFUSED|\/api\/auth\/session|_next\/image|__nextjs_original-stack-frames|__nextjs_devtools_config)/i;

function captureProfileFlowFailures(page: Page): string[] {
  const messages: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (PROFILE_FLOW_FAILURE_PATTERN.test(text)) {
      messages.push(text);
    }
  });

  page.on("pageerror", (error) => {
    if (PROFILE_FLOW_FAILURE_PATTERN.test(error.message)) {
      messages.push(error.message);
    }
  });

  return messages;
}

test.describe("Deep links de CatalogGroups", () => {
  test("resuelve deep link válido en un perfil CatalogGroups no-restaurante", async ({ page }) => {
    const genericFixture = getCatalogGroupsProfileFixture();

    test.skip(!genericFixture, getCatalogGroupsProfileSkipReason() ?? undefined);

    const fixture = genericFixture!;
    await page.goto(
      getTraditionalProfileUrl(
        fixture.slug,
        `?tab=productos&group=${fixture.fallbackTarget.slug}`
      )
    );

    await expect(page.getByTestId("catalog-groups-public-view")).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/perfil/${fixture.slug}\\?tab=productos&group=${fixture.fallbackTarget.slug}`)
    );
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();
  });

  test("mantiene visibles productos activos sin grupo dentro del catálogo base", async ({ page }) => {
    const genericFixture = getCatalogGroupsProfileFixture();

    test.skip(!genericFixture, getCatalogGroupsProfileSkipReason() ?? undefined);
    test.skip(
      !genericFixture?.ungroupedSampleProduct,
      "El fixture activo no expone un producto sin grupo para validar esta ruta."
    );

    const fixture = genericFixture!;
    await page.goto(getTraditionalProfileUrl(fixture.slug, "?tab=productos"));

    await expect(page.getByTestId("catalog-groups-public-view")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: fixture.ungroupedSampleProduct!.name,
        exact: true,
      })
    ).toBeVisible();
  });

  test("permite pasar de un grupo al catálogo completo y volver sin errores de auth ni reinicios", async ({ page }) => {
    const genericFixture = getCatalogGroupsProfileFixture();

    test.skip(!genericFixture, getCatalogGroupsProfileSkipReason() ?? undefined);
    test.skip(
      !genericFixture?.ungroupedSampleProduct,
      "El fixture activo no expone un producto sin grupo para validar esta ruta."
    );

    const fixture = genericFixture!;
    const profileFlowFailures = captureProfileFlowFailures(page);

    await page.goto(
      getTraditionalProfileUrl(
        fixture.slug,
        `?tab=productos&group=${fixture.fallbackTarget.slug}`
      )
    );

    await expect(page.getByTestId("catalog-groups-public-view")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Ver todo", exact: true }).click();

    await expect
      .poll(() => {
        const currentUrl = new URL(page.url());
        return `${currentUrl.pathname}${currentUrl.search}`;
      })
      .toBe(`/perfil/${fixture.slug}?tab=productos`);
    await expect(
      page.getByRole("heading", {
        name: fixture.ungroupedSampleProduct!.name,
        exact: true,
      })
    ).toBeVisible();

    await page.getByRole("button", { name: fixture.fallbackTarget.rootName, exact: true }).click();

    await expect
      .poll(() => {
        const currentUrl = new URL(page.url());
        return `${currentUrl.pathname}${currentUrl.search}`;
      })
      .toBe(`/perfil/${fixture.slug}?tab=productos&group=${fixture.fallbackTarget.slug}`);
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();
    await expect(profileFlowFailures).toEqual([]);
  });

  test("hace fallback a un grupo válido cuando el slug es inválido", async ({ page }) => {
    const fixture = smokeFixtures.restaurantProfile;

    await page.goto(
      getTraditionalProfileUrl(
        fixture.slug,
        `?tab=productos&group=${smokeFixtures.invalidGroupSlug}`
      )
    );

    await expect(page.getByTestId("restaurant-catalog-view")).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/perfil/${fixture.slug}\\?tab=productos&group=${fixture.fallbackTarget.slug}`)
    );
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();
  });
});
