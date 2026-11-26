import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, ready } from "./browser.cjs";
import snapshot from "../../docs/audits/centered-feed-evidence/comparison-sample.json";
import { initialData } from "../../src/seed/seed";

const folder = "docs/audits/mobile-premium-v1-evidence";
const nav = (page: Page) => page.locator("[data-mobile-bottom]");
const keys = (page: Page) =>
  page
    .locator("[data-feed-item-key]")
    .evaluateAll((es) => es.map((e) => e.getAttribute("data-feed-item-key")!));

test("shell, stable navigation, categories and document clearance at all breakpoints", async ({
  page,
}) => {
  test.setTimeout(360000);
  const errors = await setup(page);
  const records = [];
  for (const width of [320, 360, 390, 430, 768, 769, 1440]) {
    console.log("Checking shell at", width);
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    const ids = await keys(page);
    expect(ids.slice().sort()).toEqual(
      snapshot.items.map((i) => `${i.type}-${i.id}`).sort(),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    if (width <= 768) {
      const header = (await page
        .locator("[data-mobile-navigation] header")
        .boundingBox())!;
      expect(header.height).toBe(64);
      await expect(nav(page).locator("a,button")).toHaveCount(6);
      const buttons = await nav(page)
        .locator("a,button")
        .evaluateAll((es) =>
          es.map((e) => {
            const r = e.getBoundingClientRect();
            return { width: r.width, height: r.height };
          }),
        );
      buttons.forEach((b) => {
        expect(b.width).toBeGreaterThanOrEqual(44);
        expect(b.height).toBeGreaterThanOrEqual(44);
      });
      const entry = page.locator('[class*="businessRail"] a');
      await expect(entry).toBeVisible();
      await expect(entry).toHaveAttribute(
        "href",
        "/config/completePerfil?negocio=1",
      );
      await page.evaluate(() => scrollTo(0, 950));
      expect(
        (await page.locator("[data-mobile-navigation] header").boundingBox())!
          .y,
      ).toBe(0);
      expect((await entry.boundingBox())!.y).toBeLessThan(0);
      await expect(
        nav(page).getByRole("link", { name: "Inicio", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await page
        .getByRole("button", { name: "Mostrar categorías", exact: true })
        .click();
      const categories = page.getByRole("navigation", {
        name: "Categorías",
        exact: true,
      });
      const links = categories.getByRole("link");
      await expect(links).toHaveCount(18);
      expect(
        await links.evaluateAll((es) =>
          es.map((e) => e.getAttribute("href")).sort(),
        ),
      ).toEqual(
        initialData.categorias
          .filter((c) => c.isActive)
          .map((c) => "/category/" + c.slug)
          .sort(),
      );
      await links.last().focus();
      const last = (await links.last().boundingBox())!;
      expect(last.y).toBeGreaterThanOrEqual(64);
      expect(last.y + last.height).toBeLessThanOrEqual(836);
      await page
        .getByRole("button", { name: "Ocultar categorías", exact: true })
        .click();
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      const footer = (await page.locator("footer").boundingBox())!,
        bottom = (await nav(page).boundingBox())!;
      expect(footer.y + footer.height).toBeLessThanOrEqual(bottom.y - 7);
      records.push({ width, header, buttons, last, footer, bottom });
    } else {
      await expect(nav(page)).toHaveCount(0);
      if (width === 1440) {
        const main = (await page
          .locator("[data-desktop-tier]")
          .first()
          .locator('[class*="main"]')
          .first()
          .boundingBox())!;
        expect(main.width).toBe(680);
        expect(main.x + 340).toBe(720);
        await page.evaluate(() => scrollTo(0, 950));
        expect(
          (await page.locator("[data-discovery-navigation]").boundingBox())!.y,
        ).toBe(88);
      }
    }
  }
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/shell-categories.json`,
    JSON.stringify(records, null, 2),
  );
});

test("commerce keeps independent 44px actions, product variants, cart badges and pending dialog on append", async ({
  page,
}) => {
  const errors = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await ready(page, "/?scenario=balanced&append=1");
  const card = page.locator("[data-feed-product-id]").first();
  const controls = await card.evaluate((el) => {
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const whatsapp = [...el.querySelectorAll('a[href^="https://wa.me/"]')].find(
      (e) => e.getBoundingClientRect().width > 0,
    )!;
    const cart = [...el.querySelectorAll("button")].find(
      (e) =>
        /Elegir opciones/.test(e.getAttribute("aria-label") || "") &&
        e.getBoundingClientRect().width > 0,
    )!;
    const price = el.querySelector('[class*="priceBlock"]')!,
      avatar = el.querySelector('[class*="avatarPhoto"]')!,
      badge = el.querySelector('[class*="avatarIcon"]')!;
    return {
      whatsapp: box(whatsapp),
      cart: box(cart),
      price: box(price),
      avatar: box(avatar),
      badge: box(badge),
      href: whatsapp.getAttribute("href"),
    };
  });
  for (const action of [controls.whatsapp, controls.cart]) {
    expect(action.width).toBe(44);
    expect(action.height).toBe(44);
  }
  expect(Math.abs(controls.whatsapp.y - controls.cart.y)).toBeLessThan(1);
  expect(controls.price.y).toBeLessThan(controls.cart.y + 44);
  expect(controls.price.y + controls.price.height).toBeGreaterThan(
    controls.cart.y,
  );
  expect(controls.avatar.x + controls.avatar.width).toBeGreaterThan(
    controls.badge.x,
  );
  expect(controls.href).toMatch(/^https:\/\/wa\.me\/57/);
  const url = page.url();
  const favorite = card.getByRole("button", {
    name: /^Guardar .* en favoritos/,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  expect(page.url()).toBe(url);
  await expect(
    nav(page).getByRole("link", {
      name: "Favoritos, 1 guardados",
      exact: true,
    }),
  ).toBeVisible();
  const action = card
    .getByRole("button", { name: /Elegir opciones/ })
    .filter({ visible: true });
  await action.click();
  const dialog = page.getByRole("dialog", {
    name: "Configura tu pedido",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Pequeña/ }).click();
  await page.evaluate(() =>
    (window as unknown as { __centeredAppend: () => void }).__centeredAppend(),
  );
  await expect(page.locator("[data-feed-item-key]")).toHaveCount(
    snapshot.items.length,
  );
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  await expect(
    dialog.getByRole("spinbutton", { name: "Cantidad del producto" }),
  ).toHaveValue("1");
  await dialog
    .getByRole("spinbutton", { name: "Cantidad del producto" })
    .focus();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 470,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  const confirm = dialog.getByRole("button", {
    name: "Agregar al carrito",
    exact: true,
  });
  await confirm.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const b = (await confirm.boundingBox())!;
      return b.y >= 0 && b.y + b.height <= 470;
    })
    .toBe(true);
  await page.screenshot({ path: `${folder}/after-keyboard-cart-390.png` });
  await page.evaluate(() => {
    delete (window.visualViewport! as unknown as { height?: number }).height;
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await dialog
    .getByRole("button", { name: "Aumentar cantidad", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Agregar al carrito", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    nav(page).getByRole("link", { name: "Carro, 2 productos", exact: true }),
  ).toHaveAttribute("href", "/carro");
  await card.getByRole("button", { name: /^Seguir a/ }).click();
  await expect(
    page.getByText("Inicia sesión para interactuar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(new Set(await keys(page)).size).toBe(snapshot.items.length);
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/commerce-actions.json`,
    JSON.stringify(
      {
        controls,
        unique: true,
        appended: snapshot.items.length,
        cartCount: 2,
        errors,
      },
      null,
      2,
    ),
  );
});

test("content tabs return to the same inventory; images fit square, wide and portrait frames", async ({
  page,
}) => {
  const errors = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await ready(page);
  const original = (await keys(page)).sort();
  for (const [name, type] of [
    ["Productos", "product"],
    ["Negocios", "business"],
    ["Publicaciones", "publication"],
    ["Servicios", "service"],
  ]) {
    const tab = page.getByRole("button", {
      name: "Cambiar a pestaña " + name,
      exact: true,
    });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => (await keys(page)).length)
      .toBe(snapshot.items.filter((i) => i.type === type).length);
    expect((await keys(page)).every((key) => key.startsWith(type + "-"))).toBe(
      true,
    );
  }
  await page
    .getByRole("button", { name: "Cambiar a pestaña Para ti", exact: true })
    .click();
  await expect.poll(async () => (await keys(page)).sort()).toEqual(original);
  const images = page.locator("[data-feed-product-id] picture img");
  const photographs = [];
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(async (el) => {
      await (el as HTMLImageElement).decode();
    });
    photographs.push(
      await img.evaluate((el) => {
        const image = el as HTMLImageElement;
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          fit: getComputedStyle(image).objectFit,
          transform: getComputedStyle(image).transform,
          source: image.currentSrc,
        };
      }),
    );
  }
  photographs.forEach((photo) => {
    expect(photo.fit).toBe("contain");
    expect(photo.transform).toBe("none");
    expect(photo.source).toContain("c_limit");
  });
  expect(photographs.some((p) => p.width === p.height)).toBe(true);
  expect(photographs.some((p) => p.width > p.height)).toBe(true);
  // Explicit geometry probe, not an invented public product photograph.
  await page.route("**/portrait-probe.svg", (route) =>
    route.fulfill({
      path: "public/__feed-implementation-art/portrait.svg",
      contentType: "image/svg+xml",
    }),
  );
  const first = images.first();
  await first.evaluate(async (el) => {
    const image = el as HTMLImageElement;
    image.parentElement!.querySelector("source")!.remove();
    image.removeAttribute("srcset");
    image.src = "/portrait-probe.svg";
    await image.decode();
  });
  const portrait = await first.evaluate((el) => {
    const image = el as HTMLImageElement;
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      fit: getComputedStyle(image).objectFit,
      transform: getComputedStyle(image).transform,
    };
  });
  expect(portrait.height).toBeGreaterThan(portrait.width);
  expect(portrait.fit).toBe("contain");
  expect(portrait.transform).toBe("none");
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/tabs-photographs.json`,
    JSON.stringify(
      { original, photographs, portraitGeometryProbe: portrait, errors },
      null,
      2,
    ),
  );
});

test("sessions retain help, create, business and profile with predictable slots", async ({
  browser,
}) => {
  const records = [];
  for (const session of ["anonymous", "personal", "owner", "incomplete"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = await setup(page, session);
    await ready(page);
    await expect(nav(page).locator("a,button")).toHaveCount(6);
    const positions = await nav(page)
      .locator("a,button")
      .evaluateAll((es) =>
        es.map((e) => ({
          text: e.textContent!.trim(),
          href: e.getAttribute("href"),
          x: e.getBoundingClientRect().x,
          width: e.getBoundingClientRect().width,
        })),
      );
    if (session === "personal" || session === "incomplete") {
      await nav(page)
        .getByRole("button", { name: "Crear", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "¿Qué deseas crear?",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      expect(
        await dialog
          .getByRole("link")
          .evaluateAll((es) => es.map((e) => e.getAttribute("href"))),
      ).toEqual([
        "/dashboard/crear-publicacion",
        "/dashboard/servicios",
        "/dashboard/productos/nuevo_producto",
        "/dashboard/orders",
        "/dashboard/transacciones",
        "/dashboard/encuestas",
        "/dashboard/reservas",
      ]);
      await page.getByRole("button", { name: "Cerrar Crear" }).click();
    } else
      await expect(
        nav(page).getByRole("link", {
          name: session === "owner" ? "Mi negocio" : "Tengo un negocio",
          exact: true,
        }),
      ).toHaveAttribute(
        "href",
        session === "owner" ? "/dashboard" : "/config/completePerfil?negocio=1",
      );
    const popup = page.waitForEvent("popup");
    await nav(page)
      .getByRole("button", { name: "Ayuda por WhatsApp", exact: true })
      .click();
    const help = await popup;
    expect(help.url()).toContain("wa.me/573132492256");
    await help.close();
    await nav(page)
      .getByRole("button", { name: "Perfil", exact: true })
      .click();
    await expect(
      page
        .getByRole("presentation")
        .filter({
          hasText: session === "anonymous" ? "Ingresar" : "Cerrar sesión",
        })
        .last(),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
    records.push({ session, positions, errors });
    await context.close();
  }
  for (let i = 1; i < records.length; i++)
    expect(records[i].positions.map((p) => [p.x, p.width])).toEqual(
      records[0].positions.map((p) => [p.x, p.width]),
    );
  // The browser session is a presentation fixture, not a signed server cookie.
  // Assert the existing onboarding guard requests its destination, not a fake server login.
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  await setup(page, "placeholder");
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto("/");
  await expect
    .poll(
      () => requested.some((url) => url.includes("/dashboard/editar-perfil")),
      { timeout: 60000 },
    )
    .toBe(true);
  await context.close();
  writeFileSync(`${folder}/sessions.json`, JSON.stringify(records, null, 2));
});

test("search, city, virtual viewport, safe areas and accessible publication dialog", async ({
  page,
}) => {
  const errors = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await ready(page);
  await page
    .locator('[class*="shell"]')
    .first()
    .evaluate((el) => {
      (el as HTMLElement).style.setProperty("--myckeo-safe-top", "24px");
      (el as HTMLElement).style.setProperty("--myckeo-safe-bottom", "20px");
    });
  expect(
    (await page.locator("[data-mobile-navigation] header").boundingBox())!
      .height,
  ).toBe(88);
  expect((await nav(page).boundingBox())!.height).toBe(84);
  await page
    .getByRole("button", { name: "Abrir búsqueda", exact: true })
    .click();
  const search = page.getByRole("dialog", { name: "Buscar en Myckeo" });
  await expect(search).toBeVisible();
  await search.getByRole("combobox").fill("salchipapa");
  await expect(search.getByRole("option")).toHaveCount(1);
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      value: 470,
    });
    Object.defineProperty(viewport, "offsetTop", {
      configurable: true,
      value: 20,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => (await search.boundingBox())!.height)
    .toBeLessThanOrEqual(470);
  await page.screenshot({ path: `${folder}/after-keyboard-search-390.png` });
  await search.getByRole("button", { name: "Cerrar búsqueda" }).click();
  await expect(
    page.getByRole("button", { name: "Abrir búsqueda", exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    delete (viewport as unknown as { height?: number }).height;
    delete (viewport as unknown as { offsetTop?: number }).offsetTop;
    viewport.dispatchEvent(new Event("resize"));
  });
  await page.getByRole("button", { name: /Cambiar ubicación:/ }).click();
  const city = page.getByRole("dialog", {
    name: "Actualizar Ubicación",
    exact: true,
  });
  await expect(
    city.getByRole("button", { name: "Cerrar ubicación" }),
  ).toBeVisible();
  expect(
    (await city
      .getByRole("button", { name: "Cerrar ubicación" })
      .boundingBox())!.width,
  ).toBe(44);
  await page.keyboard.press("Escape");
  await expect(city).toHaveCount(0);
  const publication = page.locator(
    '[data-feed-item-key="publication-cmf1vtl2l000043hsthjz3ep6"]',
  );
  const read = publication.getByRole("button", {
    name: "Leer texto completo",
    exact: true,
  });
  await read.click();
  await expect(
    publication.getByRole("button", { name: "Mostrar menos", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await publication
    .getByRole("button", { name: "Ver publicación", exact: true })
    .click();
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("button", { name: "Cerrar modal", exact: true }),
  });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", {
    name: "Cerrar modal",
    exact: true,
  });
  await expect
    .poll(async () => Math.round((await close.boundingBox())!.width))
    .toBe(44);
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    publication.getByRole("button", { name: "Ver publicación", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/keyboard-dialogs.json`,
    JSON.stringify(
      {
        safeTop: 24,
        safeBottom: 20,
        visualViewportHeight: 470,
        focusRestored: true,
        errors,
      },
      null,
      2,
    ),
  );
});

test("existing coordinator: completeness, geography, city and distinct empty/loading/error/end states", async ({
  page,
}) => {
  const errors = await setup(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await ready(page, "/?view=live");
  const drain = async () => {
    for (let i = 0; i < 60; i++) {
      if (await page.locator("[data-mobile-feed-complete]").count()) return;
      await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
    }
    throw Error("Continuation did not finish");
  };
  await drain();
  const tunja = await keys(page);
  expect(tunja).toHaveLength(69);
  expect(new Set(tunja).size).toBe(69);
  const groups = await page.locator("[data-feed-item-key]").evaluateAll((es) =>
    ["-local-", "-dept-", "-national-"].map((tier) => {
      const elements = es.filter((e) =>
        e.getAttribute("data-feed-item-key")!.includes(tier),
      );
      return {
        tier,
        top: Math.min(...elements.map((e) => e.getBoundingClientRect().top)),
        bottom: Math.max(
          ...elements.map((e) => e.getBoundingClientRect().bottom),
        ),
      };
    }),
  );
  for (let i = 1; i < groups.length; i++)
    expect(groups[i].top).toBeGreaterThanOrEqual(groups[i - 1].bottom);
  await page.getByRole("button", { name: /Cambiar ubicación:/ }).click();
  let selects = page.getByRole("combobox").filter({ visible: true });
  await selects.nth((await selects.count()) - 2).click();
  await page.getByRole("option", { name: "Cundinamarca", exact: true }).click();
  selects = page.getByRole("combobox").filter({ visible: true });
  await selects.nth((await selects.count()) - 1).click();
  await page.getByRole("option", { name: "Bogotá", exact: true }).click();
  await page
    .getByRole("button", { name: "Actualizar Ubicación", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Cambiar ubicación: Bogotá/ }),
  ).toBeVisible();
  await drain();
  const bogota = await keys(page);
  expect(bogota).toHaveLength(69);
  expect(new Set(bogota).size).toBe(69);
  for (const state of ["empty", "loading", "pending-types", "error"]) {
    await page.goto("/?scenario=sparse&state=" + state);
    await expect(page.locator("[data-mobile-feed]")).toBeVisible();
    await expect(page.locator("[data-mobile-feed-complete]")).toHaveCount(0);
    if (state === "empty")
      await expect(
        page.getByText("Aun no encontramos contenido ideal para ti", {
          exact: false,
        }),
      ).toBeVisible();
    if (state === "loading")
      await expect(page.locator(".animate-pulse")).toHaveCount(8);
    if (state === "error")
      await expect(page.locator("[data-feed-unresolved]")).toBeVisible();
  }
  await ready(page, "/?scenario=sparse");
  await expect(page.locator("[data-mobile-feed-complete]")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "No hay más para ti", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  writeFileSync(
    `${folder}/continuation-states.json`,
    JSON.stringify({ tunja, bogota, groups, errors }, null, 2),
  );
});
