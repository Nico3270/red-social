export const IMAGE_GENERATION_PURPOSES = {
  CATALOG: "CATALOG",
  PROMOTIONAL: "PROMOTIONAL",
  CUSTOM: "CUSTOM",
} as const;

export type ProductImageGenerationPurposeValue =
  (typeof IMAGE_GENERATION_PURPOSES)[keyof typeof IMAGE_GENERATION_PURPOSES];

export type AdminImagePromptOverrides = Partial<
  Record<ProductImageGenerationPurposeValue, string>
>;

export const EMPTY_ADMIN_IMAGE_PROMPT_OVERRIDES: Record<
  ProductImageGenerationPurposeValue,
  string
> = {
  CATALOG: "",
  PROMOTIONAL: "",
  CUSTOM: "",
};

export interface AdminImagePromptSource {
  nombre?: string | null;
  descripcion?: string | null;
  descripcionCorta?: string | null;
  categoriaNombre?: string | null;
  promptCatalogo?: string | null;
  promptPublicitario?: string | null;
}

export function getAdminImagePromptOverride(
  overrides: AdminImagePromptOverrides | null | undefined,
  purpose: ProductImageGenerationPurposeValue,
) {
  return overrides?.[purpose] ?? "";
}

export function buildBaseAdminProductImagePrompt({
  purpose,
  productName,
  description,
  categoryName,
  businessName,
}: {
  purpose: ProductImageGenerationPurposeValue;
  productName?: string | null;
  description?: string | null;
  categoryName?: string | null;
  businessName?: string | null;
}) {
  const lead =
    purpose === IMAGE_GENERATION_PURPOSES.PROMOTIONAL
      ? "Crea una imagen publicitaria premium y realista para este producto."
      : purpose === IMAGE_GENERATION_PURPOSES.CUSTOM
        ? "Crea una imagen personalizada y realista para este producto."
        : "Crea una imagen de catálogo limpia y realista para este producto.";

  const closing =
    purpose === IMAGE_GENERATION_PURPOSES.PROMOTIONAL
      ? "El producto debe ser protagonista, con composición atractiva, iluminación cuidada y una presentación comercial creíble."
      : purpose === IMAGE_GENERATION_PURPOSES.CUSTOM
        ? "Mantén el producto como protagonista, con una dirección visual clara, útil para catálogo digital y sin elementos irrelevantes."
        : "El producto debe ser protagonista, con fondo limpio, iluminación natural y composición clara para ecommerce.";

  return [
    lead,
    `Producto: ${productName?.trim() || "Producto sin nombre"}.`,
    description?.trim() ? `Descripción: ${description.trim()}.` : null,
    categoryName?.trim() ? `Categoría: ${categoryName.trim()}.` : null,
    businessName?.trim() ? `Negocio: ${businessName.trim()}.` : null,
    closing,
  ]
    .filter(Boolean)
    .join(" ");
}

export function resolveAdminProductImagePrompt({
  purpose,
  source,
  businessName,
}: {
  purpose: ProductImageGenerationPurposeValue;
  source: AdminImagePromptSource | null | undefined;
  businessName?: string | null;
}) {
  const catalogPrompt = source?.promptCatalogo?.trim() ?? "";
  const promotionalPrompt = source?.promptPublicitario?.trim() ?? "";

  if (purpose === IMAGE_GENERATION_PURPOSES.CATALOG && catalogPrompt) {
    return catalogPrompt;
  }

  if (
    purpose === IMAGE_GENERATION_PURPOSES.PROMOTIONAL &&
    promotionalPrompt
  ) {
    return promotionalPrompt;
  }

  return buildBaseAdminProductImagePrompt({
    purpose,
    productName: source?.nombre,
    description: source?.descripcion?.trim() || source?.descripcionCorta?.trim(),
    categoryName: source?.categoriaNombre,
    businessName,
  });
}