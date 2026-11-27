import type { Page } from "@playwright/test";
export { setup, openRoot, settled } from "../mobile-feed-social-actions/browser";

export async function actionGeometry(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) => cards.map((card) => {
    const round = (v: number) => Math.round(v * 100) / 100;
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height), right: round(r.right), bottom: round(r.bottom) };
    };
    const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
    const headerEl = card.firstElementChild!;
    const name = card.querySelector<HTMLAnchorElement>('a[href^="/perfil/"]')!;
    const label = name.querySelector("span") || name;
    const node = label.firstChild!;
    const range = document.createRange();
    range.selectNodeContents(label);
    const textRects = [...range.getClientRects()];
    const labelBox = label.getBoundingClientRect();
    const fullVisible = textRects.every((r) => r.right <= labelBox.right + 1 && r.bottom <= labelBox.bottom + 1);
    const text = label.textContent!.trim();
    const style = getComputedStyle(label);
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ellipsis = ctx.measureText("…").width;
    let characters = 0;
    for (let i = 0; i < node.textContent!.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      const finalLine = r.bottom > labelBox.bottom - parseFloat(style.lineHeight || "16");
      if (r.x >= labelBox.left - 1 && r.right <= labelBox.right - (!fullVisible && finalLine ? ellipsis : 0) + 1 && r.bottom <= labelBox.bottom + 1) characters++;
    }
    const image = card.querySelector<HTMLImageElement>('a[href^="/producto/"] img:not([aria-hidden="true"])')!;
    const photo = rect(image.parentElement!);
    const price = [...card.querySelectorAll<HTMLElement>("span")].find((el) => !el.children.length && el.textContent?.includes("$"))!;
    range.selectNodeContents(price);
    const glyphs = range.getBoundingClientRect();
    const priceBox = rect(price), header = rect(headerEl), business = rect(name), root = rect(card);
    const controls = [...card.querySelectorAll<HTMLElement>('button, a[href^="https://wa.me/"]')].filter((el) => el.getBoundingClientRect().width).map((el) => {
      const r = rect(el), label = el.getAttribute("aria-label") || "";
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const lower = document.querySelector('nav[aria-label="Navegación principal"]')?.getBoundingClientRect();
      const upper = document.querySelector("header")!.getBoundingClientRect().bottom;
      const visible = r.y >= upper && r.bottom <= (lower && lower.top > innerHeight / 2 ? lower.top : innerHeight);
      const paint = getComputedStyle(el, "::before");
      return { label, box: r, photoOverlap: overlaps(r, photo), headerOverlap: overlaps(r, header), nameOverlap: overlaps(r, business), priceOverlap: overlaps(r, priceBox), nested: !!el.parentElement?.closest("a,button"), hit: !visible || hit === el || !!hit && el.contains(hit), paint: { width: paint.width, height: paint.height, top: paint.top, bottom: paint.bottom, border: paint.border, radius: paint.borderRadius } };
    });
    const collisions: string[] = [];
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) if (overlaps(controls[i].box, controls[j].box) > 0.5) collisions.push(`${controls[i].label}/${controls[j].label}`);
    const follow = controls.find((c) => /^(Seguir|Siguiendo|Dejar de seguir)$/.test(c.label))!;
    const favorite = controls.find((c) => c.label.startsWith("Guardar"))!;
    const whatsapp = controls.find((c) => c.label.startsWith("Contactar por WhatsApp"));
    const cart = controls.find((c) => !/^(Seguir|Siguiendo|Dejar de seguir|Guardar|Contactar)/.test(c.label))!;
    return {
      id: card.getAttribute("data-feed-product-id"), root, header, business, name: text, labelHeight: round(labelBox.height), nameWidth: business.width, approximateVisibleCharacters: Math.min(text.length, characters), fullNameVisible: fullVisible,
      photo, price: { box: priceBox, glyphWidth: round(glyphs.width), fits: glyphs.left >= root.x && glyphs.right <= root.right && price.scrollWidth <= price.clientWidth + 1, size: getComputedStyle(price).fontSize },
      controls, collisions, follow, favorite, whatsapp, cart, marginTop: getComputedStyle(card).marginTop,
      headerGapAboveEar: round(favorite.box.y - header.y), controlsOnPhoto: controls.filter((c) => c.photoOverlap > 0.5).length,
      controlsWrapped: !!whatsapp && whatsapp.box.y >= priceBox.bottom - 0.5,
    };
  }));
}
