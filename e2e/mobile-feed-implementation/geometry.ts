import type { Page } from "@playwright/test";
export async function geometry(page: Page) {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 100) / 100;
    const header = document.querySelector("header")?.getBoundingClientRect();
    const nav = document
      .querySelector('nav[aria-label="Navegación principal"]')
      ?.getBoundingClientRect();
    const upper = Math.max(0, header?.bottom || 0);
    const lower = nav && nav.top > innerHeight / 2 ? nav.top : innerHeight;
    const cards = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-product-variant="feed"], article',
      ),
    ].map((card) => {
      const rect = card.getBoundingClientRect();
      const product = card.hasAttribute("data-product-variant");
      const title = card.querySelector("h3")?.getBoundingClientRect();
      const priceEl = [...card.querySelectorAll<HTMLElement>("span")].find(
        (el) => !el.children.length && el.textContent?.includes("$"),
      );
      const price = priceEl?.getBoundingClientRect();
      const image = card.querySelector<HTMLImageElement>(
        'a[href^="/producto/"] img:not([aria-hidden="true"])',
      );
      const media = image?.parentElement?.getBoundingClientRect();
      const overlay = card
        .querySelector<HTMLElement>("[data-product-overlay]")
        ?.getBoundingClientRect();
      const controls = [
        ...card.querySelectorAll<HTMLElement>(
          'button, a[href^="https://wa.me/"]',
        ),
      ]
        .filter((el) => el.getBoundingClientRect().width)
        .map((el) => {
          const r = el.getBoundingClientRect();
          const center = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          const inViewport = r.top >= upper && r.bottom <= lower;
          return {
            label: el.getAttribute("aria-label"),
            width: round(r.width),
            height: round(r.height),
            inside:
              r.left >= rect.left - 1 &&
              r.right <= rect.right + 1 &&
              r.top >= rect.top - 1 &&
              r.bottom <= rect.bottom + 1,
            hit:
              !inViewport || center === el || (!!center && el.contains(center)),
            nestedInteractive: !!el.parentElement?.closest("a,button"),
          };
        });
      const imageStyle = image && getComputedStyle(image);
      const scale = imageStyle ? new DOMMatrix(imageStyle.transform).a : 1;
      const fitScale =
        image && media
          ? (imageStyle?.objectFit === "cover" ? Math.max : Math.min)(
              media.width / image.naturalWidth,
              media.height / image.naturalHeight,
            )
          : 0;
      const retained =
        image && media
          ? Math.min(1, media.width / (image.naturalWidth * fitScale * scale)) *
            Math.min(1, media.height / (image.naturalHeight * fitScale * scale))
          : 0;
      const visible = Math.max(
        0,
        Math.min(lower, rect.bottom) - Math.max(upper, rect.top),
      );
      const priceFits =
        !price ||
        (price.left >= rect.left &&
          price.right <= rect.right &&
          price.bottom <= rect.bottom &&
          priceEl!.scrollWidth <= priceEl!.clientWidth + 1);
      return {
        product,
        label: card.querySelector("h3")?.textContent,
        width: round(rect.width),
        height: round(rect.height),
        top: round(rect.top + scrollY),
        left: round(rect.left),
        viewportPercent: round((rect.height / innerHeight) * 100),
        usablePercent: round((rect.height / (lower - upper)) * 100),
        mediaWidth: round(media?.width || 0),
        mediaHeight: round(media?.height || 0),
        imageShare: round(((media?.height || 0) / rect.height) * 100),
        retainedSourceArea: round(retained * 100),
        imageFit: imageStyle?.objectFit,
        source: image ? [image.naturalWidth, image.naturalHeight] : [],
        overlayAreaPercent: round(
          media && overlay
            ? ((overlay.width * overlay.height) /
                (media.width * media.height)) *
                100
            : 0,
        ),
        full: rect.top >= upper && rect.bottom <= lower,
        visible: round(visible),
        identifiable:
          !!title &&
          !!price &&
          title.top >= upper &&
          title.bottom <= lower &&
          price.top >= upper &&
          price.bottom <= lower,
        titleHeight: round(title?.height || 0),
        priceFits,
        controls,
      };
    });
    const products = cards.filter((c) => c.product);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      header: header?.height || 0,
      bottomNavigation: innerHeight - lower,
      usableHeight: lower - upper,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      fullProducts: products.filter((c) => c.full).length,
      partialProducts: products.filter((c) => c.visible > 0 && !c.full).length,
      identifiableProducts: products.filter((c) => c.identifiable).length,
      firstPublicationTop: (() => {
        const article = document
          .querySelector('button[aria-label="Abrir publicación"]')
          ?.closest("article");
        return article ? article.getBoundingClientRect().top + scrollY : null;
      })(),
      cards,
    };
  });
}
