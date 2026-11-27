import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import {
  setup,
  openRoot,
  settled,
} from "../mobile-feed-actions-layout-final/browser";
const out = "docs/mobile-feed-avatar-follow-overlay";
const phase = "after";
test.skip(process.env.OVERLAY_BEFORE === "1");
async function showCard(page: import("@playwright/test").Page, id: string) {
  const card = page.locator(`[data-feed-product-id="${id}"]`);
  await card.evaluate((el) =>
    scrollBy(
      0,
      el.getBoundingClientRect().top -
        document.querySelector("header")!.getBoundingClientRect().bottom -
        52,
    ),
  );
  await settled(page);
  return card;
}

test(`final actions ${phase} interactions, keyboard, cart and variants`, async ({
  page,
}) => {
  const fake = await setup(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const card = await showCard(page, "p1");
  await expect(
    card.getByRole("button", { name: "Seguir a Casa Origen", exact: true }),
  ).toHaveCount(1);
  const follow = card.getByRole("button", {
    name: "Seguir a Casa Origen",
    exact: true,
  });
  await follow.focus();
  await page.keyboard.press("Enter");
  await page.mouse.move(0, 0);
  await expect(
    card.getByRole("button", {
      name: "Dejar de seguir a Casa Origen",
      exact: true,
    }),
  ).toBeVisible();
  const favorite = card.getByRole("button", {
    name: /Guardar .* en favoritos/,
  });
  await expect(favorite).toHaveCount(1);
  await favorite.focus();
  await page.keyboard.press("Space");
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites.map(
        (p: { id: string }) => p.id,
      ),
    ),
  ).toContain("p1");
  await page.screenshot({
    path: `${out}/screenshots/${phase}-active.png`,
    animations: "disabled",
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites.map(
        (p: { id: string }) => p.id,
      ),
    ),
  ).not.toContain("p1");
  await card
    .getByRole("button", { name: "Dejar de seguir a Casa Origen", exact: true })
    .hover();
  await card
    .getByRole("button", { name: "Dejar de seguir a Casa Origen", exact: true })
    .click();
  await page.mouse.move(0, 0);
  await expect(
    card.getByRole("button", { name: "Seguir a Casa Origen", exact: true }),
  ).toBeVisible();
  expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(2);
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  const whatsapp = card.getByRole("link", { name: /Contactar por WhatsApp/ });
  await expect(whatsapp).toHaveAttribute(
    "href",
    /https:\/\/wa.me\/3100000000\?text=/,
  );
  const popup = page.waitForEvent("popup");
  await whatsapp.click();
  await (await popup).close();
  await card.getByRole("button", { name: /Agregar .* al carrito/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton").fill("2");
  await dialog
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
            "casa-origen"
          ][0],
      ),
    )
    .toMatchObject({ id: "p1", precio: 145000, cantidad: 2 });
  const variants = await showCard(page, "p4");
  await variants.getByRole("button", { name: /Elegir opciones/ }).click();
  await dialog.getByRole("button", { name: /^39/ }).click();
  await expect(
    dialog.getByRole("button", { name: "Sin stock", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: /^38/ }).click();
  await dialog.getByRole("spinbutton").fill("99");
  await expect(dialog.getByRole("spinbutton")).toHaveValue("3");
  await dialog
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
          "casa-origen"
        ].find((p: { id: string }) => p.id === "p4"),
      ),
    )
    .toMatchObject({ productVariantId: "v1", precio: 145000, cantidad: 3 });
  for (const id of ["p5", "p8"])
    await expect(
      page
        .locator(`[data-feed-product-id="${id}"]`)
        .getByRole("button", { name: /agotado$/ }),
    ).toBeDisabled();
  expect(fake.actions.filter((a) => a.name === "refused")).toEqual([]);
  writeFileSync(
    `${out}/${phase}-commerce.json`,
    JSON.stringify(
      {
        actions: fake.actions.map((a) => a.name),
        followAndUnfollow: true,
        favoriteAddAndRemove: true,
        keyboardEnterAndSpace: true,
        whatsappOpened: true,
        quantity: 2,
        variantStockClamp: 3,
        exhaustedDisabled: true,
      },
      null,
      2,
    ),
  );
});

test(`final actions ${phase} anonymous behavior and original login request`, async ({
  page,
}) => {
  const fake = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/auth/login?**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Destino sintético de login</title><main>Login</main>",
    }),
  );
  await openRoot(page);
  const card = await showCard(page, "p1");
  const favorite = card.getByRole("button", {
    name: /Guardar .* en favoritos/,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await card
    .getByRole("button", { name: "Seguir a Casa Origen", exact: true })
    .click();
  await expect(
    page.getByText("Inicia sesión para interactuar", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `${out}/screenshots/${phase}-login-request.png`,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByText("Inicia sesión para interactuar", { exact: true }),
  ).toHaveCount(0);
  await card
    .getByRole("button", { name: "Seguir a Casa Origen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(
    "http://127.0.0.1:3000/auth/login?callbackUrl=%2F",
  );
  expect(fake.actions.some((a) => a.name === "toggleFollow")).toBe(false);
  writeFileSync(
    `${out}/${phase}-anonymous.json`,
    JSON.stringify(
      {
        localFavoritesUnchangedBehavior: true,
        followRequestsLogin: true,
        cancelWorks: true,
        loginUrl: page.url(),
        followMutationSent: false,
      },
      null,
      2,
    ),
  );
});

test(`final actions ${phase} product and business links are independent`, async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const destinations = ["/perfil/casa-origen", "/producto/reloj-minimalista"];
  await page.route("**/*", (route) => {
    if (!destinations.includes(new URL(route.request().url()).pathname))
      return route.fallback();
    return route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Destino sintético</title><main>Destino de tarjeta</main>",
    });
  });
  for (const [index, target] of destinations.entries()) {
    await openRoot(page);
    const card = await showCard(page, "p1");
    if (index === 0)
      await card
        .getByRole("link", { name: "Casa Origen", exact: true })
        .click();
    else
      await card
        .locator('a[href="/producto/reloj-minimalista"]')
        .first()
        .click();
    await expect(page).toHaveURL(`http://127.0.0.1:3000${target}`);
  }
  writeFileSync(
    `${out}/${phase}-navigation.json`,
    JSON.stringify(destinations, null, 2),
  );
});
