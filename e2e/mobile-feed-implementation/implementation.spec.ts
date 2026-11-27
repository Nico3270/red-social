import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { boundaries, ready } from "./boundaries";
import { geometry } from "./geometry";

const output = "docs/mobile-feed-b3-c2";
const measurements: object[] = [];
const widths = [320, 360, 390, 430, 768, 1024, 1440];
const baseline = JSON.parse(
  readFileSync(`${output}/b2-measurements.json`, "utf8"),
);
test.afterAll(() => {
  if (measurements.length)
    writeFileSync(
      `${output}/measurements.json`,
      JSON.stringify({ measurements }, null, 2),
    );
});

function check(result: Awaited<ReturnType<typeof geometry>>) {
  expect(result.overflow).toBe(false);
  for (const c of result.cards.filter((c) => c.product)) {
    expect(c.priceFits, `${c.label} price`).toBe(true);
    for (const control of c.controls) {
      expect(control.width).toBeGreaterThanOrEqual(43.9);
      expect(control.height).toBeGreaterThanOrEqual(43.9);
      expect(control.inside, `${c.label}: ${control.label}`).toBe(true);
      expect(control.nestedInteractive).toBe(false);
      expect(control.hit, `${c.label}: obscured ${control.label}`).toBe(true);
    }
  }
}
async function moduleDetails(page: Page) {
  return page.locator("[data-product-module]").evaluateAll((modules) =>
    modules.map((module) => {
      const grid = module.firstElementChild!;
      return {
        width: parseFloat(getComputedStyle(module).width),
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        count: grid.children.length,
        children: [...grid.children].map((el) => ({
          top: el.getBoundingClientRect().top,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
      };
    }),
  );
}
for (const width of widths) {
  test(`implemented feed and single B3 at ${width}px`, async ({ page }) => {
    const fakes = await boundaries(page);
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    const initial = await geometry(page);
    check(initial);
    await page.screenshot({
      path: `${output}/screenshots/implemented-${width}-initial.png`,
    });
    await page.evaluate(() => {
      const c = document.querySelector('[data-product-variant="feed"]')!;
      scrollTo(
        0,
        c.getBoundingClientRect().top +
          scrollY -
          (document.querySelector("header")?.getBoundingClientRect().bottom ||
            0) -
          8,
      );
    });
    const aligned = await geometry(page);
    check(aligned);
    await page.screenshot({
      path: `${output}/screenshots/implemented-${width}-aligned.png`,
    });
    const modules = await moduleDetails(page);
    expect(modules[0].columns).toBe(width >= 390 ? 2 : 1);
    expect(modules.every((m) => m.count > 0)).toBe(true);
    if (width >= 390)
      expect(modules[0].children[2].width).toBeGreaterThanOrEqual(
        modules[0].children[0].width,
      );
    const ids = await page
      .locator("[data-feed-item-key]")
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-feed-item-key")),
      );
    expect(ids).toEqual([
      "product-p1",
      "product-p2",
      "product-p3",
      "publication-pub1",
      "product-p4",
      "product-p5",
      "business-b1",
      "product-p6",
      "service-s1",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    const old = baseline.measurements.find(
      (r: { width: number }) => r.width === width,
    );
    expect(
      aligned.cards.filter((c) => !c.product).map((c) => [c.width, c.height]),
    ).toEqual(
      old.aligned.cards
        .filter((c: { product: boolean }) => !c.product)
        .map((c: { width: number; height: number }) => [c.width, c.height]),
    );
    await ready(page, "?one=1");
    const single = await geometry(page);
    check(single);
    expect(single.cards[0].width).toBeLessThanOrEqual(480);
    await page
      .locator('[data-product-variant="feed"]')
      .first()
      .screenshot({
        path: `${output}/screenshots/b3-${width}-card.png`,
        style:
          'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
      });
    measurements.push({
      case: "responsive",
      width,
      initial,
      aligned,
      modules,
      single: single.cards[0],
      ids,
    });
    expect(fakes.actions.filter((a) => a.name === "refused")).toEqual([]);
  });
}

for (const width of [320, 390, 430]) {
  test(`long prices, stock, variants and orientations at ${width}px`, async ({
    page,
  }) => {
    await boundaries(page);
    await page.setViewportSize({ width, height: 568 });
    for (const cardWidth of [undefined, 186]) {
      await ready(
        page,
        `?view=cases${cardWidth ? `&cardWidth=${cardWidth}` : ""}`,
      );
      const result = await geometry(page);
      check(result);
      for (const name of ["sold-out", "variants-sold-out"]) {
        await expect(
          page
            .locator(`[data-case="${name}"]`)
            .getByRole("button", { name: /agotado/ }),
        ).toBeDisabled();
        await expect(
          page
            .locator(`[data-case="${name}"]`)
            .getByText("Agotado", { exact: true })
            .first(),
        ).toBeVisible();
      }
      await expect(page.locator('[data-case="variants"]')).toContainText(
        "Desde",
      );
      await expect(page.locator('[data-case="single-variant"]')).toContainText(
        "Grano",
      );
      await page.locator('[data-case="failed"]').scrollIntoViewIfNeeded();
      await expect(
        page.locator('[data-case="failed"] img[alt="Café de origen · 250 g"]'),
      ).toHaveAttribute("src", /placeholder_productos/);
      for (const name of ["long", "missing", "variants"])
        await page
          .locator(`[data-case="${name}"] [data-product-variant]`)
          .screenshot({
            path: `${output}/screenshots/implemented-${width}-${cardWidth || "full"}-${name}.png`,
            style:
              'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
          });
      measurements.push({ case: "states", width, cardWidth, result });
    }
    for (const shape of ["portrait", "landscape"]) {
      await ready(page, `?productMedia=${shape}`);
      const result = await geometry(page);
      check(result);
      if (shape === "portrait")
        expect(result.cards[0].retainedSourceArea).toBe(100);
      await page
        .locator("[data-product-variant]")
        .first()
        .screenshot({
          path: `${output}/screenshots/implemented-${width}-${shape}.png`,
          style:
            'header,nav[aria-label="Navegación principal"]{visibility:hidden!important}',
        });
      measurements.push({
        case: "orientation",
        width,
        shape,
        result: result.cards[0],
      });
    }
  });
}

test("real handlers: cart, variants, favorites, follow, WhatsApp and social modal", async ({
  page,
}) => {
  const fakes = await boundaries(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "?view=cases&cardWidth=186");
  const card = page.locator('[data-case="normal"]');
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
  await expect
    .poll(() => fakes.actions.filter((a) => a.name === "toggleFollow").length)
    .toBe(1);
  const popupPromise = page.waitForEvent("popup");
  await card.locator('a[href^="https://wa.me/"]').click();
  const popup = await popupPromise;
  await popup.close();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.locator('a[href^="https://wa.me/"]')).toHaveAttribute(
    "href",
    /text=.*Caf/,
  );
  await expect(card.locator('a[href="/producto/cafe-origen"]')).toHaveCount(2);
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
          ][0].cantidad,
      ),
    )
    .toBe(2);
  await expect(dialog).toHaveCount(0);
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
  await card.getByRole("button", { name: /Agregar .* al carrito/ }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await ready(page, "?media=video");
  await page
    .getByRole("button", { name: "Abrir publicación", exact: true })
    .click();
  const video = page.locator("#modal-root video");
  await expect(video).toHaveAttribute("preload", "metadata");
  await expect(video).toHaveAttribute("controls", "");
  expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
  await page.getByRole("button", { name: "Cerrar modal", exact: true }).click();
  expect(fakes.actions.filter((a) => a.name === "refused")).toEqual([]);
});

test("container width, zoom, empty modules and shared variants", async ({
  page,
}) => {
  await boundaries(page);
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 568 });
    await ready(page);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    const result = await geometry(page);
    check(result);
    const modules = await moduleDetails(page);
    expect(modules.every((m) => m.columns === (m.width >= 382 ? 2 : 1))).toBe(
      true,
    );
    measurements.push({ case: "zoom", width, result, modules });
  }
  await page.setViewportSize({ width: 1440, height: 844 });
  await ready(page, "?container=360");
  check(await geometry(page));
  expect((await moduleDetails(page))[0].columns).toBe(1);
  await ready(page, "?odd=1");
  expect(await page.locator("[data-feed-product-id]").count()).toBe(5);
  expect((await moduleDetails(page)).every((m) => m.count > 0)).toBe(true);
  await page.goto("/?empty=1");
  await expect(page.locator("[data-product-module]")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const variant of ["default", "business_profile"]) {
    await page.goto(`/?view=cases&variant=${variant}`);
    await page.locator('[data-case="normal"] h3').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const snapshot = await page
      .locator('[data-case="normal"]>[data-product-variant]')
      .evaluate((el) => ({
        html: el.innerHTML,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }));
    expect(snapshot).toEqual(baseline.shared[variant]);
  }
});

test("actual FeedComponent pagination, deduplication and scroll anchor", async ({
  page,
}) => {
  const fakes = await boundaries(page, false, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "?view=live");
  await expect(page.locator("[data-feed-product-id]")).toHaveCount(6);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(
      () =>
        fakes.feedRequests.filter((r) => r.type === "products" && r.cursor)
          .length,
    )
    .toBe(1);
  const anchor = page.locator('[data-feed-item-key="publication-pub1"]');
  await anchor.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const before = await anchor.boundingBox();
  const beforeScroll = await page.evaluate(() => scrollY);
  fakes.releaseNext();
  await expect(page.locator("[data-feed-product-id]")).toHaveCount(9);
  await page.waitForTimeout(800);
  const after = await anchor.boundingBox();
  const afterScroll = await page.evaluate(() => scrollY);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  const ids = await page
    .locator("[data-feed-product-id]")
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-feed-product-id")),
    );
  expect(new Set(ids).size).toBe(9);
  expect(ids.filter((id) => id === "p6")).toHaveLength(1);
  expect((await moduleDetails(page)).every((m) => m.count > 0)).toBe(true);
  check(await geometry(page));
  measurements.push({
    case: "pagination",
    before,
    after,
    beforeScroll,
    afterScroll,
    ids,
    requests: fakes.feedRequests,
  });
  await page.screenshot({
    path: `${output}/screenshots/live-pagination-after.png`,
  });
  expect(fakes.actions.filter((a) => a.name === "refused")).toEqual([]);
});
