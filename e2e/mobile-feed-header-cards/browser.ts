import type { Page } from "@playwright/test";
import { mockData, openRoot } from "../mobile-feed-final-correction/browser";

export const results = [
  { id: "s1", name: "Tenis urbanos", type: "producto", slug: "tenis-urbanos" },
  { id: "s2", name: "Casa Origen", type: "negocio", slug: "casa-origen" },
  { id: "s3", name: "Moda y accesorios", type: "category", slug: "moda-y-accesorios" },
];

export async function setup(page: Page) {
  await mockData(page);
  const requests: string[] = [];
  let slowCompleted = false;
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    const query = url.searchParams.get("query");
    if (query === "lento") await new Promise((resolve) => setTimeout(resolve, 800));
    const response = query === "vacio" ? [] : query === "lento" ? results.map((result) => ({ ...result, name: "Respuesta anterior" })) : query === "muchos" ? Array.from({ length: 10 }, (_, i) => ({ ...results[i % 3], id: `many-${i}`, name: `Resultado ${i + 1}` })) : results;
    await route.fulfill({ status: query === "error" ? 500 : 200, json: response }).catch(() => {});
    if (query === "lento") slowCompleted = true;
  });
  return { requests, get slowCompleted() { return slowCompleted; } };
}

export { openRoot };

export async function input(page: Page) {
  const trigger = page.getByRole("button", { name: "Abrir búsqueda", exact: true });
  if (await trigger.isVisible()) await trigger.click();
  return page.getByRole("combobox", { name: "Buscar productos, negocios o categorías", exact: true });
}

export async function headerGeometry(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("header")!;
    const elements = [header.querySelector('a[href="/"]')!, header.querySelector('button[aria-label="Abrir búsqueda"]') || header.querySelector("input[role=combobox]")!, header.querySelector('button[aria-label^="Cambiar ubicación"]')!];
    const round = (v: number) => Math.round(v * 100) / 100;
    const boxes = elements.map((el) => {
      const r = el.getBoundingClientRect();
      return { label: el.getAttribute("aria-label") || el.textContent?.trim(), x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height), right: round(r.right), bottom: round(r.bottom) };
    });
    const brand = elements[0].getBoundingClientRect();
    const brandContentFits = [...elements[0].children].every((child) => {
      const rect = child.getBoundingClientRect();
      return rect.left >= brand.left - 1 && rect.right <= brand.right + 1;
    });
    const collisions: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.right > b.x + 0.5 && b.right > a.x + 0.5 && a.bottom > b.y + 0.5 && b.bottom > a.y + 0.5) collisions.push(`${i}-${j}`);
    }
    const r = header.getBoundingClientRect();
    const card = document.querySelector('[data-product-variant="feed"]')!.getBoundingClientRect();
    return { height: round(r.height), firstProductTop: round(card.top + scrollY), firstProductViewportTop: round(card.top), scrollY, boxes, collisions, brandContentFits, overflow: document.documentElement.scrollWidth > innerWidth + 1, searchLocationGap: round(boxes[2].x - boxes[1].right) };
  });
}
