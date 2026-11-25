import type { Page } from "@playwright/test";
import type { FeedItem, ProductRedSocial } from "@/feed/feed.interfaces";
type ReviewWindow = Window & {
  __feedReview?: {
    data: {
      base: ProductRedSocial;
      products: ProductRedSocial[];
      publication: unknown;
      service: unknown;
      business: unknown;
      item: (type: string, data: unknown) => FeedItem;
    };
  };
};
type FollowArgs = { followerId?: string; followedId: string };

// Actual Next.js transport; synthetic responses stop every mutation before the server.
export async function boundaries(
  page: Page,
  authenticated = false,
  holdNext = false,
) {
  const follows = new Set<string>();
  const actions: { name: string; args: unknown }[] = [];
  const feedRequests: { type: string; cursor?: string }[] = [];
  let releaseNext: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseNext = resolve;
  });
  await page
    .context()
    .addCookies([
      { name: "myckeo-consent", value: "true", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(() => {
    localStorage.setItem(
      "preferences-storage",
      JSON.stringify({
        state: {
          ciudad: "Bogotá",
          departamento: "Bogotá D.C.",
          preferencias: [],
          secciones: [],
          seenIds: [],
          userLat: null,
          userLong: null,
        },
        version: 0,
      }),
    );
  });
  await page.context().route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin !== "http://127.0.0.1:3400") return route.abort();
    if (url.pathname === "/api/auth/session")
      return route.fulfill({
        json: authenticated
          ? {
              user: {
                id: "synthetic-user",
                name: "Cliente",
                role: "user",
                perfilCompleto: true,
              },
              expires: "2099-01-01T00:00:00Z",
            }
          : null,
      });
    if (url.pathname.startsWith("/api/comentarios/"))
      return route.fulfill({ json: { ok: true, comentarios: [] } });
    if (req.method() === "POST") {
      if (!req.headers()["next-action"])
        return route.fulfill({ json: { ok: true } });
      let args: unknown[] = [];
      try {
        args = JSON.parse(req.postData() || "[]", (_key, value) =>
          value === "$undefined" ? undefined : value,
        );
      } catch {
        /* Unknown action is refused. */
      }
      let response: unknown = null;
      let name = "refused";
      if (
        typeof args[0] === "string" &&
        ["products", "publications", "services", "businesses"].includes(args[0])
      ) {
        name = "getFeedDataByType";
        const type = args[0],
          cursor = (args[1] as { cursor?: string } | undefined)?.cursor;
        feedRequests.push({ type, cursor });
        if (type === "products" && cursor && holdNext) await gate;
        await page.waitForFunction(
          () => !!(window as ReviewWindow).__feedReview?.data,
        );
        response = await page.evaluate(
          ({ type, cursor }) => {
            const d = (window as ReviewWindow).__feedReview!.data;
            if (type === "products")
              return cursor
                ? {
                    items: [
                      d.item("product", d.products[5]),
                      ...[7, 8, 9].map((i) =>
                        d.item("product", {
                          ...d.base,
                          id: `p${i}`,
                          slug: `nuevo-${i}`,
                          nombre: `Producto adicional ${i}`,
                        }),
                      ),
                    ],
                  }
                : {
                    items: d.products.map((p: unknown) => d.item("product", p)),
                    nextCursor: "synthetic-page-2",
                  };
            const [kind, data] =
              type === "publications"
                ? ["publication", d.publication]
                : type === "services"
                  ? ["service", d.service]
                  : ["business", d.business];
            return { items: [d.item(kind, data)] };
          },
          { type, cursor },
        );
      } else if ((args[0] as FollowArgs)?.followerId) {
        name = "checkIsFollowing";
        response = follows.has((args[0] as FollowArgs).followedId);
      } else if ((args[0] as FollowArgs)?.followedId) {
        name = "toggleFollow";
        const id = (args[0] as FollowArgs).followedId;
        if (follows.has(id)) follows.delete(id);
        else follows.add(id);
        response = { ok: true };
      } else if (!args.length) {
        name = "getFollowedBusinesses";
        response = { followedBusinessIds: [] };
      }
      actions.push({ name, args });
      return route.fulfill({
        status: 200,
        headers: { "content-type": "text/x-component" },
        body: `0:{"a":"$@1","f":[],"b":"development"}\n1:${JSON.stringify(response)}\n`,
      });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: {} });
    return route.continue();
  });
  return { actions, feedRequests, releaseNext };
}

export async function ready(page: Page, query = "") {
  await page.goto("/" + query);
  await page
    .locator('[data-product-variant="feed"]')
    .first()
    .waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(800);
}
