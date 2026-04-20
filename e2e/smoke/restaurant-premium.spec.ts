import { expect, test, type Page } from "@playwright/test";
import { getTraditionalProfileUrl, smokeFixtures } from "./lib/fixtures";

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

test.describe("Perfil restaurante premium", () => {
  test("mantiene navegación premium pero usa la experiencia base del catálogo", async ({ page }) => {
    const fixture = smokeFixtures.restaurantProfile;

    await page.goto(getTraditionalProfileUrl(fixture.slug));

    await expect(page.getByRole("heading", { name: fixture.businessName })).toBeVisible();

    await page.getByRole("button", { name: "Productos", exact: true }).click();

    await expect(page.getByTestId("restaurant-catalog-view")).toBeVisible();
    await expect(page.getByTestId("restaurant-group-nav")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();

    if (fixture.fallbackTarget.sampleProduct.hasWhatsApp) {
      await expect(
        page.getByRole("link", {
          name: new RegExp(`Contactar por WhatsApp sobre ${fixture.fallbackTarget.sampleProduct.name}`),
        })
      ).toBeVisible();
    }

    if (fixture.fallbackTarget.sampleProduct.hasVariants) {
      await expect(
        page.getByRole("button", {
          name: new RegExp(`Seleccionar variantes de ${fixture.fallbackTarget.sampleProduct.name}`),
        })
      ).toBeVisible();
    } else if (fixture.fallbackTarget.sampleProduct.isOutOfStock) {
      await expect(
        page.getByRole("button", {
          name: new RegExp(`Agregar ${fixture.fallbackTarget.sampleProduct.name} al carrito`),
        })
      ).toBeDisabled();
    } else {
      const addButton = page.getByRole("button", {
        name: new RegExp(`Agregar ${fixture.fallbackTarget.sampleProduct.name} al carrito`),
      });
      await expect(addButton).toBeVisible();
      await addButton.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("respeta el deep link válido del grupo inicial", async ({ page }) => {
    const fixture = smokeFixtures.restaurantProfile;

    await page.goto(
      getTraditionalProfileUrl(
        fixture.slug,
        `?tab=productos&group=${fixture.fallbackTarget.slug}`
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

  test("puede volver del grupo al catálogo completo y regresar sin errores de auth", async ({ page }) => {
    const fixture = smokeFixtures.restaurantProfile;
    const profileFlowFailures = captureProfileFlowFailures(page);

    await page.goto(
      getTraditionalProfileUrl(
        fixture.slug,
        `?tab=productos&group=${fixture.fallbackTarget.slug}`
      )
    );

    await expect(page.getByTestId("restaurant-catalog-view")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: fixture.fallbackTarget.sampleProduct.name, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ver todo el catálogo", exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Ver todo el catálogo", exact: true }).click();

    await expect
      .poll(() => {
        const currentUrl = new URL(page.url());
        return `${currentUrl.pathname}${currentUrl.search}`;
      })
      .toBe(`/perfil/${fixture.slug}?tab=productos`);

    if (fixture.ungroupedSampleProduct) {
      await expect(
        page.getByRole("heading", {
          name: fixture.ungroupedSampleProduct.name,
          exact: true,
        })
      ).toBeVisible();
    }

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
});
