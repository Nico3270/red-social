import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { mockData, openRoot } from "../mobile-feed-final-correction/browser";

export { openRoot };
export async function settled(page: Page) {
  // Playwright finishes finite browser animations for a stable capture. Perform
  // that step before reading geometry too; no application styles are replaced.
  await page.screenshot({ animations: "disabled" });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => page.locator('[data-product-variant="feed"]').evaluateAll((cards) => cards.flatMap((card) => {
    const r = card.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight) return [];
    return [card, card.parentElement!].flatMap((el) => {
      const style = getComputedStyle(el), matrix = new DOMMatrix(style.transform);
      return Number(style.opacity) > 0.9999 && Math.abs(matrix.f) < 0.001 && Math.abs(matrix.e) < 0.001 ? [] : [{ id: card.getAttribute("data-feed-product-id"), transform: style.transform, opacity: style.opacity }];
    });
  })), { timeout: 3000 }).toEqual([]);
}
export async function setup(page: Page, authenticated = false) {
  const boundary = await mockData(page, authenticated, (product) => {
    const names: Record<string, [string, string, string]> = {
      p1: ["Casa Origen", "b1", "casa-origen"],
      p2: ["Mercado del Barrio", "b2", "mercado-del-barrio"],
      p3: ["Taller Artesanal de Bogotá", "b3", "taller-artesanal-bogota"],
      p4: ["Casa Origen", "b1", "casa-origen"],
      p5: ["Mercado del Barrio", "b2", "mercado-del-barrio"],
      p6: ["Cooperativa Artesanal del Norte", "b6", "cooperativa-artesanal"],
      p7: ["Cooperativa de Productores Artesanales de Bogotá", "b7", "cooperativa-productores"],
      p8: ["Comercio Local", "b8", "comercio-local"],
    };
    const [nombreNegocio, negocioId, slugNegocio] = names[product.id];
    return {
      ...product, nombreNegocio, negocioId, slugNegocio,
      ...(product.id === "p1" ? { nombre: "Reloj minimalista", slug: "reloj-minimalista", imagenes: ["/__feed-social-actions/watch.jpg"] } : {}),
      ...(product.id === "p4" ? { etiquetaEspecial: "novedad" } : {}),
      ...(product.id === "p5" ? { etiquetaEspecial: "mas_vendido" } : {}),
      ...(product.id === "p8" ? { etiquetaEspecial: "ultimos_dias", usaVariantes: true, variantes: [
        { id: "sold-v1", nombre: "Única", precio: 180000, stock: 0, stockIlimitado: false, isActive: true, options: [], orden: 0 },
      ] } : {}),
    };
  }, 100);
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const src = url.pathname === "/_next/image" ? url.searchParams.get("url") : url.pathname;
    if (src === "/__feed-social-actions/watch.jpg")
      return route.fulfill({ contentType: "image/jpeg", body: readFileSync("docs/mobile-feed-social-actions/assets/watch.jpg") });
    return route.fallback();
  });
  return boundary;
}

export async function socialGeometry(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) => cards.map((card) => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const image = card.querySelector<HTMLImageElement>('a[href^="/producto/"] img:not([aria-hidden="true"])')!;
    const photo = image.parentElement!.getBoundingClientRect();
    const header = card.firstElementChild!.getBoundingClientRect();
    const name = card.querySelector<HTMLAnchorElement>('a[href^="/perfil/"]')!;
    const nr = name.getBoundingClientRect();
    const ns = getComputedStyle(name);
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = `${ns.fontWeight} ${ns.fontSize} ${ns.fontFamily}`;
    const text = name.textContent!.trim();
    let chars = text.length;
    if (name.scrollWidth > name.clientWidth + 1) {
      chars = 0;
      while (chars < text.length && ctx.measureText(text.slice(0, chars + 1) + "…").width <= nr.width) chars++;
    }
    const nodes = [...card.querySelectorAll<HTMLElement>('button, a[href^="https://wa.me/"]')].filter((el) => el.getBoundingClientRect().width > 0);
    const intersect = (a: DOMRect | { left: number; right: number; top: number; bottom: number }, b: DOMRect | { left: number; right: number; top: number; bottom: number }) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const badges = [...image.parentElement!.querySelectorAll<HTMLElement>("span")].map((el) => ({ text: el.textContent, box: el.getBoundingClientRect() }));
    const central = { left: photo.left + photo.width * 0.25, right: photo.left + photo.width * 0.75, top: photo.top + photo.height * 0.25, bottom: photo.top + photo.height * 0.75 };
    const controls = nodes.map((el) => {
      const r = el.getBoundingClientRect(), label = el.getAttribute("aria-label") || "";
      const inPhoto = r.top >= photo.top && r.bottom <= photo.bottom && r.left >= photo.left && r.right <= photo.right;
      const p = getComputedStyle(el, "::before");
      const hasPaint = p.content !== "none" && p.backgroundColor !== "rgba(0, 0, 0, 0)";
      const pw = hasPaint ? parseFloat(p.width) : 0, ph = hasPaint ? parseFloat(p.height) : 0;
      const paint = { left: r.left + parseFloat(p.left || "0"), top: r.top + parseFloat(p.top || "0"), right: r.left + parseFloat(p.left || "0") + pw, bottom: r.top + parseFloat(p.top || "0") + ph };
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const visible = r.top >= document.querySelector("header")!.getBoundingClientRect().bottom && r.bottom <= (document.querySelector('nav[aria-label="Navegación principal"]')?.getBoundingClientRect().top || innerHeight);
      return { label, x: round(r.x - photo.x), y: round(r.y - photo.y), width: round(r.width), height: round(r.height), inPhoto, paintArea: inPhoto && hasPaint ? Math.PI * pw * ph / 4 : 0, touchArea: inPhoto ? r.width * r.height : 0, newSocialCentralOverlap: /^(Seguir|Siguiendo|Dejar de seguir|Guardar)/.test(label) && inPhoto && hasPaint ? intersect(paint, central) : 0, badgeOverlap: inPhoto && badges.some((b) => intersect(r, b.box) > 0.1), nested: !!el.parentElement?.closest("a,button"), hit: !visible || hit === el || !!hit && el.contains(hit), profileOverlap: intersect(r, nr) > 0.1 };
    });
    const overlaps: string[] = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (intersect(nodes[i].getBoundingClientRect(), nodes[j].getBoundingClientRect()) > 0.1) overlaps.push(`${controls[i].label}/${controls[j].label}`);
    return {
      id: card.getAttribute("data-feed-product-id"), width: round(card.getBoundingClientRect().width), height: round(card.getBoundingClientRect().height), headerHeight: round(header.height), name: text, nameWidth: round(nr.width), nameAvailableWidth: round(name.parentElement!.getBoundingClientRect().right - nr.left), fullNameWidth: round(ctx.measureText(text).width), approximateVisibleCharacters: chars, fullNameVisible: name.scrollWidth <= name.clientWidth + 1, photoWidth: round(photo.width), photoHeight: round(photo.height), controlsOnPhoto: controls.filter((c) => c.inPhoto).length, paintedPhotoPercent: round(controls.reduce((n, c) => n + c.paintArea, 0) / (photo.width * photo.height) * 100), touchPhotoPercent: round(controls.reduce((n, c) => n + c.touchArea, 0) / (photo.width * photo.height) * 100), overlaps, controls,
      badges: badges.map((b) => ({ text: b.text, x: round(b.box.x - photo.x), y: round(b.box.y - photo.y), width: round(b.box.width), height: round(b.box.height) })),
      socialDomCounts: { follow: [...card.querySelectorAll("button")].filter((b) => /^(Seguir|Siguiendo|Dejar de seguir)$/.test(b.getAttribute("aria-label") || "")).length, favorite: card.querySelectorAll('button[aria-label^="Guardar"]').length },
    };
  }));
}
