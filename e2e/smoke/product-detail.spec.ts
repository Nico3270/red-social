import { expect, test } from "@playwright/test";
import { getProductDetailUrl, smokeFixtures } from "./lib/fixtures";

test.describe("Detalle de producto público", () => {
  test("muestra CTAs y permite abrir el flujo básico de carrito", async ({ page }) => {
    const fixture = smokeFixtures.traditionalProfile.product;

    await page.goto(getProductDetailUrl(fixture.slug));

    await expect(page.getByTestId("product-detail-view")).toBeVisible();
    await expect(page.getByRole("heading", { name: fixture.name })).toBeVisible();

    if (fixture.hasWhatsApp) {
      const whatsappLink = page.getByTestId("product-detail-whatsapp");
      await expect(whatsappLink).toBeVisible();
      await expect(whatsappLink).toHaveAttribute("href", /wa\.me/);
    }

    const cartTrigger = page.getByTestId("product-detail-cart-trigger");
    await expect(cartTrigger).toBeVisible();
    await expect(cartTrigger).toBeEnabled();

    await cartTrigger.click();
    await expect(page.getByTestId("product-detail-cart-modal")).toBeVisible();

    await page.getByTestId("product-detail-cart-confirm").click();

    await expect(page.getByText("¡Producto agregado al carrito!")).toBeVisible();
  });
});