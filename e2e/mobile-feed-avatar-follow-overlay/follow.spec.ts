import { test, expect, type Page, type Route } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled, geometry } from "./geometry";
import { mockData } from "../mobile-feed-final-correction/browser";
const out = "docs/mobile-feed-avatar-follow-overlay";
test.skip(process.env.OVERLAY_BEFORE === "1");
async function firstCard(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoot(page);
  const card = page.locator('[data-feed-product-id="p1"]');
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
function isToggle(route: Route) {
  const r = route.request();
  if (r.method() !== "POST" || !r.headers()["next-action"]) return false;
  try {
    const a = JSON.parse(r.postData() || "[]")[0];
    return (
      a && typeof a === "object" && "followedId" in a && !("followerId" in a)
    );
  } catch {
    return false;
  }
}
test("loading and double tap use one mutation, then confirmed check and keyboard unfollow", async ({
  page,
}) => {
  const fake = await setup(page, true);
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  let requests = 0;
  await page.route("**/*", async (route) => {
    if (isToggle(route)) {
      requests++;
      await gate;
    }
    return route.fallback();
  });
  const card = await firstCard(page),
    button = card.locator("[data-avatar-follow]");
  await expect(button).toHaveAccessibleName("Seguir a Casa Origen");
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(
    await button.locator("[data-avatar-indicator]").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        document
          .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          ?.closest("[data-avatar-follow]") ===
        el.closest("[data-avatar-follow]")
      );
    }),
  ).toBe(true);
  await card.screenshot({
    path: `${out}/screenshots/avatar-plus.png`,
    animations: "disabled",
  });
  const b = (await button.boundingBox())!;
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2, {
    delay: 70,
  });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveAttribute("data-follow-state", "pending");
  await expect.poll(() => requests).toBe(1);
  await card.screenshot({
    path: `${out}/screenshots/avatar-pending.png`,
    animations: "disabled",
  });
  release();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("data-follow-state", "following");
  await expect(button).toHaveAccessibleName("Dejar de seguir a Casa Origen");
  await button.hover();
  await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await card.screenshot({
    path: `${out}/screenshots/avatar-check.png`,
    animations: "disabled",
  });
  await button.focus();
  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  await expect(button).toBeEnabled();
  expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(2);
  writeFileSync(
    `${out}/double-tap.json`,
    JSON.stringify(
      {
        requests,
        oneRequestWhilePending: true,
        keyboardUnfollow: true,
        pendingHasSpinner: true,
      },
      null,
      2,
    ),
  );
});
test("follow error restores previous state, announces failure and allows retry", async ({
  page,
}) => {
  await setup(page, true);
  let fail = true,
    rejected = 0;
  await page.route("**/*", async (route) => {
    if (!isToggle(route) || !fail) return route.fallback();
    rejected++;
    return route.fulfill({
      status: 200,
      headers: { "content-type": "text/x-component" },
      body: '0:{"a":"$@1","f":[],"b":"development"}\n1:E{"digest":"synthetic-follow-error","message":"Error de seguimiento de prueba","stack":[]}\n',
    });
  });
  const card = await firstCard(page),
    button = card.locator("[data-avatar-follow]");
  await button.click();
  await expect(card.getByRole("status")).toHaveText(
    "No se pudo actualizar el seguimiento. Inténtalo de nuevo.",
  );
  await expect(button).toHaveAccessibleName("Seguir a Casa Origen");
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  await expect(button).toBeEnabled();
  await card.screenshot({
    path: `${out}/screenshots/avatar-error.png`,
    animations: "disabled",
  });
  fail = false;
  await button.click();
  await expect(button).toHaveAttribute("data-follow-state", "following");
  await expect(button).toBeEnabled();
  await expect(card.getByRole("status")).toHaveText("");
  fail = true;
  await button.click();
  await expect(card.getByRole("status")).not.toBeEmpty();
  await expect(button).toHaveAttribute("data-follow-state", "following");
  await expect(button).toBeEnabled();
  expect(rejected).toBe(2);
  writeFileSync(
    `${out}/errors.json`,
    JSON.stringify(
      {
        rejected,
        followRollback: true,
        unfollowRollback: true,
        retry: true,
        liveFeedback: true,
      },
      null,
      2,
    ),
  );
});
test("missing avatar uses the existing fallback inside the follow button", async ({
  page,
}) => {
  await mockData(
    page,
    true,
    (p) => ({
      ...p,
      nombreNegocio: "Negocio sin avatar",
      negocioFotoPerfil: "",
    }),
    100,
  );
  const card = await firstCard(page),
    avatar = card.locator("[data-avatar-follow]");
  await expect(avatar).toHaveAccessibleName("Seguir a Negocio sin avatar");
  const img = avatar.locator("img");
  await expect(img).toBeVisible();
  expect(
    await img.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
    ),
  ).toBe(true);
  const g = (await geometry(page)).find((c) => c.id === "p1")!;
  expect(g.collisions).toEqual([]);
  for (const c of g.controls) expect(c.hit).toBe(true);
  await card.screenshot({
    path: `${out}/screenshots/avatar-fallback.png`,
    animations: "disabled",
  });
  await expect(card.locator("[data-avatar-follow]")).toHaveAccessibleName(
    "Seguir a Negocio sin avatar",
  );
  writeFileSync(
    `${out}/fallback.json`,
    JSON.stringify({ loaded: true, geometry: g }, null, 2),
  );
});

test("long business name, avatar follow and favorite have separate hits at every mobile width", async ({
  page,
}) => {
  await setup(page, true);
  await firstCard(page);
  const records = [];
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const card = page.locator('[data-feed-product-id="p7"]');
    await card.evaluate((el) =>
      scrollBy(
        0,
        el.getBoundingClientRect().top -
          document.querySelector("header")!.getBoundingClientRect().bottom -
          16,
      ),
    );
    await settled(page);
    const g = (await geometry(page)).find((c) => c.id === "p7")!;
    expect(g.collisions).toEqual([]);
    for (const c of g.controls) expect(c.hit).toBe(true);
    await expect(
      card.getByRole("link", {
        name: "Cooperativa de Productores Artesanales de Bogotá",
        exact: true,
      }),
    ).toBeVisible();
    await expect(card.locator("[data-avatar-follow]")).toHaveAccessibleName(
      "Seguir a Cooperativa de Productores Artesanales de Bogotá",
    );
    if ([390, 430].includes(width))
      await card.screenshot({
        path: `${out}/screenshots/long-business-${width}.png`,
        animations: "disabled",
      });
    records.push({ width, geometry: g });
  }
  writeFileSync(`${out}/long-business.json`, JSON.stringify(records, null, 2));
});

test.describe("avatar overlay details at native 4x density", () => {
  test.use({ deviceScaleFactor: 4 });
  test("avatar and badge invoke only follow, and name remains the profile destination", async ({
    page,
  }) => {
    const fake = await setup(page, true);
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).pathname !== "/perfil/casa-origen")
        return route.fallback();
      return route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Perfil sintético</title><main>Perfil</main>",
      });
    });

    const card = await firstCard(page),
      button = card.locator("[data-avatar-follow]");
    const g = (await geometry(page)).find((c) => c.id === "p1")!,
      overlay = g.overlay!;
    expect(overlay.photoHit).toBe(true);
    expect(overlay.badgeHit).toBe(true);
    await expect(card.locator("[data-avatar-profile]")).toHaveCount(0);
    await expect(button.locator("a")).toHaveCount(0);
    await button.screenshot({
      path: `${out}/screenshots/avatar-plus-enlarged.png`,
      animations: "disabled",
      scale: "device",
    });
    await page.mouse.click(overlay.avatar.x + 12, overlay.avatar.y + 12);
    await expect(button).toHaveAttribute("data-follow-state", "following");
    await expect(button).toBeEnabled();
    await expect(page).toHaveURL("http://127.0.0.1:3000/");
    await button.screenshot({
      path: `${out}/screenshots/avatar-check-enlarged.png`,
      animations: "disabled",
      scale: "device",
    });
    await page.mouse.click(
      overlay.badge.x + overlay.badge.width / 2,
      overlay.badge.y + overlay.badge.height / 2,
    );
    await expect(button).toHaveAttribute("data-follow-state", "idle");
    await expect(button).toBeEnabled();
    await expect(page).toHaveURL("http://127.0.0.1:3000/");
    expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(
      2,
    );
    const profile = card.getByRole("link", {
      name: "Casa Origen",
      exact: true,
    });
    await profile.click();
    await expect(page).toHaveURL("http://127.0.0.1:3000/perfil/casa-origen");
    expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(
      2,
    );
    writeFileSync(
      `${out}/avatar-destinations.json`,
      JSON.stringify(
        {
          photoClickOnlyFollows: true,
          badgeClickOnlyUnfollows: true,
          nameOnlyNavigates: true,
          deviceScaleFactor: 4,
          geometry: g,
        },
        null,
        2,
      ),
    );
  });
});
