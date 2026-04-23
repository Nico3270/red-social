import { revalidatePath, revalidateTag } from "next/cache";

type RevalidateAdminProductSurfacesInput = {
  businessSlug: string;
  productSlug?: string | null;
  includeProductCount?: boolean;
};

export function revalidateAdminProductSurfaces({
  businessSlug,
  productSlug,
  includeProductCount = false,
}: RevalidateAdminProductSurfacesInput) {
  if (!businessSlug) return;

  revalidateTag(`negocio-products-${businessSlug}`);
  revalidateTag(`negocio-catalog-${businessSlug}`);

  if (includeProductCount) {
    revalidateTag(`productos-count-${businessSlug}`);
  }

  revalidatePath(`/perfil/${businessSlug}`);
  revalidatePath(`/api/productos/${businessSlug}`);

  if (productSlug) {
    revalidatePath(`/producto/${productSlug}`);
  }
}
