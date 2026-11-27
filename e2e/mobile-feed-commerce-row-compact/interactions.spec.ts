import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, measure } from "./browser";
const out = "docs/mobile-feed-commerce-row-compact";
test("commerce targets, keyboard, stock and variants keep original behavior", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const records = [];
  for (const id of ["p1", "p4", "p5", "p8"]) {
    const card = page.locator(`[data-feed-product-id="${id}"]`);
    await card.evaluate((el) =>
      scrollBy(
        0,
        el.getBoundingClientRect().top -
          document.querySelector("header")!.getBoundingClientRect().bottom -
          16,
      ),
    );
    await settled(page);
    const c = (await measure(page)).cards.find((c) => c.id === id)!;
    expect(c.collisions).toEqual([]);
    for (const b of c.controls) expect(b.hit).toBe(true);
    expect(c.priceFullyVisible).toBe(true);
    const label = await card.locator("p").evaluateAll((nodes) =>
      nodes.map((p) => ({
        text: p.textContent,
        width: p.getBoundingClientRect().width,
        height: p.getBoundingClientRect().height,
        lineHeight: getComputedStyle(p).lineHeight,
        clamp: getComputedStyle(p).webkitLineClamp,
        display: getComputedStyle(p).display,
        contain: getComputedStyle(p).contain,
      })),
    );
    await card.screenshot({
      path: `${out}/screenshots/edge-${id}.png`,
      animations: "disabled",
    });
    records.push({ id, measure: c, labels: label });
  }
  const card = page.locator('[data-feed-product-id="p1"]');
  await card.scrollIntoViewIfNeeded();
  const wa = card.getByRole("link", { name: /Contactar por WhatsApp/ });
  await expect(wa).toHaveAttribute("href", /^https:\/\/wa.me\/\d+\?text=/);
  const pending = page.waitForEvent("popup");
  await wa.click();
  await (await pending).close();
  const button = card.getByRole("button", { name: /Agregar .* al carrito/ });
  await button.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton").fill("2");
  await dialog
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.values(
          JSON.parse(localStorage.getItem("carro_negocios")!).state
            .carts as Record<
            string,
            { id: string; cantidad: number; precio: number }[]
          >,
        )
          .flat()
          .find((p) => p.id === "p1"),
      ),
    )
    .toMatchObject({ cantidad: 2, precio: 45000 });
  const variants = page.locator('[data-feed-product-id="p4"]');
  await variants.scrollIntoViewIfNeeded();
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
  for (const id of ["p5", "p8"])
    await expect(
      page
        .locator(`[data-feed-product-id="${id}"]`)
        .getByRole("button", { name: /agotado$/ }),
    ).toBeDisabled();
  writeFileSync(
    `${out}/interactions.json`,
    JSON.stringify(
      {
        records,
        whatsappOpened: true,
        keyboardCart: true,
        quantity: 2,
        variantStockCap: 3,
        soldOutDisabled: true,
      },
      null,
      2,
    ),
  );
});

test("short and long variant labels do not force an ordinary C2 price onto another row", async ({
  page,
}) => {
  const data = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const records = [];
  for (const label of [
    "Única",
    "Presentación artesanal especial de edición limitada",
  ]) {
    data.setFirstVariant(180000, label);
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const c = (await measure(page)).cards.find((c) => c.id === "p1")!;
    expect(c.c2).toBe(true);
    expect(c.wrapped).toBe(false);
    expect(c.collisions).toEqual([]);
    expect(c.priceFullyVisible).toBe(true);
    for (const b of c.controls) expect(b.hit).toBe(true);
    const card = page.locator('[data-feed-product-id="p1"]');
    const caption = card.locator("p").filter({ hasText: label });
    await expect(caption).toHaveText(label);
    expect(
      await caption.evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(32);
    await card.screenshot({
      path: `${out}/screenshots/variant-${label === "Única" ? "short" : "long"}-390.png`,
      animations: "disabled",
    });
    records.push({ label, measure: c });
  }
  writeFileSync(`${out}/variant-labels.json`, JSON.stringify(records, null, 2));
});
