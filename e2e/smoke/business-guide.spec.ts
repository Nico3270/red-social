import { expect, test } from "@playwright/test";
import { getTraditionalProfileUrl, smokeFixtures } from "./lib/fixtures";

test.describe("Guía pública del perfil", () => {
  test("renderiza la guía, muestra resultados y puede llevar a Productos", async ({ page }) => {
    const fixture = smokeFixtures.traditionalProfile;

    await page.goto(getTraditionalProfileUrl(fixture.slug));

    await expect(page.getByTestId("business-guide-section")).toBeVisible();
    await expect(page.getByTestId("business-guide-entry")).toBeVisible();

    const catalogPreset = page.getByTestId("business-guide-preset-0");
    await expect(catalogPreset).toBeVisible();
    await expect(catalogPreset).toContainText("Ver catálogo");
    await catalogPreset.click();

    await expect(page.getByTestId("business-guide-results")).toBeVisible();
    await expect(page.getByTestId("business-guide-result-0")).toBeVisible();

    await Promise.all([
      page.waitForURL(new RegExp(`/perfil/${fixture.slug}\\?tab=productos`)),
      page.getByTestId("business-guide-explore-more").click(),
    ]);

    await expect(page.locator('a[href^="/producto/"]').first()).toBeVisible();
  });
});
