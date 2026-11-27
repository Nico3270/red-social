import type { Page } from "@playwright/test";
import { geometry as previous } from "../mobile-feed-avatar-follow/geometry";
export {
  setup,
  openRoot,
  settled,
} from "../mobile-feed-avatar-follow/geometry";
export async function geometry(page: Page) {
  const base = await previous(page);
  const overlay = await page
    .locator('[data-product-variant="feed"]')
    .evaluateAll((cards) =>
      cards.map((card) => {
        const button = card.querySelector<HTMLElement>("[data-avatar-follow]"),
          photo = button?.querySelector<HTMLElement>("[data-avatar-image]");
        if (!button || !photo || !photo.getBoundingClientRect().width)
          return null;
        const b = button.getBoundingClientRect(),
          a = photo.getBoundingClientRect(),
          p = getComputedStyle(button, "::before");
        const badge = {
          x: b.x + parseFloat(p.left),
          y: b.y + parseFloat(p.top),
          width: parseFloat(p.width),
          height: parseFloat(p.height),
        };
        const d = Math.hypot(
            badge.x + badge.width / 2 - (a.x + a.width / 2),
            badge.y + badge.height / 2 - (a.y + a.height / 2),
          ),
          r = badge.width / 2,
          R = a.width / 2;
        const area =
          r * r * Math.acos((d * d + r * r - R * R) / (2 * d * r)) +
          R * R * Math.acos((d * d + R * R - r * r) / (2 * d * R)) -
          0.5 *
            Math.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R));
        const inside = (x: number, y: number) => {
          const hit = document.elementFromPoint(x, y);
          return hit === button || (!!hit && button.contains(hit));
        };
        const visible =
          b.y >=
            document.querySelector("header")!.getBoundingClientRect().bottom &&
          b.bottom <= innerHeight - 74;
        return {
          avatar: { x: a.x, y: a.y, width: a.width, height: a.height },
          badge,
          overlapFraction: area / (Math.PI * r * r),
          photoHit: !visible || inside(a.x + a.width / 2, a.y + a.height / 2),
          badgeHit:
            !visible ||
            inside(badge.x + badge.width / 2, badge.y + badge.height / 2),
          avatarIsInsideButton: photo.closest("button") === button,
          profileLinks: card.querySelectorAll('a[href^="/perfil/"]').length,
        };
      }),
    );
  return base.map((card, i) => ({ ...card, overlay: overlay[i] }));
}
