import type { CSSProperties } from "react";

// Configuración local de esta pantalla. La comparación de alternativas vive en el arnés.
export const newProductPalettes = {
  ruby: {
    name: "Myckeo Ruby",
    accent: "#C93545",
    soft: "#FFF0F1",
    ink: "#292C32",
    hover: "#AB2938",
    border: "#ECC5CB",
    ring: "#C9354526",
  },
  ocean: {
    name: "Ocean Blue",
    accent: "#2563EB",
    soft: "#EFF6FF",
    ink: "#1E293B",
    hover: "#1D4ED8",
    border: "#BFDBFE",
    ring: "#2563EB26",
  },
} as const;

export type NewProductPalette = keyof typeof newProductPalettes;
export const DEFAULT_NEW_PRODUCT_PALETTE: NewProductPalette = "ruby";

export function newProductPaletteStyle(
  palette: NewProductPalette = DEFAULT_NEW_PRODUCT_PALETTE,
): CSSProperties & Record<`--product-${string}`, string> {
  const { accent, soft, ink, hover, border, ring } =
    newProductPalettes[palette];
  return {
    "--product-accent": accent,
    "--product-soft": soft,
    "--product-ink": ink,
    "--product-hover": hover,
    "--product-accent-border": border,
    "--product-ring": ring,
  };
}
