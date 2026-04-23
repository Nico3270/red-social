import { revalidateTag } from "next/cache";

export function revalidateCatalogGroupCache(businessSlug?: string | null) {
  if (!businessSlug) return;

  revalidateTag(`negocio-catalog-${businessSlug}`);
}
