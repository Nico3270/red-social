import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const output = path.resolve("docs/mobile-feed-compact");
const captures = path.join(output, "screenshots");
mkdirSync(captures, { recursive: true });
const measurements: object[] = [];
const widths = [320, 360, 390, 430, 767, 768, 769, 1024, 1440];

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

for (const width of widths) {
  test(`before/after feed and long cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const pair = [];
    for (const mode of ["before", "after"]) {
      await open(page, `/${mode}/`);
      const initial = await geometry(page);
      expect(initial.overflow).toBe(false);
      if (mode === "after")
        expect(initial.cards.flatMap((card) => card.controlProblems)).toEqual(
          [],
        );
      if ([320, 390, 430, 768, 1440].includes(width)) {
        await page.screenshot({
          path: path.join(captures, `${mode}-${width}-initial.png`),
        });
        await page.screenshot({
          path: path.join(captures, `${mode}-${width}-full.png`),
          fullPage: true,
        });
      }
      await page.evaluate(() => {
        const card = document.querySelector(
          '[data-product-variant], [class~="h-[480px]"]',
        )!;
        window.scrollTo(
          0,
          card.getBoundingClientRect().top +
            scrollY -
            document.querySelector("header")!.getBoundingClientRect().height -
            8,
        );
      });
      const aligned = await geometry(page);
      if ([390, 430].includes(width))
        await page.screenshot({
          path: path.join(captures, `${mode}-${width}-aligned.png`),
        });
      pair.push({ mode, initial, aligned });
    }
    expect(pair[1].initial.cards.map((card) => card.kind)).toEqual(
      pair[0].initial.cards.map((card) => card.kind),
    );
    expect(pair[1].initial.cards[0].height).toBeLessThan(
      pair[0].initial.cards[0].height,
    );
    expect(pair[1].initial.cards[0].top).toBeLessThan(
      pair[0].initial.cards[0].top,
    );
    measurements.push({ case: "feed", width, pair });

    await open(page, "/after/?view=cases");
    const cases = await geometry(page);
    expect(cases.overflow).toBe(false);
    expect(cases.cards.flatMap((card) => card.controlProblems)).toEqual([]);
    const title = page.locator('[data-case="long"] h3');
    expect(
      await title.evaluate(
        (el) =>
          el.getBoundingClientRect().height /
          parseFloat(getComputedStyle(el).lineHeight),
      ),
    ).toBeLessThanOrEqual(2.01);
    await expect(page.locator('[data-case="long"]')).toContainText(
      "123.456.789",
    );
    await expect(
      page.locator('[data-case="missing"] img[alt="Café de origen · 250 g"]'),
    ).toHaveAttribute("src", "/imgs/placeholder_productos.png");
    await expect(
      page.locator('[data-case="failed"] img[alt="Café de origen · 250 g"]'),
    ).toHaveAttribute("src", "/imgs/placeholder_productos.png");
    if ([320, 390].includes(width))
      await page.screenshot({
        path: path.join(captures, `after-${width}-cases.png`),
        fullPage: true,
      });
    measurements.push({ case: "long-and-states", width, geometry: cases });
  });
}

test("simple cart, quantities, favorites and authenticated follow keep their real client state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/after/?view=cases&role=user");
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
  await open(page, "/after/?view=cases");
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
  await open(page, "/after/?view=cases");
  for (const name of ["sold-out", "variants-sold-out"])
    await expect(
      page
        .locator(`[data-case="${name}"]`)
        .getByRole("button", { name: /agotado/ }),
    ).toBeDisabled();
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

for (const media of ["portrait", "square", "video", "none"]) {
  test(`publication ${media}, review and modal entry remain accessible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, `/after/?view=cases&media=${media}`);
    await expect(page.locator("video[autoplay]")).toHaveCount(0);
    const publication = page.locator('[data-case="publication"]');
    if (media === "portrait") {
      const ratio = await publication
        .locator('[aria-label="Abrir publicación"]>div')
        .evaluate((el) => el.clientWidth / el.clientHeight);
      expect(ratio).toBeCloseTo(0.8, 1);
    }
    await expect(page.locator('[data-case="review"]')).toContainText("4.5");
    await expect(publication).toContainText("24");
    await expect(publication).toContainText("6");
    await publication
      .getByRole("button", { name: "Ver publicación", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cerrar modal", exact: true }),
    ).toBeVisible();
    if (media === "video") {
      const video = page.locator("#modal-root video");
      await expect(video).toHaveAttribute("preload", "metadata");
      await expect(video).toHaveAttribute("controls", "");
      await expect(video).not.toHaveAttribute("autoplay");
      await expect
        .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
        .toBeGreaterThanOrEqual(1);
      expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(
        true,
      );
      await video.evaluate((el: HTMLVideoElement) => el.play());
      await expect
        .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
        .toBeGreaterThan(0);
      await video.evaluate((el: HTMLVideoElement) => el.pause());
    }
    await page
      .getByRole("button", { name: "Cerrar modal", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cerrar modal", exact: true }),
    ).toHaveCount(0);
    const measured = await geometry(page);
    expect(measured.overflow).toBe(false);
    measurements.push({ case: "media", media, geometry: measured });
  });
}

test("publication modal retains reactions and comments with synthetic action responses", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/after/?view=cases&role=user");
  await page
    .locator('[data-case="publication"]')
    .getByRole("button", { name: "Ver publicación", exact: true })
    .click();
  const modal = page.locator("#modal-root");
  await modal.getByRole("button", { name: "Me gusta", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Quitar me gusta", exact: true }),
  ).toBeVisible();
  await modal
    .getByRole("textbox", { name: "Escribe un comentario", exact: true })
    .fill("Comentario sintético de prueba");
  await modal
    .getByRole("button", { name: "Enviar comentario", exact: true })
    .click();
  await expect(modal).toContainText("Comentario sintético de prueba");
  await page.getByRole("button", { name: "Cerrar modal", exact: true }).click();
});

test("anonymous follow still offers login", async ({ page }) => {
  await open(page, "/after/?view=cases");
  await page
    .locator('[data-case="normal"]')
    .getByRole("button", { name: "Seguir", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inicia sesión para interactuar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
});

test("short viewport: cart confirmation is scrollable and reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page, "/after/?view=cases");
  await page
    .locator('[data-case="variants"]')
    .getByRole("button", { name: /Elegir opciones/ })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Grano/ }).click();
  await dialog
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
            "casa-origen"
          ][0].productVariantId,
      ),
    )
    .toBe("v1");
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(captures, "after-320-low.png") });
});

for (const width of [320, 640]) {
  test(`200 percent CSS zoom at physical width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await open(page, "/after/?view=cases&media=portrait");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    const measured = await geometry(page);
    expect(measured.overflow).toBe(false);
    expect(measured.cards.flatMap((card) => card.controlProblems)).toEqual([]);
    measurements.push({ case: "zoom", width, zoom: 2, geometry: measured });
    await page.screenshot({
      path: path.join(captures, `after-${width}-zoom-200.png`),
      fullPage: true,
    });
  });
}

for (const variant of ["default", "business_profile"]) {
  test(`shared product ${variant} keeps its previous geometry`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const sizes = [];
    for (const mode of ["before", "after"]) {
      await open(page, `/${mode}/?view=cases&variant=${variant}`);
      sizes.push(
        await page
          .locator('[data-case="normal"]>div')
          .first()
          .evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              width: r.width,
              height: r.height,
              image: el
                .querySelector('img[alt="Café de origen · 250 g"]')!
                .getBoundingClientRect().height,
            };
          }),
      );
    }
    expect(sizes[1]).toEqual(sizes[0]);
    measurements.push({ case: "shared-variant", variant, sizes });
  });
}

test("full feed at 200 percent CSS zoom with a 320px effective layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 844 });
  await open(page, "/after/");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const measured = await geometry(page);
  expect(measured.overflow).toBe(false);
  expect(measured.cards.flatMap((card) => card.controlProblems)).toEqual([]);
  measurements.push({ case: "full-feed-zoom", geometry: measured });
  await page.screenshot({
    path: path.join(captures, "after-full-feed-zoom-200.png"),
  });
});

test("review comparison screenshots", async ({ page }) => {
  for (const width of [390, 430]) {
    const markup = `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;background:#edf0f4;padding:20px;margin:0}main{display:flex;gap:20px}h1{font-size:20px}section{width:${width}px}h2{font-size:16px}img{display:block;width:${width}px}</style><h1>Myckeo · ${width} × 844 · antes / después</h1><p>Componentes reales con contenido sintético. Primera tarjeta alineada bajo el encabezado.</p><main><section><h2>Antes</h2><img src="screenshots/before-${width}-aligned.png" alt="Antes"></section><section><h2>Feed compacto premium</h2><img src="screenshots/after-${width}-aligned.png" alt="Después"></section></main></html>`;
    writeFileSync(path.join(output, `comparison-${width}.html`), markup);
    await page.setViewportSize({ width: width * 2 + 60, height: 1010 });
    await page.goto(`/comparison-${width}.html`);
    await expect(page.locator("img")).toHaveCount(2);
    await page.screenshot({
      path: path.join(captures, `comparison-${width}.png`),
      fullPage: true,
    });
  }
});

test("feed tabs and category context remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page, "/after/?category=1");
  await expect(
    page.getByRole("heading", { name: "Comida", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cambiar a pestaña Productos", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Cambiar a pestaña Productos",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article")).toHaveCount(0);
  await expect(page.locator('[data-product-variant="feed"]')).toHaveCount(3);
});
