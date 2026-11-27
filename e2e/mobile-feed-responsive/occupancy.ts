import type { Page } from "@playwright/test";
export async function occupancy(page: Page) {
  return page
    .locator('[data-product-variant="feed"]')
    .first()
    .evaluate((card) => {
      const image = card.querySelector(
        'a[href^="/producto/"] img:not([aria-hidden="true"])',
      )!;
      const frame = image.parentElement!.getBoundingClientRect();
      const dock = card
        .querySelector("[data-product-overlay]")!
        .getBoundingClientRect();
      const controls = [
        ...card.querySelectorAll<HTMLElement>(
          "[data-product-overlay] :is(button,a)",
        ),
      ].filter((el) => el.getBoundingClientRect().width > 0);
      const painted = controls.map((el) => {
        const box = el.getBoundingClientRect();
        const pseudo = getComputedStyle(el, "::before");
        const width =
            box.width - parseFloat(pseudo.left) - parseFloat(pseudo.right),
          height =
            box.height - parseFloat(pseudo.top) - parseFloat(pseudo.bottom);
        return {
          width,
          height,
          background: pseudo.backgroundColor,
          area: (Math.PI * width * height) / 4,
        };
      });
      const badgeRects = [...image.parentElement!.querySelectorAll("span")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width && r.height);
      const overlaps = controls.some((el) => {
        const r = el.getBoundingClientRect();
        return badgeRects.some(
          (b) =>
            Math.min(r.right, b.right) > Math.max(r.left, b.left) &&
            Math.min(r.bottom, b.bottom) > Math.max(r.top, b.top),
        );
      });
      const area = frame.width * frame.height;
      return {
        frame: { width: frame.width, height: frame.height, area },
        dock: { width: dock.width, height: dock.height },
        controls: controls.length,
        painted,
        paintedPercent: (painted.reduce((n, p) => n + p.area, 0) / area) * 100,
        touchPercent: ((controls.length * 44 * 44) / area) * 100,
        extentPercent: ((dock.width * dock.height) / area) * 100,
        badgeOverlap: overlaps,
      };
    });
}
