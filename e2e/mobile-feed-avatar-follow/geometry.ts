import type { Page } from "@playwright/test";
export {
  setup,
  openRoot,
  settled,
} from "../mobile-feed-actions-layout-final/browser";
export async function geometry(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) =>
    cards.map((card) => {
      const round = (n: number) => Math.round(n * 100) / 100;
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          x: round(r.x),
          y: round(r.y),
          width: round(r.width),
          height: round(r.height),
          right: round(r.right),
          bottom: round(r.bottom),
        };
      };
      const overlap = (
        a: ReturnType<typeof rect>,
        b: ReturnType<typeof rect>,
      ) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
      const name = card.querySelector<HTMLAnchorElement>(
        'a[href^="/perfil/"]:not([data-avatar-profile])',
      )!;
      const avatar = card.querySelector<HTMLAnchorElement>(
        "[data-avatar-profile]",
      );
      const photo = card.querySelector<HTMLImageElement>(
        'a[href^="/producto/"] img:not([aria-hidden="true"])',
      )!.parentElement!;
      const nodes = [
        ...card.querySelectorAll<HTMLElement>(
          'button,a[href^="https://wa.me/"],a[href^="/perfil/"]',
        ),
      ].filter((el) => el.getBoundingClientRect().width > 0);
      const controls = nodes.map((el) => {
        const b = rect(el),
          c = getComputedStyle(el),
          p = getComputedStyle(el, "::before");
        const visible =
          b.y >=
            document.querySelector("header")!.getBoundingClientRect().bottom &&
          b.bottom <=
            Math.min(
              innerHeight,
              document
                .querySelector('nav[aria-label="Navegación principal"]')
                ?.getBoundingClientRect().top || innerHeight,
            );
        const points = [
          [0.5, 0.1],
          [0.5, 0.5],
          [0.1, 0.5],
          [0.9, 0.5],
          [0.5, 0.9],
        ].map(([x, y]) => {
          const hit = document.elementFromPoint(
            b.x + b.width * x,
            b.y + b.height * y,
          );
          return !visible || hit === el || (!!hit && el.contains(hit));
        });
        return {
          label: el.getAttribute("aria-label") || el.textContent?.trim(),
          follow:
            el.hasAttribute("data-avatar-follow") ||
            /^(Seguir|Siguiendo|Dejar de seguir)$/.test(
              el.getAttribute("aria-label") || "",
            ),
          avatar: el.hasAttribute("data-avatar-profile"),
          name: el === name,
          box: b,
          hit: points.every(Boolean),
          nested: !!el.parentElement?.closest("a,button"),
          photoOverlap: overlap(b, rect(photo)),
          color: c.color,
          paint: {
            width: p.width,
            height: p.height,
            background: p.backgroundColor,
          },
          disabled: el instanceof HTMLButtonElement && el.disabled,
        };
      });
      const collisions = [];
      for (let i = 0; i < controls.length; i++)
        for (let j = i + 1; j < controls.length; j++)
          if (overlap(controls[i].box, controls[j].box) > 0.5)
            collisions.push([controls[i].label, controls[j].label]);
      const label = name.querySelector("span") || name;
      const price = [...card.querySelectorAll("span")].find(
        (el) => !el.children.length && el.textContent?.includes("$"),
      )!;
      return {
        id: card.getAttribute("data-feed-product-id"),
        root: rect(card),
        header: rect(card.firstElementChild!),
        photo: rect(photo),
        name: {
          text: name.textContent,
          width: rect(name).width,
          labelHeight: rect(label).height,
          font: getComputedStyle(name).fontSize,
        },
        avatar:
          avatar && getComputedStyle(avatar).display !== "none"
            ? rect(avatar)
            : null,
        controls,
        collisions,
        price: {
          text: price.textContent,
          box: rect(price),
          font: getComputedStyle(price).fontSize,
        },
        title: card.querySelector("h3")!.textContent,
        border: getComputedStyle(card).border,
        shadow: getComputedStyle(card).boxShadow,
      };
    }),
  );
}
