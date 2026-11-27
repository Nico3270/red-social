import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import {
  setup,
  openRoot,
  settled,
  geometry,
} from "../mobile-feed-avatar-follow-overlay/geometry";
import { mockData } from "../mobile-feed-final-correction/browser";
const out = "docs/mobile-feed-avatar-follow-badge-refined",
  phase = process.env.BADGE_BEFORE === "1" ? "before" : "after";
async function indicator(page: Page) {
  return page
    .locator('[data-feed-product-id="p1"] [data-avatar-follow]')
    .evaluate((button) => {
      const p = getComputedStyle(button, "::before"),
        glyph = button.querySelector<HTMLElement>("[data-avatar-indicator]")!,
        svg = glyph.querySelector("svg")!,
        photo = button.querySelector<HTMLElement>("[data-avatar-image]")!;
      const b = button.getBoundingClientRect(),
        g = glyph.getBoundingClientRect(),
        s = svg.getBoundingClientRect(),
        a = photo.getBoundingClientRect();
      const hit = (x: number, y: number) =>
        document.elementFromPoint(x, y)?.closest("[data-avatar-follow]") ===
        button;
      return {
        target: { width: b.width, height: b.height },
        avatar: {
          width: a.width,
          height: a.height,
          x: a.x - b.x,
          y: a.y - b.y,
        },
        badge: {
          width: parseFloat(p.width),
          height: parseFloat(p.height),
          left: parseFloat(p.left),
          top: parseFloat(p.top),
          border: p.borderTopWidth,
          background: p.backgroundColor,
          shadow: p.boxShadow,
        },
        glyph: {
          width: g.width,
          height: g.height,
          left: g.x - b.x,
          top: g.y - b.y,
          svgWidth: s.width,
          svgHeight: s.height,
        },
        avatarHit: hit(a.x + a.width / 2, a.y + a.height / 2),
        badgeHit: hit(
          b.x + parseFloat(p.left) + parseFloat(p.width) / 2,
          b.y + parseFloat(p.top) + parseFloat(p.height) / 2,
        ),
      };
    });
}
async function show(page: Page, id = "p1") {
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
  return card;
}
for (const width of [320, 390, 430, 768, 769, 1024])
  test(`${phase} focused geometry ${width}`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: width <= 768 ? 844 : 900 });
    await openRoot(page);
    await page.evaluate(() => scrollTo(0, 100));
    await settled(page);
    const cards = await geometry(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
    ).toBe(false);
    for (const c of cards) {
      expect(c.collisions).toEqual([]);
      for (const b of c.controls) {
        expect(b.hit).toBe(true);
        expect(b.nested).toBe(false);
      }
    }
    const screenshot = await page.screenshot({
      path: `${out}/screenshots/${phase}-${width}.png`,
      animations: "disabled",
    });
    let desktopPixels: number | null = null;
    if (phase === "after") {
      const before = JSON.parse(
        readFileSync(`${out}/before-${width}.json`, "utf8"),
      );
      // The control's small painted circle is the only geometry allowed to change.
      expect(
        cards.map((c) => [
          c.id,
          c.root,
          c.header,
          c.photo,
          c.name,
          c.price,
          c.title,
          c.border,
          c.shadow,
          c.controls.map((b) => [b.label, b.box]),
        ]),
      ).toEqual(
        before.cards.map((c: (typeof cards)[number]) => [
          c.id,
          c.root,
          c.header,
          c.photo,
          c.name,
          c.price,
          c.title,
          c.border,
          c.shadow,
          c.controls.map((b) => [b.label, b.box]),
        ]),
      );
      if (width <= 768) {
        for (const c of cards) {
          expect(c.overlay!.badge.width).toBe(14);
          expect(c.overlay!.badge.height).toBe(14);
          expect(c.overlay!.overlapFraction).toBeGreaterThan(0.45);
          expect(c.overlay!.overlapFraction).toBeLessThan(0.55);
          expect(c.overlay!.photoHit).toBe(true);
          expect(c.overlay!.badgeHit).toBe(true);
        }
      } else {
        const a = await sharp(
            readFileSync(`${out}/screenshots/before-${width}.png`),
          )
            .raw()
            .toBuffer(),
          b = await sharp(screenshot).raw().toBuffer();
        expect(b.length).toBe(a.length);
        desktopPixels = 0;
        for (let i = 0; i < a.length; i += 3)
          if (!a.subarray(i, i + 3).equals(b.subarray(i, i + 3)))
            desktopPixels++;
        expect(desktopPixels).toBe(0);
      }
    }
    writeFileSync(
      `${out}/${phase}-${width}.json`,
      JSON.stringify({ width, cards, desktopPixels }, null, 2),
    );
  });

test.describe("native 4x closeups and keyboard", () => {
  test.use({ deviceScaleFactor: 4 });
  test(`${phase} plus, check and proportional spinner preserve the 44px target`, async ({
    page,
  }) => {
    const fake = await setup(page, true);
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let toggles = 0;
    await page.route("**/*", async (route) => {
      const r = route.request();
      if (r.method() === "POST" && r.headers()["next-action"]) {
        let arg;
        try {
          arg = JSON.parse(r.postData() || "[]")[0];
        } catch {}
        if (
          arg &&
          typeof arg === "object" &&
          "followedId" in arg &&
          !("followerId" in arg)
        ) {
          toggles++;
          await gate;
        }
      }
      return route.fallback();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await openRoot(page);
    const card = await show(page),
      button = card.locator("[data-avatar-follow]");
    const records = [];
    for (const state of ["idle", "pending", "following"]) {
      if (state === "pending") {
        await button.focus();
        await page.keyboard.press("Enter");
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute("aria-busy", "true");
      }
      if (state === "following") {
        release();
        await expect(button).toBeEnabled();
      }
      await expect(button).toHaveAttribute("data-follow-state", state);
      const measurement = await indicator(page);
      expect(measurement.target).toEqual({ width: 44, height: 44 });
      expect(measurement.avatar.width).toBe(24);
      expect(measurement.avatar.height).toBe(24);
      expect(measurement.avatarHit).toBe(true);
      expect(measurement.badgeHit).toBe(true);
      if (phase === "after") {
        expect(measurement.badge.width).toBe(14);
        expect(measurement.badge.border).toBe("1px");
        expect(measurement.glyph.width).toBe(9);
        expect(measurement.glyph.svgWidth).toBe(9);
        expect(measurement.glyph.svgHeight).toBe(9);
      }
      await expect(button).toHaveAccessibleName(
        state === "idle"
          ? "Seguir a Casa Origen"
          : "Dejar de seguir a Casa Origen",
      );
      const name =
        state === "idle" ? "plus" : state === "following" ? "check" : "spinner";
      await button.screenshot({
        path: `${out}/screenshots/${phase}-${name}-enlarged.png`,
        scale: "device",
        animations: "disabled",
      });
      records.push({ state, ...measurement });
    }
    await button.focus();
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("data-follow-state", "idle");
    await expect(button).toBeEnabled();
    expect(toggles).toBe(2);
    expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(
      2,
    );
    await expect(page).toHaveURL("http://127.0.0.1:3000/");
    writeFileSync(
      `${out}/${phase}-states.json`,
      JSON.stringify(records, null, 2),
    );
  });
});

test("focused fallback, long name and exact tap destinations", async ({
  page,
}) => {
  test.skip(phase === "before");
  await mockData(
    page,
    true,
    (p) => ({
      ...p,
      nombreNegocio: "Cooperativa de Productores Artesanales de Bogotá",
      negocioFotoPerfil: "",
    }),
    100,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const records = [];
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const card = await show(page);
    const button = card.locator("[data-avatar-follow]"),
      image = button.locator("[data-avatar-image] img");
    expect(
      await image.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      ),
    ).toBe(true);
    const record = (await geometry(page)).find((c) => c.id === "p1")!;
    expect(record.collisions).toEqual([]);
    expect(record.name.labelHeight).toBeLessThanOrEqual(
      width === 390 || width === 430 ? 32 : 36,
    );
    for (const control of record.controls) expect(control.hit).toBe(true);
    const m = await indicator(page);
    expect(m.avatarHit).toBe(true);
    expect(m.badgeHit).toBe(true);
    records.push({ width, ...m });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const card = await show(page),
    button = card.locator("[data-avatar-follow]"),
    g = (await geometry(page)).find((c) => c.id === "p1")!.overlay!;
  await card.screenshot({
    path: `${out}/screenshots/fallback-long-name.png`,
    animations: "disabled",
  });
  await page.mouse.click(g.avatar.x + 12, g.avatar.y + 12);
  await expect(button).toHaveAttribute("data-follow-state", "following");
  await expect(button).toBeEnabled();
  await page.mouse.click(
    g.badge.x + g.badge.width / 2,
    g.badge.y + g.badge.height / 2,
  );
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  await expect(button).toBeEnabled();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  writeFileSync(
    `${out}/fallback-long-name.json`,
    JSON.stringify(records, null, 2),
  );
});

test("anonymous avatar still requests login without a follow mutation", async ({
  page,
}) => {
  test.skip(phase === "before");
  const fake = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const card = await show(page),
    button = card.locator("[data-avatar-follow]");
  await expect(button).toHaveAccessibleName("Seguir a Casa Origen");
  await button.click();
  await expect(
    page.getByText("Inicia sesión para interactuar", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  expect(fake.actions.some((a) => a.name === "toggleFollow")).toBe(false);
});
