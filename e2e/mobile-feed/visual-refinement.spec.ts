import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const output = path.resolve("docs/mobile-feed-visual-refinement");
const captures = path.join(output, "screenshots");
mkdirSync(captures, { recursive: true });
const measurements: object[] = [];
const widths = [320, 390, 430];

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("h3").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(850);
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 10) / 10;
    const header = document.querySelector("header")?.getBoundingClientRect();
    const nav = document
      .querySelector('nav[aria-label="Navegación principal"]')
      ?.getBoundingClientRect();
    const upper = Math.max(0, header?.bottom || 0);
    const lower = nav && nav.top > innerHeight / 2 ? nav.top : innerHeight;
    const cards = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-product-variant], [class~="h-[480px]"], article',
      ),
    ];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      header: header?.height || 0,
      bottomNavigation: innerHeight - lower,
      usableHeight: lower - upper,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      cards: cards.map((card) => {
        const r = card.getBoundingClientRect();
        const product =
          card.hasAttribute("data-product-variant") ||
          card.classList.contains("h-[480px]");
        const kind = product
          ? "product"
          : card.textContent?.includes("Ver publicación")
            ? "publication"
            : card.textContent?.includes("Ver perfil")
              ? "business"
              : "service";
        const images = card.querySelectorAll("img");
        const mediaElement = product
          ? card.querySelector('a[href^="/producto/"] img')?.parentElement
          : kind === "publication"
            ? card.querySelector('button[aria-label="Abrir publicación"]')
                ?.firstElementChild
            : kind === "business"
              ? images[1]?.parentElement
              : images[0]?.parentElement ||
                card.querySelector('[class*="aspect-"]');
        const media = mediaElement?.getBoundingClientRect();
        const controls = [
          ...card.querySelectorAll<HTMLElement>(
            'button, a[href^="https://wa.me"], a[title="Mapa"]',
          ),
        ];
        const controlProblems = controls.flatMap((el) => {
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height) return [];
          const label = el.getAttribute("aria-label") || el.textContent;
          return b.left < r.left - 1 ||
            b.right > r.right + 1 ||
            b.bottom > r.bottom + 1 ||
            b.top < r.top - 1
            ? [{ label, problem: "outside-card" }]
            : b.width < 43.9 || b.height < 43.9
              ? [{ label, problem: "small-target" }]
              : [];
        });
        const visible = Math.max(
          0,
          Math.min(lower, r.bottom) - Math.max(upper, r.top),
        );
        return {
          kind,
          height: round(r.height),
          width: round(r.width),
          top: round(r.top + scrollY),
          mediaHeight: round(media?.height || 0),
          headerHeight: round(
            card.firstElementChild?.getBoundingClientRect().height || 0,
          ),
          visible: round(visible),
          full: r.top >= upper && r.bottom <= lower,
          controlProblems,
        };
      }),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:4401")
      return route.abort();
    if (new URL(route.request().url()).pathname.startsWith("/api/comentarios/"))
      return route.fulfill({ json: { ok: true, comentarios: [] } });
    return route.continue();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  (page as Page & { feedErrors: string[] }).feedErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { feedErrors: string[] }).feedErrors).toEqual([]);
});

test.afterAll(() => {
  writeFileSync(
    path.join(output, "measurements.json"),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), measurements },
      null,
      2,
    ),
  );
});

const versions = [
  { name: "original", url: "/before/" },
  { name: "b", url: "/refinement/b/" },
  { name: "b2", url: "/refinement/b2/" },
];

async function productDetails(page: Page) {
  return page
    .locator('[data-product-variant="feed"], [class~="h-[480px]"]')
    .first()
    .evaluate((card) => {
      const box = card.getBoundingClientRect();
      const image = card.querySelector<HTMLImageElement>(
        'a[href^="/producto/"] img:not([aria-hidden="true"])',
      )!;
      const frame = image.parentElement!.getBoundingClientRect();
      const style = getComputedStyle(image);
      const transform = new DOMMatrix(style.transform);
      const scale = transform.a;
      const fitScale =
        style.objectFit === "cover"
          ? Math.max(
              frame.width / image.naturalWidth,
              frame.height / image.naturalHeight,
            )
          : Math.min(
              frame.width / image.naturalWidth,
              frame.height / image.naturalHeight,
            );
      const renderedWidth = image.naturalWidth * fitScale * scale;
      const renderedHeight = image.naturalHeight * fitScale * scale;
      const controls = [
        ...card.querySelectorAll<HTMLElement>(
          'button, a[href^="https://wa.me/"]',
        ),
      ].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label: el.getAttribute("aria-label"),
          width: r.width,
          height: r.height,
          inside:
            r.left >= box.left - 1 &&
            r.right <= box.right + 1 &&
            r.top >= box.top - 1 &&
            r.bottom <= box.bottom + 1,
        };
      });
      const prices = [...card.querySelectorAll<HTMLElement>("span")]
        .filter((el) => !el.children.length && el.textContent?.includes("$"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: el.textContent,
            inside:
              r.left >= box.left - 1 &&
              r.right <= box.right + 1 &&
              r.bottom <= box.bottom + 1,
          };
        });
      return {
        height: box.height,
        imageHeight: frame.height,
        imageWidth: frame.width,
        viewportPercent: (box.height / innerHeight) * 100,
        shape: card.getAttribute("data-feed-image-shape"),
        objectFit: style.objectFit,
        scale,
        sourceDimensions: [image.naturalWidth, image.naturalHeight],
        retainedSourceArea:
          Math.min(1, frame.width / renderedWidth) *
          Math.min(1, frame.height / renderedHeight),
        renderedWidth,
        renderedHeight,
        controls,
        prices,
      };
    });
}

for (const width of widths) {
  test(`visual original vs B vs B2 at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const compared = [];
    for (const version of versions) {
      await open(page, version.url);
      const initial = await geometry(page);
      const product = await productDetails(page);
      expect(initial.overflow).toBe(false);
      await page.screenshot({
        path: path.join(captures, `${version.name}-${width}-initial.png`),
      });
      await page.evaluate(() => {
        const card = document.querySelector(
          '[data-product-variant="feed"], [class~="h-[480px]"]',
        )!;
        scrollTo(
          0,
          card.getBoundingClientRect().top +
            scrollY -
            document.querySelector("header")!.getBoundingClientRect().height -
            8,
        );
      });
      const aligned = await geometry(page);
      await page.screenshot({
        path: path.join(captures, `${version.name}-${width}-aligned.png`),
      });
      if (version.name === "b2") {
        expect(
          product.controls.every(
            (c) => c.inside && c.width >= 43.9 && c.height >= 43.9,
          ),
        ).toBe(true);
        expect(product.prices.every((p) => p.inside)).toBe(true);
        await page
          .locator('[data-product-variant="feed"]')
          .first()
          .screenshot({ path: path.join(captures, `b2-${width}-card.png`) });
      }
      compared.push({ version: version.name, initial, aligned, product });
    }
    expect(compared[2].product.height).toBeLessThan(
      compared[1].product.height - 50,
    );
    expect(compared[2].product.renderedHeight).toBeGreaterThan(
      compared[1].product.renderedHeight * 1.3,
    );
    expect(
      compared[2].aligned.cards.filter((c) => c.kind === "product" && c.full),
    ).toHaveLength(2);
    expect(
      compared[2].initial.cards
        .filter((c) => c.kind !== "product")
        .map((c) => c.height),
    ).toEqual(
      compared[1].initial.cards
        .filter((c) => c.kind !== "product")
        .map((c) => c.height),
    );
    measurements.push({ case: "comparison", width, compared });
  });

  for (const shape of ["portrait", "landscape"]) {
    test(`product ${shape} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const compared = [];
      for (const version of versions.slice(1)) {
        await open(page, `${version.url}?productMedia=${shape}`);
        const details = await productDetails(page);
        if (version.name === "b2") {
          expect(details.shape).toBe(shape);
          if (shape === "portrait")
            expect(details.retainedSourceArea).toBeCloseTo(1, 3);
          else expect(details.objectFit).toBe("cover");
          expect(details.controls.every((c) => c.inside)).toBe(true);
        }
        await page
          .locator('[data-product-variant="feed"]')
          .first()
          .screenshot({
            path: path.join(
              captures,
              `${version.name}-${width}-${shape}-card.png`,
            ),
          });
        compared.push({ version: version.name, details });
      }
      measurements.push({ case: "orientation", shape, width, compared });
    });
  }

  test(`long titles, prices, missing images, variants and controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 568 });
    await open(page, "/refinement/b2/?view=cases");
    const result = await geometry(page);
    expect(result.overflow).toBe(false);
    expect(result.cards.flatMap((c) => c.controlProblems)).toEqual([]);
    const title = page.locator('[data-case="long"] h3');
    expect(
      await title.evaluate(
        (el) =>
          el.getBoundingClientRect().height /
          parseFloat(getComputedStyle(el).lineHeight),
      ),
    ).toBeLessThanOrEqual(2.01);
    const longCard = page.locator(
      '[data-case="long"] [data-product-variant="feed"]',
    );
    const priceFits = await longCard.evaluate((card) => {
      const r = card.getBoundingClientRect();
      const price = [...card.querySelectorAll("span")]
        .find(
          (el) =>
            !el.children.length && el.textContent?.includes("123.456.789"),
        )!
        .getBoundingClientRect();
      return (
        price.left >= r.left &&
        price.right <= r.right &&
        price.bottom <= r.bottom
      );
    });
    expect(priceFits).toBe(true);
    await expect(
      page.locator('[data-case="failed"] img[alt="Café de origen · 250 g"]'),
    ).toHaveAttribute("src", "/imgs/placeholder_productos.png");
    await longCard.screenshot({
      path: path.join(captures, `b2-${width}-long-card.png`),
    });
    measurements.push({ case: "long-and-states", width, result });
  });
}

for (const width of [767, 768, 769, 1024, 1440]) {
  test(`scope and breakpoint regression at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const compared = [];
    for (const version of versions.slice(1)) {
      await open(page, version.url);
      const result = await geometry(page);
      expect(result.overflow).toBe(false);
      expect(result.cards.flatMap((c) => c.controlProblems)).toEqual([]);
      compared.push(result);
    }
    if (width >= 769)
      expect(
        compared[1].cards.map((c) => [c.height, c.width, c.mediaHeight]),
      ).toEqual(
        compared[0].cards.map((c) => [c.height, c.width, c.mediaHeight]),
      );
    measurements.push({ case: "breakpoint", width, compared });
  });
}

for (const variant of ["default", "business_profile"]) {
  test(`shared variant ${variant} unchanged`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const sizes = [];
    for (const version of versions.slice(1)) {
      await open(page, `${version.url}?view=cases&variant=${variant}`);
      sizes.push(
        await page
          .locator('[data-case="normal"]>div')
          .first()
          .evaluate((el) => ({
            html: el.innerHTML,
            height: el.getBoundingClientRect().height,
          })),
      );
    }
    expect(sizes[1]).toEqual(sizes[0]);
  });
}

for (const width of [320, 640]) {
  test(`zoom 200 percent at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await open(page, "/refinement/b2/?view=cases");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    const result = await geometry(page);
    expect(result.overflow).toBe(false);
    expect(result.cards.flatMap((c) => c.controlProblems)).toEqual([]);
    measurements.push({ case: "zoom", width, result });
  });
}

test("comparison contact sheets", async ({ page }) => {
  for (const width of widths) {
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;margin:0;padding:20px;background:#edf0f4}h1{font-size:21px}main{display:flex;gap:16px}section{width:${width}px;flex:none}h2{font-size:16px}img{display:block;width:${width}px}</style><h1>Myckeo · ${width} × 844 · Original / B / B2</h1><p>Mismo contenido sintético. Tarjeta inicial alineada bajo el mismo encabezado.</p><main>${versions.map((v) => `<section><h2>${v.name === "original" ? "Original" : v.name.toUpperCase()}</h2><img src="screenshots/${v.name}-${width}-aligned.png" alt="${v.name}"></section>`).join("")}</main></html>`;
    writeFileSync(path.join(output, `comparison-${width}.html`), html);
    await page.setViewportSize({ width: width * 3 + 72, height: 1005 });
    await page.goto(`/refinement/comparison-${width}.html`);
    await page.screenshot({
      path: path.join(captures, `comparison-${width}.png`),
      fullPage: true,
    });
  }
});

test("simple cart, quantities, favorites and authenticated follow keep their real client state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/refinement/b2/?view=cases&role=user");
  const card = page.locator('[data-case="normal"]');
  const favorite = card.getByRole("button", { name: /Guardar/ });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page
      .locator('[data-case="normal"]')
      .getByRole("button", { name: /Guardar/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator('[data-case="normal"]')
    .getByRole("button", { name: /Guardar/ })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("favoritesSocial")!).state.favorites
            .length,
      ),
    )
    .toBe(0);
  await card.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(
    card.getByRole("button", { name: "Siguiendo", exact: true }),
  ).toBeVisible();
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
});

test("variant selection is required; price, stock and cart line are preserved", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 932 });
  await open(page, "/refinement/b2/?view=cases");
  const card = page.locator('[data-case="variants"]');
  await expect(card).toContainText("Desde");
  await expect(card).toContainText("29.000");
  await card.getByRole("button", { name: /Elegir opciones/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Elegir opcion", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("carro_negocios")),
  ).toBeNull();
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
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
            "casa-origen"
          ][0],
      ),
    )
    .toMatchObject({
      id: "variants",
      productVariantId: "v1",
      precio: 29000,
      cantidad: 2,
    });
});

test("sold out, single variant, detail links and contact destinations", async ({
  page,
}) => {
  await open(page, "/refinement/b2/?view=cases");
  for (const name of ["sold-out", "variants-sold-out"]) {
    await expect(
      page
        .locator(`[data-case="${name}"]`)
        .getByRole("button", { name: /agotado/ }),
    ).toBeDisabled();
    await expect(page.locator(`[data-case="${name}"]`).getByText("Agotado", { exact: true }).first()).toBeVisible();
  }
  const single = page.locator('[data-case="single-variant"]');
  await expect(single).toContainText("Grano");
  await single.getByRole("button", { name: /Agregar .* al carrito/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Seleccion actual");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.locator('[data-case="normal"] a[href="/producto/cafe-origen"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-case="normal"] a[href^="https://wa.me/"]'),
  ).toHaveAttribute("href", /text=.*Caf/);
  await expect(
    page.locator('[data-case="business"] a[title="Mapa"]'),
  ).toHaveAttribute("href", "https://maps.google.com/");
  await expect(
    page.locator('[data-case="service-no-price"]'),
  ).not.toContainText("$");
  await expect(page.locator('[data-case="service-video"]')).toContainText(
    "Video en el perfil",
  );
  await expect(page.locator('[data-case="service-video"] button')).toHaveCount(
    0,
  );
});
