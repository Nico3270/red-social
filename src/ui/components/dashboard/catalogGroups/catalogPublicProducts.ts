import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";

export function dedupeProductsById(products: ProductRedSocial[]): ProductRedSocial[] {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = product.id || product.slug;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
