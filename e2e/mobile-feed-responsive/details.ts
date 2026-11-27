import type { Page } from "@playwright/test";
export async function details(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) =>
    cards.map((card) => {
      const elements = [
        card,
        ...card.querySelectorAll<HTMLElement>("*"),
      ].filter(
        (el) =>
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 0,
      );
      const properties = [
        "display",
        "position",
        "width",
        "height",
        "padding",
        "margin",
        "gap",
        "color",
        "background-color",
        "border",
        "border-radius",
        "box-shadow",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "letter-spacing",
        "object-fit",
        "transform",
      ];
      return elements.map((el) => {
        const r = el.getBoundingClientRect(),
          s = getComputedStyle(el);
        return {
          tag: el.tagName,
          rect: [r.x, r.y, r.width, r.height].map(
            (v) => Math.round(v * 100) / 100,
          ),
          styles: properties.map((p) => s.getPropertyValue(p)),
        };
      });
    }),
  );
}
export async function align(page: Page) {
  await page.evaluate(() => {
    const card = document.querySelector('[data-product-variant="feed"]')!;
    scrollTo(
      0,
      card.getBoundingClientRect().top +
        scrollY -
        (document.querySelector("header")?.getBoundingClientRect().bottom ||
          0) -
        8,
    );
  });
  await page.waitForTimeout(300);
}
