import type { ProductRedSocial } from "@/feed/feed.interfaces";
import type { Page } from "@playwright/test";
import { mockData, openRoot } from "../mobile-feed-final-correction/browser";
import { settled } from "../mobile-feed-social-actions/browser";
export { openRoot, settled };
export const prices = [8000, 45000, 180000, 8000000, 31200000, 123456789];
export async function setup(page: Page) {
  const refs: ProductRedSocial[] = [];
  const values: Record<string, number> = {
    p1: 45000,
    p2: 180000,
    p3: 8000000,
    p4: 8000000,
    p5: 31200000,
    p6: 123456789,
    p7: 8000,
    p8: 180000,
  };
  const fake = await mockData(
    page,
    true,
    (p) => {
      const precio = values[p.id];
      const product = {
        ...p,
        precio,
        nombreNegocio:
          p.id === "p7"
            ? "Cooperativa de Productores Artesanales de Bogotá"
            : p.id === "p2"
              ? "Mercado del Barrio"
              : "Casa Origen",
        ...(p.id === "p4"
          ? {
              variantes: p.variantes?.map((v, i) => ({
                ...v,
                precio: precio + i * 1000000,
              })),
            }
          : {}),
        ...(p.id === "p8"
          ? {
              usaVariantes: true,
              variantes: [
                {
                  id: "sold-v1",
                  nombre: "Presentación artesanal especial de edición limitada",
                  precio,
                  stock: 0,
                  stockIlimitado: false,
                  isActive: true,
                  options: [],
                  orden: 0,
                },
              ],
            }
          : {}),
      };
      refs.push(product);
      return product;
    },
    100,
  );
  return {
    ...fake,
    setFirstVariant(value: number, label: string) {
      const product = refs.find((p) => p.id === "p1")!;
      product.precio = value;
      product.usaVariantes = true;
      product.variantes = [
        {
          id: "v-probe",
          nombre: label,
          precio: value,
          stock: 3,
          stockIlimitado: false,
          isActive: true,
          options: [],
          orden: 0,
        },
      ];
    },
    setFirstPrice(value: number) {
      refs.find((p) => p.id === "p1")!.precio = value;
    },
  };
}
export async function measure(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) => {
    const r = (el: Element) => {
      const a = el.getBoundingClientRect();
      return {
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        right: a.right,
        bottom: a.bottom,
      };
    };
    const area = (a: ReturnType<typeof r>, b: ReturnType<typeof r>) =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    const upper = document
      .querySelector("header")!
      .getBoundingClientRect().bottom;
    const navigation = document
      .querySelector('nav[aria-label="Navegación principal"]')
      ?.getBoundingClientRect();
    const lower =
      navigation && navigation.top > innerHeight / 2
        ? navigation.top
        : innerHeight;
    const records = cards.map((card) => {
      const price = [...card.querySelectorAll<HTMLElement>("span")].find(
        (e) => !e.children.length && e.textContent?.includes("$"),
      )!;
      const block = price.parentElement!.parentElement!,
        row = block.parentElement!,
        content = card.querySelector("h3")!.closest("a")!.parentElement!
          .parentElement!;
      const wa = card.querySelector<HTMLAnchorElement>(
          'a[href^="https://wa.me/"]',
        )!,
        cart = wa.parentElement!.querySelector<HTMLButtonElement>("button")!,
        actions = wa.parentElement!;
      const amount = document.createRange();
      amount.selectNodeContents(price);
      const glyphs = [...amount.getClientRects()];
      const controls = [...card.querySelectorAll<HTMLElement>("button,a")]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
          const b = r(el),
            visible = b.y >= upper && b.bottom <= Math.min(lower, innerHeight),
            points = [
              [0.5, 0.1],
              [0.5, 0.5],
              [0.1, 0.5],
              [0.9, 0.5],
              [0.5, 0.9],
            ];
          return {
            label: el.getAttribute("aria-label") || el.textContent?.trim(),
            box: b,
            interactive: el.tagName === "BUTTON" || el === wa,
            hit:
              !visible ||
              points.every(([x, y]) => {
                const hit = document.elementFromPoint(
                  b.x + b.width * x,
                  b.y + b.height * y,
                );
                return hit === el || (!!hit && el.contains(hit));
              }),
            nested: !!el.parentElement?.closest("a,button"),
          };
        });
      const collisions = [];
      for (let i = 0; i < controls.length; i++)
        for (let j = i + 1; j < controls.length; j++)
          if (area(controls[i].box, controls[j].box) > 0.5)
            collisions.push([controls[i].label, controls[j].label]);
      const root = r(card),
        a = r(actions),
        p = r(price),
        b = r(
          getComputedStyle(block).display === "contents"
            ? price.parentElement!
            : block,
        ),
        s = getComputedStyle(price),
        pad = getComputedStyle(content),
        gridElement = card.parentElement!.parentElement!,
        placement = getComputedStyle(card.parentElement!),
        span =
          placement.gridColumnStart === "1" && placement.gridColumnEnd === "-1",
        c2 =
          getComputedStyle(gridElement).gridTemplateColumns.split(" ")
            .length === 2 && !span;
      const paint = (el: Element) => {
        const c = getComputedStyle(el, "::before"),
          icon = el.querySelector("svg")!.getBoundingClientRect();
        return {
          width: c.width,
          height: c.height,
          radius: c.borderRadius,
          iconWidth: icon.width,
          iconHeight: icon.height,
        };
      };
      const header = card.firstElementChild!,
        photo = card.querySelector<HTMLImageElement>(
          'a[href^="/producto/"] img:not([aria-hidden="true"])',
        )!.parentElement!;
      return {
        id: card.getAttribute("data-feed-product-id"),
        c2,
        root,
        header: r(header),
        photo: r(photo),
        content: r(content),
        contentPadding: pad.padding,
        row: r(row),
        priceBlock: b,
        amount: price.textContent!,
        price: p,
        glyphWidth: Math.max(...glyphs.map((g) => g.width)),
        glyphLines: glyphs.length,
        priceFullyVisible: glyphs.every(
          (g) =>
            g.x >= root.x &&
            g.right <= root.right &&
            g.bottom <= b.bottom + 0.1,
        ),
        priceSize: s.fontSize,
        priceWeight: s.fontWeight,
        priceColor: s.color,
        priceFont: s.fontFamily,
        actions: a,
        wa: r(wa),
        cart: r(cart),
        paintWa: paint(wa),
        paintCart: paint(cart),
        cartDisabled: cart.disabled,
        wrapped: a.y >= b.bottom - 0.1,
        priceCapacity:
          r(row).width -
          a.width -
          parseFloat(getComputedStyle(row).columnGap || "0"),
        controls,
        collisions,
        completeInViewport:
          root.y >= upper && root.bottom <= Math.min(lower, innerHeight),
      };
    });
    return {
      innerWidth,
      innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      visualScale: visualViewport?.scale,
      cards: records,
      completeProducts: records.filter((c) => c.completeInViewport).length,
      upper,
      lower,
    };
  });
}
