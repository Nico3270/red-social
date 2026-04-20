import { expect, test } from "@playwright/test";
import { getTraditionalProfileUrl, smokeFixtures } from "./lib/fixtures";

function normalizeSectionSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "");
}

test.describe("Perfil tradicional público", () => {
  test("carga el perfil y abre la pestaña de productos", async ({ page }) => {
    const fixture = smokeFixtures.traditionalProfile;

    await page.goto(getTraditionalProfileUrl(fixture.slug));

    await expect(page.getByRole("heading", { name: fixture.businessName })).toBeVisible();

    await page.getByRole("button", { name: "Productos", exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/perfil/${fixture.slug}\\?tab=productos`));
    await expect(page.locator(`a[href^=\"/producto/${fixture.product.slug}\"]`).first()).toBeVisible();
  });

  test("conserva la sección activa al volver desde el detalle", async ({ page }) => {
    const fixture = smokeFixtures.traditionalProfile;

    await page.goto(getTraditionalProfileUrl(fixture.slug));
    await page.getByRole("button", { name: "Productos", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/perfil/${fixture.slug}\\?tab=productos`));

    const sectionChip = page
      .locator('[data-testid^="catalog-section-chip-"]')
      .first();

    const sectionName = (await sectionChip.textContent())?.trim();

    expect(sectionName).toBeTruthy();

    await sectionChip.click();

    const productLink = page.locator('a[href^="/producto/"]').first();
    await expect(productLink).toHaveAttribute("href", /from=profile-products/);
    await expect(productLink).toHaveAttribute("href", /section=/);

    const hrefWithSection = await productLink.getAttribute("href");
    const restoredSectionParam = hrefWithSection?.match(/[?&]section=([^&]+)/)?.[1];
    const normalizedSectionParam = restoredSectionParam
      ? normalizeSectionSlug(restoredSectionParam)
      : null;

    expect(hrefWithSection).toContain("from=profile-products");
    expect(hrefWithSection).toContain("section=");
    expect(restoredSectionParam).toBeTruthy();
    expect(normalizedSectionParam).toBeTruthy();

    await Promise.all([
      page.waitForURL(/\/producto\//),
      productLink.click(),
    ]);

    const returnLink = page.getByRole("link", { name: /Volver al catálogo/i });
    await expect(returnLink).toHaveAttribute(
      "href",
      new RegExp(`/perfil/${fixture.slug}\\?tab=productos&section=${normalizedSectionParam}`)
    );

    await Promise.all([
      page.waitForURL(
        (url) =>
          url.pathname === `/perfil/${fixture.slug}` &&
          url.searchParams.get("tab") === "productos" &&
          url.searchParams.get("section") === normalizedSectionParam
      ),
      returnLink.click(),
    ]);

    await expect(page.locator('a[href^="/producto/"]').first()).toHaveAttribute(
      "href",
      new RegExp(`section=${restoredSectionParam}`)
    );
  });
});