import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const output = path.resolve("docs/mobile-feed-variants");
const captures = path.join(output, "screenshots");
mkdirSync(captures, { recursive: true });
const measurements: object[] = [];
const designs = ["b2", "b3", "b4", "c1", "c2"];
const widths = [320, 390, 430, 768];

async function open(page: Page, design: string, query = "") {
  await page.goto(`/?design=${design}${query}`);
  await page.locator('[data-product-variant="feed"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const header = document.querySelector("header")?.getBoundingClientRect();
    const nav = document
      .querySelector('nav[aria-label="Navegación principal"]')
      ?.getBoundingClientRect();
    const upper = Math.max(0, header?.bottom || 0);
    const lower = nav && nav.top > innerHeight / 2 ? nav.top : innerHeight;
    const cards = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-product-variant="feed"], article',
      ),
    ].map((card) => {
      const rect = card.getBoundingClientRect();
      const product = card.hasAttribute("data-product-variant");
      const title = card.querySelector("h3")?.getBoundingClientRect();
      const priceEl = [...card.querySelectorAll<HTMLElement>("span")].find(
        (el) => !el.children.length && el.textContent?.includes("$"),
      );
      const price = priceEl?.getBoundingClientRect();
      const image = card.querySelector<HTMLImageElement>(
        'a[href^="/producto/"] img:not([aria-hidden="true"])',
      );
      const media = image?.parentElement?.getBoundingClientRect();
      const overlay = card
        .querySelector<HTMLElement>("[data-product-overlay]")
        ?.getBoundingClientRect();
      const controls = [
        ...card.querySelectorAll<HTMLElement>(
          'button, a[href^="https://wa.me/"]',
        ),
      ]
        .filter((el) => el.getBoundingClientRect().width)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const center = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          const inViewport = r.top >= upper && r.bottom <= lower;
          return {
            label: el.getAttribute("aria-label"),
            width: round(r.width),
            height: round(r.height),
            inside:
              r.left >= rect.left - 1 &&
              r.right <= rect.right + 1 &&
              r.top >= rect.top - 1 &&
              r.bottom <= rect.bottom + 1,
            hit:
              !inViewport || center === el || (!!center && el.contains(center)),
            nestedInteractive: !!el.parentElement?.closest("a,button"),
          };
        });
      const imageStyle = image && getComputedStyle(image);
      const scale = imageStyle ? new DOMMatrix(imageStyle.transform).a : 1;
      const fitScale =
        image && media
          ? (imageStyle?.objectFit === "cover" ? Math.max : Math.min)(
              media.width / image.naturalWidth,
              media.height / image.naturalHeight,
            )
          : 0;
      const retained =
        image && media
          ? Math.min(1, media.width / (image.naturalWidth * fitScale * scale)) *
            Math.min(1, media.height / (image.naturalHeight * fitScale * scale))
          : 0;
      const visible = Math.max(
        0,
        Math.min(lower, rect.bottom) - Math.max(upper, rect.top),
      );
      const priceFits =
        !price ||
        (price.left >= rect.left &&
          price.right <= rect.right &&
          price.bottom <= rect.bottom &&
          priceEl!.scrollWidth <= priceEl!.clientWidth + 1);
      return {
        product,
        label: card.querySelector("h3")?.textContent,
        width: round(rect.width),
        height: round(rect.height),
        top: round(rect.top + scrollY),
        left: round(rect.left),
        viewportPercent: round((rect.height / innerHeight) * 100),
        usablePercent: round((rect.height / (lower - upper)) * 100),
        mediaWidth: round(media?.width || 0),
        mediaHeight: round(media?.height || 0),
        imageShare: round(((media?.height || 0) / rect.height) * 100),
        retainedSourceArea: round(retained * 100),
        imageFit: imageStyle?.objectFit,
        source: image ? [image.naturalWidth, image.naturalHeight] : [],
        overlayAreaPercent: round(
          media && overlay
            ? ((overlay.width * overlay.height) /
                (media.width * media.height)) *
                100
            : 0,
        ),
        full: rect.top >= upper && rect.bottom <= lower,
        visible: round(visible),
        identifiable:
          !!title &&
          !!price &&
          title.top >= upper &&
          title.bottom <= lower &&
          price.top >= upper &&
          price.bottom <= lower,
        titleHeight: round(title?.height || 0),
        priceFits,
        controls,
      };
    });
    const products = cards.filter((c) => c.product);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      header: header?.height || 0,
      bottomNavigation: innerHeight - lower,
      usableHeight: lower - upper,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      fullProducts: products.filter((c) => c.full).length,
      partialProducts: products.filter((c) => c.visible > 0 && !c.full).length,
      identifiableProducts: products.filter((c) => c.identifiable).length,
      firstPublicationTop: (() => {
        const article = document
          .querySelector('button[aria-label="Abrir publicación"]')
          ?.closest("article");
        return article ? article.getBoundingClientRect().top + scrollY : null;
      })(),
      cards,
    };
  });
}

function checkCards(result: Awaited<ReturnType<typeof geometry>>) {
  expect(result.overflow).toBe(false);
  for (const c of result.cards.filter((c) => c.product)) {
    expect(c.priceFits, `${c.label}: price`).toBe(true);
    for (const control of c.controls) {
      expect(control.width).toBeGreaterThanOrEqual(43.9);
      expect(control.height).toBeGreaterThanOrEqual(43.9);
      expect(control.inside, `${c.label}: ${control.label}`).toBe(true);
      expect(control.nestedInteractive).toBe(false);
      expect(control.hit, `${c.label}: obscured ${control.label}`).toBe(true);
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:4402") return route.abort();
    if (url.pathname.startsWith("/api/comentarios/"))
      return route.fulfill({ json: { ok: true, comentarios: [] } });
    return route.continue();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  (page as Page & { feedErrors: string[] }).feedErrors = errors;
});
test.afterEach(async ({ page }) =>
  expect((page as Page & { feedErrors: string[] }).feedErrors).toEqual([]),
);
test.afterAll(
  () =>
    measurements.length &&
    writeFileSync(
      path.join(output, "measurements.json"),
      JSON.stringify(
        { capturedAt: new Date().toISOString(), measurements },
        null,
        2,
      ),
    ),
);

for (const width of widths) {
  test(`visual comparison at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const compared: {
      design: string;
      initial: Awaited<ReturnType<typeof geometry>>;
      aligned: Awaited<ReturnType<typeof geometry>>;
    }[] = [];
    for (const design of designs) {
      await open(page, design);
      const initial = await geometry(page);
      checkCards(initial);
      await page.screenshot({
        path: path.join(captures, `${design}-${width}-initial.png`),
      });
      await page.evaluate(() => {
        const c = document.querySelector('[data-product-variant="feed"]')!;
        scrollTo(
          0,
          c.getBoundingClientRect().top +
            scrollY -
            document.querySelector("header")!.getBoundingClientRect().height -
            8,
        );
      });
      const aligned = await geometry(page);
      checkCards(aligned);
      if (design === "b2") expect(aligned.cards[0].overlayAreaPercent).toBe(0);
      else expect(aligned.cards[0].overlayAreaPercent).toBeGreaterThan(0);
      await page.screenshot({
        path: path.join(captures, `${design}-${width}-aligned.png`),
      });
      await page
        .locator('[data-product-variant="feed"]')
        .first()
        .screenshot({
          path: path.join(captures, `${design}-${width}-card.png`),
        });
      if (width === 390)
        await page.screenshot({
          path: path.join(captures, `${design}-${width}-full.png`),
          fullPage: true,
        });
      compared.push({ design, initial, aligned });
    }
    expect(compared[1].aligned.cards[0].height).toBeLessThan(
      compared[0].aligned.cards[0].height,
    );
    if (width === 320)
      expect(compared[3].aligned.cards[0].width).toEqual(
        compared[1].aligned.cards[0].width,
      );
    else
      expect(compared[3].aligned.cards[0].width).toBeLessThan(
        compared[1].aligned.cards[0].width / 1.9,
      );
    // C2 preserves mixed feed order, unlike the explicitly catalogue-only C1 prototype.
    expect(compared[4].aligned.cards.map((c) => c.label)).toEqual(
      compared[0].aligned.cards.map((c) => c.label),
    );
    compared
      .slice(1)
      .forEach((c) =>
        expect(
          c.aligned.cards
            .filter((c) => !c.product)
            .map((c) => [c.width, c.height]),
        ).toEqual(
          compared[0].aligned.cards
            .filter((c) => !c.product)
            .map((c) => [c.width, c.height]),
        ),
      );
    measurements.push({ case: "comparison", width, compared });
  });
}

for (const width of [320, 390, 430]) {
  test(`long text, states, portrait and landscape at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 568 });
    for (const design of designs) {
      await open(page, design, "&view=cases");
      const result = await geometry(page);
      checkCards(result);
      const long = page.locator('[data-case="long"] [data-product-variant]');
      await long.screenshot({
        path: path.join(captures, `${design}-${width}-long.png`),
      });
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
      await expect(
        page.locator('[data-case="failed"] img[alt="Café de origen · 250 g"]'),
      ).toHaveAttribute("src", "/imgs/placeholder_productos.png");
      measurements.push({ case: "states", width, design, result });
      for (const shape of ["portrait", "landscape"]) {
        await open(page, design, `&productMedia=${shape}`);
        const g = await geometry(page);
        checkCards(g);
        if (shape === "portrait")
          expect(g.cards[0].retainedSourceArea).toBe(100);
        await page
          .locator("[data-product-variant]")
          .first()
          .screenshot({
            path: path.join(captures, `${design}-${width}-${shape}.png`),
            style:
              'header, nav[aria-label="Navegación principal"] { visibility: hidden !important; }',
          });
        measurements.push({
          case: "orientation",
          width,
          design,
          shape,
          result: g.cards[0],
        });
      }
    }
  });
}

for (const design of designs) {
  test(`${design}: original actions, variants and detail links`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, design, "&view=cases&role=user");
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
    await expect(card.locator('a[href="/producto/cafe-origen"]')).toHaveCount(
      2,
    );
    const whatsapp = card.locator('a[href^="https://wa.me/"]');
    await expect(whatsapp).toHaveAttribute("href", /text=.*Caf/);
    const popupPromise = page.waitForEvent("popup");
    await whatsapp.click();
    const popup = await popupPromise;
    await popup.close();
    await expect(page.getByRole("dialog")).toHaveCount(0);
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
    const variants = page.locator('[data-case="variants"]');
    await expect(variants).toContainText("Desde");
    await variants.getByRole("button", { name: /Elegir opciones/ }).click();
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
        page.evaluate(() =>
          JSON.parse(localStorage.getItem("carro_negocios")!).state.carts[
            "casa-origen"
          ].find((p: { id: string }) => p.id === "variants"),
        ),
      )
      .toMatchObject({ productVariantId: "v1", precio: 29000, cantidad: 2 });
    await expect(dialog).toHaveCount(0);
    await page
      .locator('[data-case="single-variant"]')
      .getByRole("button", { name: /Agregar .* al carrito/ })
      .click();
    await expect(dialog).toContainText("Seleccion actual");
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    // Keyboard reaches the overlay independently of the underlying detail link.
    await card.getByRole("button", { name: /Agregar .* al carrito/ }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page
      .locator('[data-case="publication"]')
      .getByRole("button", { name: "Abrir publicación", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cerrar modal", exact: true }),
    ).toBeVisible();
  });
}

test("low viewport and 200% zoom reflow", async ({ page }) => {
  for (const design of designs)
    for (const width of [320, 640]) {
      await page.setViewportSize({ width, height: 568 });
      await open(page, design, "&view=cases");
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
      const result = await geometry(page);
      checkCards(result);
      measurements.push({ case: "zoom", width, design, result });
    }
});

test("social video remains manual and other cards keep their presentation", async ({
  page,
}) => {
  const html: string[][] = [];
  for (const design of designs) {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, design, "&view=cases&media=video");
    const social = page.locator('[data-case="publication"]');
    await expect(social.locator("video")).toHaveCount(0);
    await expect(social).toContainText("Ver video");
    await social
      .getByRole("button", { name: "Abrir publicación", exact: true })
      .click();
    const video = page.locator("#modal-root video").first();
    await expect(video).toBeVisible();
    expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(
      false,
    );
    await expect(video).toHaveAttribute("preload", "metadata");
    await expect(video).toHaveAttribute("controls", "");
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    html.push(
      await page
        .locator(
          '[data-case="business"], [data-case="service"], [data-case="service-no-price"]',
        )
        .evaluateAll((els) => els.map((el) => el.innerHTML)),
    );
    await expect(
      page.locator('[data-case="service-no-price"]'),
    ).not.toContainText("$");
  }
  html.slice(1).forEach((h) => expect(h).toEqual(html[0]));
});

test("production source files remain unchanged", () => {
  const before = JSON.parse(
    readFileSync(path.join(output, "source-state-before.json"), "utf8"),
  );
  for (const [file, sha] of Object.entries(before))
    expect(
      createHash("sha256").update(readFileSync(file)).digest("hex"),
      file,
    ).toBe(sha);
});

test("B2 matches the frozen reference; shared product variants retain their appearance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const variant of ["feed", "default", "business_profile"]) {
    const snapshots: {
      html: string;
      width: number;
      height: number;
      styles: string[][];
    }[] = [];
    for (const url of [
      `/baseline/?view=cases&variant=${variant}`,
      `/?view=cases&variant=${variant}&design=b2`,
      `/?view=cases&variant=${variant}&design=b3`,
    ]) {
      if (variant === "feed" && url.endsWith("design=b3")) continue;
      await page.goto(url);
      const card = page
        .locator('[data-case="normal"] > [data-product-variant]')
        .first();
      await card.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      snapshots.push(
        await card.evaluate((el) => {
          // CSS module identifiers are independently minified in the two bundles.
          // Compare semantic DOM and computed presentation, not generated class names.
          const clone = el.cloneNode(true) as HTMLElement;
          [clone, ...clone.querySelectorAll("*")].forEach((node) =>
            node.removeAttribute("class"),
          );
          const properties = [
            "display",
            "width",
            "height",
            "padding",
            "margin",
            "font-size",
            "font-weight",
            "line-height",
            "color",
            "background-color",
            "border-radius",
            "object-fit",
            "transform",
          ];
          return {
            html: clone.innerHTML,
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
            styles: [el, ...el.querySelectorAll("*")].map((node) => {
              const style = getComputedStyle(node);
              return properties.map((p) => style.getPropertyValue(p));
            }),
          };
        }),
      );
    }
    snapshots.slice(1).forEach((s) => expect(s).toEqual(snapshots[0]));
  }
});

test("comparison sheets", async ({ page }) => {
  for (const width of widths) {
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{font:16px Arial;margin:0;padding:20px;background:#edf0f4}h1{font-size:21px}main{display:flex;gap:16px}section{width:${width}px;flex:none}h2{font-size:16px}img{display:block;width:${width}px}</style><h1>Myckeo · ${width} × 844 · B2 / B3 / B4 / C1 / C2</h1><p>Mismo contenido sintético. Primera tarjeta alineada bajo el mismo encabezado. C1 agrupa productos solo en el prototipo de catálogo.</p><main>${designs.map((d) => `<section><h2>${d.toUpperCase()}</h2><img src="screenshots/${d}-${width}-aligned.png" alt="${d}"></section>`).join("")}</main></html>`;
    writeFileSync(path.join(output, `comparison-${width}.html`), html);
    await page.setViewportSize({ width: width * 5 + 104, height: 1010 });
    await page.setContent(
      html.replaceAll(
        'src="screenshots/',
        'src="http://127.0.0.1:4402/review/screenshots/',
      ),
    );
    await page.locator("img").evaluateAll((imgs) =>
      Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if ((img as HTMLImageElement).complete) resolve();
              else
                img.addEventListener("load", () => resolve(), { once: true });
            }),
        ),
      ),
    );
    await page.screenshot({
      path: path.join(captures, `comparison-${width}.png`),
      fullPage: true,
    });
  }
});
