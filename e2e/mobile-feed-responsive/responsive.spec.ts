import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { boundaries, ready } from "../mobile-feed-implementation/boundaries";
import { geometry } from "../mobile-feed-implementation/geometry";
import { details, align } from "./details";
import { occupancy } from "./occupancy";
const output = "docs/mobile-feed-responsive";
test.describe.configure({ mode: "parallel" });
const records: object[] = [];
const reference = JSON.parse(readFileSync(`${output}/reference.json`, "utf8"));
test.afterEach(async ({ browserName }, info) => {
  if (records.length) {
    writeFileSync(
      `${output}/measurements-case-${info.testId.replace(/[^A-Za-z0-9_-]/g, "_")}.json`,
      JSON.stringify({ browserName, records: records.splice(0) }, null, 2),
    );
  }
});
function check(g: Awaited<ReturnType<typeof geometry>>) {
  expect(g.overflow).toBe(false);
  for (const c of g.cards.filter((c) => c.product)) {
    expect(c.priceFits, c.label || "price").toBe(true);
    for (const a of c.controls) {
      expect(a.width).toBeGreaterThanOrEqual(43.9);
      expect(a.height).toBeGreaterThanOrEqual(43.9);
      expect(a.inside, a.label || "inside").toBe(true);
      expect(a.hit, a.label || "hit").toBe(true);
      expect(a.nestedInteractive).toBe(false);
    }
  }
}
async function pixels(file: string, buffer: Buffer) {
  const old = await sharp(readFileSync(file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    now = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  expect(now.info).toEqual(old.info);
  let different = 0;
  for (let i = 0; i < old.data.length; i += 4)
    if (
      old.data[i] !== now.data[i] ||
      old.data[i + 1] !== now.data[i + 1] ||
      old.data[i + 2] !== now.data[i + 2] ||
      old.data[i + 3] !== now.data[i + 3]
    )
      different++;
  return { different, total: old.info.width * old.info.height };
}
for (const width of [1024, 1280, 1440, 1920])
  test(`desktop exact restoration ${width}`, async ({ page }) => {
    await boundaries(page);
    await page.setViewportSize({ width, height: 900 });
    const ref = reference.measurements.find(
      (r: { width: number }) => r.width === width,
    );
    for (const actions of ["separate", "split"]) {
      await ready(page, `?actions=${actions}`);
      await align(page);
      const g = await geometry(page);
      check(g);
      expect(await details(page)).toEqual(ref.rendered);
      const image = await page.screenshot({
        path: `${output}/screenshots/restored-${actions}-${width}.png`,
        animations: "disabled",
      });
      const diff = await pixels(
        `${output}/screenshots/reference-${width}.png`,
        image,
      );
      expect(diff.different).toBe(0);
      expect(
        g.cards
          .filter((c) => c.product)
          .map((c) => [c.width, c.height, c.mediaWidth, c.mediaHeight]),
      ).toEqual(
        ref.metrics.cards
          .filter((c: { product: boolean }) => c.product)
          .map(
            (c: {
              width: number;
              height: number;
              mediaWidth: number;
              mediaHeight: number;
            }) => [c.width, c.height, c.mediaWidth, c.mediaHeight],
          ),
      );
      records.push({ case: "desktop", width, actions, diff, g });
    }
  });
test("desktop category retains four columns at 1920", async ({ page }) => {
  await boundaries(page);
  await page.setViewportSize({ width: 1920, height: 900 });
  await ready(page, "?category=1");
  await align(page);
  expect(await details(page)).toEqual(reference.category.rendered);
  const image = await page.screenshot({
    path: `${output}/screenshots/restored-category-1920.png`,
    animations: "disabled",
  });
  const diff = await pixels(
    `${output}/screenshots/reference-category-1920.png`,
    image,
  );
  expect(diff.different).toBe(0);
  records.push({ case: "desktop-category", diff });
});
for (const width of [320, 360, 390, 430, 768])
  test(`mobile A B at ${width}`, async ({ page }) => {
    await boundaries(page);
    await page.setViewportSize({ width, height: 844 });
    for (const actions of ["separate", "split"]) {
      await ready(page, `?actions=${actions}`);
      const initial = await geometry(page);
      check(initial);
      await page.screenshot({
        path: `${output}/screenshots/${actions}-${width}-initial.png`,
      });
      await align(page);
      const aligned = await geometry(page);
      check(aligned);
      const photo = await occupancy(page);
      expect(photo.controls).toBe(actions === "separate" ? 2 : 1);
      expect(photo.badgeOverlap).toBe(false);
      await page.screenshot({
        path: `${output}/screenshots/${actions}-${width}-aligned.png`,
      });
      const grid = await page
        .locator("[data-product-module]")
        .first()
        .evaluate(
          (m) =>
            getComputedStyle(m.firstElementChild!).gridTemplateColumns.split(
              " ",
            ).length,
        );
      expect(grid).toBe(width >= 390 ? 2 : 1);
      expect(
        await page
          .locator("[data-feed-product-id]")
          .evaluateAll((els) =>
            els.map((el) => el.getAttribute("data-feed-product-id")),
          ),
      ).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
      await ready(page, `?one=1&actions=${actions}`);
      const single = await geometry(page);
      check(single);
      const approvedHeights: Record<number, number> = {
        320: 255.56,
        360: 277.19,
        390: 293.39,
        430: 302,
        768: 302,
      };
      expect(single.cards[0].height).toBeCloseTo(
        approvedHeights[width] + (actions === "split" ? 10 : 0),
        1,
      );
      const singlePhoto = await occupancy(page);
      await page
        .locator('[data-product-variant="feed"]')
        .first()
        .screenshot({
          path: `${output}/screenshots/${actions}-${width}-single.png`,
          style:
            'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
        });
      records.push({
        case: "mobile",
        width,
        actions,
        initial,
        aligned,
        photo,
        single: single.cards[0],
        singlePhoto,
      });
    }
  });
for (const actions of ["separate", "split"])
  test(`${actions} states, orientation, zoom and container`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await boundaries(page);
    for (const width of [320, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 568 });
      await ready(
        page,
        `?view=cases&actions=${actions}${width >= 390 ? "&cardWidth=186" : ""}`,
      );
      check(await geometry(page));
      for (const name of ["sold-out", "variants-sold-out"]) {
        const card = page.locator(`[data-case="${name}"]`);
        await expect(
          card.getByRole("button", { name: /agotado/ }),
        ).toBeDisabled();
        await expect(
          card.getByText("Agotado", { exact: true }).first(),
        ).toBeVisible();
      }
      await page.locator('[data-case="failed"]').scrollIntoViewIfNeeded();
      await expect(
        page.locator('[data-case="failed"] img[alt="Café de origen · 250 g"]'),
      ).toHaveAttribute("src", /placeholder_productos/);
      for (const name of ["long", "variants", "sold-out"]) {
        const el = page.locator(`[data-case="${name}"] [data-product-variant]`);
        await el.screenshot({
          path: `${output}/screenshots/${actions}-${width}-${name}.png`,
          style:
            'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
        });
      }
      records.push({ case: "states", actions, width, g: await geometry(page) });
      for (const shape of ["portrait", "landscape"]) {
        await ready(page, `?actions=${actions}&productMedia=${shape}`);
        const g = await geometry(page);
        check(g);
        if (shape === "portrait")
          expect(g.cards[0].retainedSourceArea).toBe(100);
        expect((await occupancy(page)).badgeOverlap).toBe(false);
        await page
          .locator('[data-product-variant="feed"]')
          .first()
          .screenshot({
            path: `${output}/screenshots/${actions}-${width}-${shape}.png`,
            style:
              'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
          });
      }
    }
    for (const width of [320, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await ready(page, `?actions=${actions}`);
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
      check(await geometry(page));
      records.push({ case: "zoom", width, actions, g: await geometry(page) });
    }
    await page.setViewportSize({ width: 768, height: 844 });
    await ready(page, `?container=360&actions=${actions}`);
    check(await geometry(page));
    expect(
      await page
        .locator("[data-product-module]")
        .first()
        .evaluate(
          (m) =>
            getComputedStyle(m.firstElementChild!).gridTemplateColumns.split(
              " ",
            ).length,
        ),
    ).toBe(1);
    await page.setViewportSize({ width: 769, height: 844 });
    await ready(page, `?actions=${actions}`);
    expect((await occupancy(page)).controls).toBe(0);
    await expect(
      page
        .locator('[data-feed-product-id="p1"]')
        .getByRole("button", { name: /Agregar .* al carrito/ }),
    ).toContainText("Agregar");
  });

for (const actions of ["separate", "split"])
  test(`${actions} commerce handlers`, async ({ page }) => {
    const fake = await boundaries(page, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page, `?view=cases&cardWidth=186&actions=${actions}`);
    const card = page.locator('[data-case="normal"]');
    await expect(
      card.getByRole("link", { name: /Contactar por WhatsApp/ }),
    ).toHaveCount(1);
    const favorite = card.getByRole("button", { name: /Guardar/ });
    await favorite.click();
    await expect(favorite).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(card.getByRole("button", { name: /Guardar/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await card.getByRole("button", { name: "Seguir", exact: true }).click();
    await page.mouse.move(0, 0);
    await expect(
      card.getByRole("button", { name: "Siguiendo", exact: true }),
    ).toBeVisible();
    expect(fake.actions.some((a) => a.name === "toggleFollow")).toBe(true);
    const popupPromise = page.waitForEvent("popup");
    await card.getByRole("link", { name: /Contactar por WhatsApp/ }).click();
    const popup = await popupPromise;
    await popup.close();
    await expect(
      card.getByRole("link", { name: /Contactar por WhatsApp/ }),
    ).toHaveAttribute("href", /text=.*Caf/);
    const cart = card.getByRole("button", { name: /Agregar .* al carrito/ });
    await cart.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton").fill("2");
    await dialog
      .getByRole("button", { name: "Agregar al carrito", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
              "casa-origen"
            ][0].cantidad,
        ),
      )
      .toBe(2);
    await page
      .locator('[data-case="variants"]')
      .getByRole("button", { name: /Elegir opciones/ })
      .click();
    await dialog.getByRole("button", { name: /Molido/ }).click();
    await expect(
      dialog.getByRole("button", { name: "Sin stock", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: /Grano/ }).click();
    await dialog.getByRole("spinbutton").fill("99");
    await expect(dialog.getByRole("spinbutton")).toHaveValue("2");
    await dialog
      .getByRole("button", { name: "Agregar al carrito", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
            "casa-origen"
          ].find((p: { id: string }) => p.id === "variants"),
        ),
      )
      .toMatchObject({ productVariantId: "v1", precio: 29000, cantidad: 2 });
    expect(fake.actions.filter((a) => a.name === "refused")).toEqual([]);
  });
test("pagination remains the actual FeedComponent", async ({ page }) => {
  const fake = await boundaries(page, false, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "?view=live");
  await expect(page.locator("[data-feed-product-id]")).toHaveCount(6);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(
      () =>
        fake.feedRequests.filter((r) => r.type === "products" && r.cursor)
          .length,
    )
    .toBe(1);
  const anchor = page.locator('[data-feed-item-key="publication-pub1"]');
  await anchor.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const before = await anchor.boundingBox();
  fake.releaseNext();
  await expect(page.locator("[data-feed-product-id]")).toHaveCount(9);
  await page.waitForTimeout(800);
  const after = await anchor.boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThanOrEqual(1);
  const ids = await page
    .locator("[data-feed-product-id]")
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-feed-product-id")),
    );
  expect(new Set(ids).size).toBe(9);
  records.push({
    case: "pagination",
    before,
    after,
    ids,
    requests: fake.feedRequests,
  });
});
