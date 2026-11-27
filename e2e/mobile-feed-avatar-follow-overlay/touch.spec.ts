import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { setup, openRoot, settled } from "./geometry";

test.use({ hasTouch: true });
test.skip(process.env.OVERLAY_BEFORE === "1");
test("two real touchscreen taps while pending send one follow request", async ({
  page,
}) => {
  const fake = await setup(page, true);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      const arg = JSON.parse(req.postData() || "[]")[0];
      if (
        arg &&
        typeof arg === "object" &&
        "followedId" in arg &&
        !("followerId" in arg)
      ) {
        requests++;
        await gate;
      }
    }
    return route.fallback();
  });
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
  const button = card.locator("[data-avatar-follow]");
  const box = (await button.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("data-follow-state", "pending");
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("data-follow-state", "following");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("data-follow-state", "idle");
  expect(fake.actions.filter((a) => a.name === "toggleFollow")).toHaveLength(2);
  writeFileSync(
    "docs/mobile-feed-avatar-follow-overlay/touch.json",
    JSON.stringify(
      {
        realTouchEvents: true,
        oneRequestForTwoTapsWhilePending: true,
        unfollowTouch: true,
      },
      null,
      2,
    ),
  );
});
