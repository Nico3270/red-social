import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind } from "typescript";
import type { Page } from "@playwright/test";
import type { ProductRedSocial, FeedItem } from "@/feed/feed.interfaces";

const exported = {} as {
  makeFixtures: (params: URLSearchParams) => {
    base: ProductRedSocial;
    products: ProductRedSocial[];
    item: (type: string, data: unknown) => FeedItem;
    publication: Record<string, unknown>;
    business: Record<string, unknown>;
    service: Record<string, unknown>;
  };
};
// Reuse only existing synthetic data, never its temporary page/renderer.
new Function("exports", transpileModule(
  readFileSync("e2e/mobile-feed-implementation/fixtures.tsx.txt", "utf8"),
  { compilerOptions: { module: ModuleKind.CommonJS } },
).outputText)(exported);

export async function mockData(page: Page, authenticated = false, decorate?: (product: ProductRedSocial) => ProductRedSocial, fixtureProductScore?: number) {
  const data = exported.makeFixtures(new URLSearchParams());
  const photo = (name: string) => `/__feed-final-correction/${name}.jpg`;
  const avatar = "/imgs/admin-avatar.webp";
  const products: ProductRedSocial[] = [
    { ...data.base, id: "p1", nombre: "Tenis urbanos", precio: 145000, imagenes: [photo("shoes")], negocioFotoPerfil: avatar },
    { ...data.base, id: "p2", nombre: "Bolso de cuero con correa ajustable", precio: 180000, imagenes: [photo("bag")], negocioFotoPerfil: avatar },
    { ...data.base, id: "p3", nombre: "Bolso artesanal", precio: 180000, imagenes: [photo("bag-portrait")], negocioFotoPerfil: avatar },
    { ...data.base, id: "p4", nombre: "Tenis con talla a elección", precio: 145000, imagenes: [photo("shoes")], negocioFotoPerfil: avatar, usaVariantes: true, variantes: [
      { id: "v1", nombre: "38", precio: 145000, stock: 3, stockIlimitado: false, isActive: true, options: [], orden: 0 },
      { id: "v2", nombre: "39", precio: 180000, stock: 0, stockIlimitado: false, isActive: true, options: [], orden: 1 },
    ] },
    { ...data.base, id: "p5", nombre: "Bolso agotado", precio: 180000, stock: 0, imagenes: [photo("bag")], negocioFotoPerfil: avatar },
    { ...data.base, id: "p6", nombre: "Producto sin fotografía", precio: 145000, imagenes: [], negocioFotoPerfil: avatar },
    { ...data.base, id: "p7", nombre: "Edición artesanal colombiana con acabados hechos a mano y nombre de producto especialmente largo", precio: 123456789, imagenes: [photo("shoes")], negocioFotoPerfil: avatar },
    { ...data.base, id: "p8", nombre: "Selección especial", precio: 180000, imagenes: [photo("bag")], negocioFotoPerfil: avatar },
  ];
  if (decorate) products.forEach((product, index) => { products[index] = decorate(product); });
  const actions: { name: string; args: unknown }[] = [];
  const follows = new Set<string>();
  await page.context().addCookies([{ name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" }]);
  await page.addInitScript(() => localStorage.setItem("preferences-storage", JSON.stringify({ state: { ciudad: "Bogotá", departamento: "Bogotá D.C.", preferencias: [], secciones: [], seenIds: [], userLat: null, userLong: null }, version: 0 })));
  await page.context().route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== "http://127.0.0.1:3000") return route.abort();
    const image = url.pathname === "/_next/image" ? url.searchParams.get("url") || "" : url.pathname;
    if (image.startsWith("/__feed-final-correction/"))
      return route.fulfill({ contentType: "image/jpeg", body: readFileSync(`docs/mobile-feed-final-correction/assets/${image.split("/").pop()}`) });
    if (image.startsWith("/__feed-implementation-art/"))
      return route.fulfill({ contentType: "image/svg+xml", body: readFileSync(`docs/mobile-feed-variants/preview/audit-art/${image.split("/").pop()}`) });
    if (url.pathname === "/api/auth/session")
      return route.fulfill({ json: authenticated ? { user: { id: "synthetic-user", name: "Cliente", role: "user", perfilCompleto: true }, expires: "2099-01-01T00:00:00Z" } : null });
    if (req.method() === "POST") {
      if (!req.headers()["next-action"]) return route.fulfill({ json: { ok: true } });
      let args: unknown[] = [];
      try { args = JSON.parse(req.postData() || "[]", (_key, value) => value === "$undefined" ? undefined : value); } catch { /* Refuse unknown mutations. */ }
      let response: unknown = null;
      let name = "refused";
      if (typeof args[0] === "string" && ["products", "publications", "businesses", "services"].includes(args[0])) {
        name = `getFeedDataByType:${args[0]}`;
        response = { items: args[0] === "products" ? products.map((p) => ({ ...data.item("product", p), ...(fixtureProductScore === undefined ? {} : { score: fixtureProductScore }) })) : args[0] === "publications" ? [data.item("publication", data.publication)] : args[0] === "services" ? [data.item("service", data.service)] : [data.item("business", data.business)] };
      } else if (typeof args[0] === "object" && args[0] && "followedId" in args[0]) {
        const follow = args[0] as { followedId: string; followerId?: string };
        if (follow.followerId) { name = "checkIsFollowing"; response = follows.has(follow.followedId); }
        else { name = "toggleFollow"; if (follows.has(follow.followedId)) follows.delete(follow.followedId); else follows.add(follow.followedId); response = { ok: true }; }
      } else if (!args.length) { name = "getFollowedBusinesses"; response = { followedBusinessIds: [] }; }
      actions.push({ name, args });
      return route.fulfill({ status: 200, headers: { "content-type": "text/x-component" }, body: `0:{"a":"$@1","f":[],"b":"development"}\n1:${JSON.stringify(response)}\n` });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
    return route.continue();
  });
  return { actions };
}

export async function openRoot(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-feed-product-id="p1"]').waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  // Hide only Next's developer indicator, never application UI/styles.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(700);
}

export async function commercialStyles(page: Page) {
  return page.locator('[data-product-variant="feed"]').evaluateAll((cards) => cards.map((card) => {
    const title = card.querySelector<HTMLElement>("h3")!;
    const content = title.closest("a")!.parentElement!.parentElement!;
    const price = [...card.querySelectorAll<HTMLElement>("span")].find((el) => !el.children.length && el.textContent?.includes("$"))!;
    const priceBlock = price.parentElement!.parentElement!;
    const titleBox = title.getBoundingClientRect();
    const priceBox = price.getBoundingClientRect();
    const from = [...priceBlock.querySelectorAll("span")].find((el) => el.textContent === "Desde");
    const priceStart = from?.getBoundingClientRect().top ?? priceBox.top;
    const frame = getComputedStyle(card), ps = getComputedStyle(price), cs = getComputedStyle(content), ts = getComputedStyle(title);
    const rect = card.getBoundingClientRect();
    const grid = card.parentElement!.parentElement!;
    const placement = getComputedStyle(card.parentElement!);
    const spansGrid = placement.gridColumnStart === "1" && placement.gridColumnEnd === "-1";
    const isC2 = getComputedStyle(grid).gridTemplateColumns.split(" ").length === 2 && !spansGrid;
    return {
      id: card.getAttribute("data-feed-product-id"),
      isC2,
      price: price.textContent, from: !!from,
      width: rect.width, height: rect.height,
      priceSize: ps.fontSize, priceWeight: ps.fontWeight, priceColor: ps.color,
      priceLineHeight: ps.lineHeight, tracking: ps.letterSpacing, textShadow: ps.textShadow, font: ps.fontFamily,
      titleSize: ts.fontSize, titleWeight: ts.fontWeight, titleHeight: titleBox.height, titleMinHeight: ts.minHeight,
      commercialGap: Math.round((priceStart - titleBox.bottom) * 100) / 100,
      contentDirection: cs.flexDirection, contentGap: cs.rowGap, contentPadding: cs.padding,
      contentJustify: cs.justifyContent, contentHeight: cs.height,
      priceMarginTop: getComputedStyle(priceBlock).marginTop,
      border: frame.border, shadow: frame.boxShadow, radius: frame.borderRadius,
      cardInlineHeight: (card as HTMLElement).style.height,
    };
  }));
}
