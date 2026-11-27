import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
const { browserDataset } = require("./data.cjs");
const evidence = "docs/audits/geography-pagination-evidence";
const releases = new Set<() => void>();
test.afterEach(() => {
  releases.forEach((release) => release());
  releases.clear();
});
type RecordPage = {
  city: string;
  type: string;
  cursor: boolean;
  ids: string[];
  seenIds: string[];
  nextTier?: number;
};
async function setup(page: Page, hold = false) {
  const records: RecordPage[] = [];
  const requests: RecordPage[] = [];
  let held = false;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  releases.add(release);
  await page
    .context()
    .addCookies([
      { name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(() =>
    localStorage.setItem(
      "preferences-storage",
      JSON.stringify({
        state: {
          ciudad: "Tunja",
          departamento: "Boyacá",
          preferencias: [],
          secciones: [],
          seenIds: [],
          userLat: null,
          userLong: null,
        },
        version: 0,
      }),
    ),
  );
  await page.context().route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin !== "http://127.0.0.1:3400") return route.abort();
    if (url.pathname === "/api/auth/session")
      return route.fulfill({ json: null });
    if (req.method() === "POST") {
      let args;
      try {
        args = JSON.parse(req.postData() || "null", (_key, value) =>
          value === "$undefined" ? undefined : value,
        );
      } catch {}
      if (
        !req.headers()["next-action"] ||
        !["products", "publications", "services", "businesses"].includes(
          args?.[0],
        )
      )
        return route.abort();
      requests.push({
        city: args[1].ciudad,
        type: args[0],
        cursor: !!args[1].cursor,
        seenIds: args[1].seenIds,
        ids: [],
      });
      // Delay an actual response, without substituting the action or its data.
      if (
        hold &&
        !held &&
        args[0] === "products" &&
        args[1].ciudad === "Tunja" &&
        args[1].cursor
      ) {
        held = true;
        const response = await route.fetch();
        await gate;
        return route.fulfill({ response });
      }
      return route.continue();
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
    return route.continue();
  });
  page.on("response", async (res) => {
    try {
      if (
        res.request().method() !== "POST" ||
        !res.headers()["content-type"]?.includes("text/x-component")
      )
        return;
      const args = JSON.parse(res.request().postData()!, (_key, value) =>
        value === "$undefined" ? undefined : value,
      );
      for (const line of (await res.text()).split("\n")) {
        try {
          const value = JSON.parse(
            line.slice(line.indexOf(":") + 1),
            (_key, value) => (value === "$undefined" ? undefined : value),
          );
          if (Array.isArray(value?.items))
            records.push({
              city: args[1].ciudad,
              type: args[0],
              cursor: !!args[1].cursor,
              seenIds: args[1].seenIds,
              ids: value.items.map((item: { id: string }) => item.id),
              nextTier: value.nextTier,
            });
        } catch {}
      }
    } catch {}
  });
  return { records, requests, release, isHeld: () => held };
}
async function changeCity(page: Page, dept: string, city: string) {
  await page.getByRole("button", { name: /Cambiar ubicación/ }).click();
  // Existing MUI selectors do not associate their visible labels with the input.
  const selects = page.getByRole("combobox");
  const visible = selects.filter({ visible: true });
  // Header search is also a combobox; location selects are the final two.
  await visible.nth((await visible.count()) - 2).click();
  await page.getByRole("option", { name: dept, exact: true }).click();
  const current = page.getByRole("combobox").filter({ visible: true });
  await current.nth((await current.count()) - 1).click();
  await page.getByRole("option", { name: city, exact: true }).click();
  await page
    .getByRole("button", { name: "Actualizar Ubicación", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: new RegExp(`Cambiar ubicación: ${city}`),
    }),
  ).toBeVisible();
}
async function ids(page: Page) {
  return page
    .locator("[data-feed-item-key]")
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-feed-item-key")!),
    );
}
async function drain(page: Page, records: RecordPage[], tab = "para ti") {
  for (let i = 0; i < 35; i++) {
    if (await page.getByText(`No hay más ${tab}.`, { exact: true }).count())
      break;
    const count = records.length;
    await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
    await expect
      .poll(
        async () =>
          records.length > count ||
          (await page
            .getByText(`No hay más ${tab}.`, { exact: true })
            .count()) > 0,
        { timeout: 30000 },
      )
      .toBe(true);
  }
  await expect(
    page.getByText(`No hay más ${tab}.`, { exact: true }),
  ).toBeVisible();
}
function expectedKeys(category = false, initial: RecordPage[] = []) {
  const types: Record<string, string> = {
    products: "product",
    publications: "publication",
    services: "service",
    businesses: "business",
  };
  const prefixes: Record<string, string> = {
    products: "product-",
    publications: "pub-",
    services: "serv-",
    businesses: "bus-",
  };
  return Object.entries(browserDataset()).flatMap(([type, rows]) => {
    const seen =
      initial.find((r) => r.type === type && !r.cursor)?.seenIds || [];
    return (rows as { id: string }[])
      .filter(
        (row) =>
          !/-hidden|-unavailable/.test(row.id) &&
          (!category || !row.id.endsWith("wrong-category")) &&
          !seen.includes(prefixes[type] + row.id),
      )
      .map((row) => `${types[type]}-${row.id}`);
  });
}
function assertTierOrder(keys: string[], city = "Tunja") {
  const tiers = keys.map((key) =>
    city === "Tunja"
      ? key.includes("-local-")
        ? 0
        : key.includes("-dept-")
          ? 1
          : 2
      : key.includes("-national-")
        ? 0
        : 2,
  );
  expect(tiers).toEqual([...tiers].sort());
  expect(new Set(keys).size).toBe(keys.length);
}

test("real actions: multiple pages, global priority, new city and delayed old response", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, true);
  await page.goto("/?view=live");
  await expect(page.locator("[data-feed-product-id]").first()).toBeVisible({
    timeout: 60000,
  });
  await expect
    .poll(
      () =>
        state.requests.filter((r) => r.city === "Tunja" && !r.cursor).length,
    )
    .toBe(4);
  console.log("geo: four initial pages loaded");
  expect((await ids(page)).every((key) => key.includes("-local-"))).toBe(true);
  for (let i = 0; i < 5 && !state.isHeld(); i++) {
    const count = state.records.length;
    await page.locator("[data-feed-sentinel]").scrollIntoViewIfNeeded();
    await expect
      .poll(() => state.isHeld() || state.records.length > count)
      .toBe(true);
  }
  expect(state.isHeld()).toBe(true);
  console.log("geo: actual continuation held");
  await changeCity(page, "Cundinamarca", "Bogotá");
  console.log("geo: city changed through existing selector");
  await expect(page.locator("[data-feed-item-key]")).toHaveCount(0);
  // Next's client action queue serializes these reads; release the old actual
  // response after selecting the new city, before waiting for the queued reads.
  state.release();
  await expect
    .poll(() => state.records.some((r) => r.city === "Bogotá"))
    .toBe(true);
  await drain(page, state.records);
  const keys = await ids(page);
  assertTierOrder(keys, "Bogotá");
  expect([...keys].sort()).toEqual(
    expectedKeys(
      false,
      state.requests.filter((r) => r.city === "Bogotá"),
    ).sort(),
  );
  expect(state.records.some((r) => r.city === "Bogotá" && r.cursor)).toBe(true);
  await page.screenshot({
    path: `${evidence}/city-changed-390.png`,
    fullPage: true,
  });
  writeFileSync(
    `${evidence}/browser-real-actions.json`,
    JSON.stringify(
      {
        requests: state.requests,
        records: state.records,
        keys,
        oldResponseReleased: true,
      },
      null,
      2,
    ),
  );
});

test("category filter: all local pages then expansion, exclusions and final page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const state = await setup(page);
  await page.goto("/category/comida");
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible({
    timeout: 60000,
  });
  await drain(page, state.records, "productos");
  const productKeys = await ids(page);
  assertTierOrder(productKeys);
  expect(productKeys).toHaveLength(33);
  expect(
    productKeys.every(
      (key) =>
        key.startsWith("product-") &&
        !/wrong-category|hidden|unavailable/.test(key),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Cambiar a pestaña Para ti", exact: true })
    .click();
  await drain(page, state.records);
  const keys = await ids(page);
  assertTierOrder(keys);
  // Switching tabs retains the existing "seen" policy: products already loaded
  // in Productos are intentionally excluded from the new Para ti traversal.
  expect([...keys].sort()).toEqual(
    expectedKeys(true)
      .filter((key) => !productKeys.includes(key))
      .sort(),
  );
  await page.screenshot({
    path: `${evidence}/category-comida-1440.png`,
    fullPage: true,
  });
  writeFileSync(
    `${evidence}/browser-category.json`,
    JSON.stringify({ records: state.records, productKeys, keys }, null, 2),
  );
});

test("geographic masonry groups preserve mobile commerce and visual order at four widths", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const state = await setup(page);
  const measurements = [];
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/category/comida");
    await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();
    await drain(page, state.records, "productos");
    const keys = await ids(page);
    assertTierOrder(keys);
    expect(keys).toHaveLength(33);
    // Existing entrance animations and masonry relayout run after pagination.
    // Measure their settled geometry rather than an intermediate transform.
    await expect
      .poll(async () => {
        const b = await page
          .locator("[data-feed-item-key]")
          .evaluateAll((els) =>
            els.map((el) => ({
              key: el.getAttribute("data-feed-item-key")!,
              top: el.getBoundingClientRect().top,
              bottom: el.getBoundingClientRect().bottom,
            })),
          );
        return (
          Math.min(
            ...b.filter((x) => !x.key.includes("-local-")).map((x) => x.top),
          ) -
          Math.max(
            ...b.filter((x) => x.key.includes("-local-")).map((x) => x.bottom),
          )
        );
      })
      .toBeGreaterThanOrEqual(0);
    const boxes = await page
      .locator("[data-feed-item-key]")
      .evaluateAll((els) =>
        els.map((el) => ({
          key: el.getAttribute("data-feed-item-key")!,
          top: el.getBoundingClientRect().top,
          bottom: el.getBoundingClientRect().bottom,
        })),
      );
    const localBottom = Math.max(
      ...boxes.filter((b) => b.key.includes("-local-")).map((b) => b.bottom),
    );
    const externalTop = Math.min(
      ...boxes.filter((b) => !b.key.includes("-local-")).map((b) => b.top),
    );
    expect(externalTop).toBeGreaterThanOrEqual(localBottom);
    const card = page.locator("[data-feed-product-id]").first();
    await card.scrollIntoViewIfNeeded();
    await card
      .locator("img")
      .evaluateAll((imgs) =>
        Promise.all(
          imgs
            .filter((img) => img.getBoundingClientRect().width > 0)
            .map((img) => (img as HTMLImageElement).decode().catch(() => {})),
        ),
      );
    const geometry = await card.evaluate((el) => {
      const wa = el
        .querySelector('a[href^="https://wa.me/"]')!
        .getBoundingClientRect();
      const cart = [...el.querySelectorAll("button")]
        .find((b) =>
          /Agregar .* al carrito/.test(b.getAttribute("aria-label") || ""),
        )!
        .getBoundingClientRect();
      const price = el
        .querySelector('[class*="priceBlock"]')!
        .getBoundingClientRect();
      const photo = el
        .querySelector('[class*="avatarPhoto"]')!
        .getBoundingClientRect();
      const badge = el
        .querySelector('[class*="avatarIcon"]')!
        .getBoundingClientRect();
      return {
        sameRow:
          Math.abs(wa.top - cart.top) < 12 &&
          price.bottom > wa.top &&
          price.top < wa.bottom,
        waHeight: wa.height,
        cartHeight: cart.height,
        badgeOverAvatar:
          Math.min(photo.right, badge.right) >
            Math.max(photo.left, badge.left) &&
          Math.min(photo.bottom, badge.bottom) > Math.max(photo.top, badge.top),
      };
    });
    expect(geometry.sameRow).toBe(true);
    expect(geometry.waHeight).toBe(44);
    expect(geometry.cartHeight).toBe(44);
    if (width < 768) expect(geometry.badgeOverAvatar).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${evidence}/geography-layout-${width}.png`,
    });
    measurements.push({ width, localBottom, externalTop, ...geometry });
  }
  writeFileSync(
    `${evidence}/geography-layout.json`,
    JSON.stringify(measurements, null, 2),
  );
});
