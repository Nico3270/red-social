import { ProductVariantRedSocial } from "@/interfaces/productRedSocial.interface";

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const formatOptionLine = (
  variantName: string,
  optionName?: string | null,
  optionValue?: string | null
) => {
  const normalizedVariantName = normalizeText(variantName);
  const normalizedOptionName = normalizeText(optionName);
  const normalizedOptionValue = normalizeText(optionValue);

  const safeOptionName = optionName?.trim() ?? "";
  const safeOptionValue = optionValue?.trim() ?? "";

  if (!safeOptionName && !safeOptionValue) return "";
  if (!safeOptionName) return safeOptionValue;
  if (!safeOptionValue) return safeOptionName;

  // If the option name matches the variant title, show only the value.
  if (
    normalizedVariantName &&
    normalizedOptionName &&
    normalizedOptionName === normalizedVariantName
  ) {
    return safeOptionValue;
  }

  // If the option value is already the visible variant name, avoid repeating it.
  if (
    normalizedVariantName &&
    normalizedOptionValue &&
    normalizedOptionValue === normalizedVariantName
  ) {
    return "";
  }

  return `${safeOptionName}: ${safeOptionValue}`;
};

export const getVariantTitle = (
  variant: ProductVariantRedSocial,
  index?: number
) => {
  const nombre = variant.nombre?.trim();
  return nombre || (typeof index === "number" ? `Variante ${index + 1}` : "Variante");
};

export const getVariantOptionLines = (variant: ProductVariantRedSocial) => {
  const variantTitle = getVariantTitle(variant);
  const optionLines = (variant.options ?? [])
    .map((option) => formatOptionLine(variantTitle, option.nombre, option.valor))
    .filter(Boolean);

  return Array.from(new Set(optionLines));
};

export const getVariantOptionSummary = (variant: ProductVariantRedSocial) => {
  const optionLines = getVariantOptionLines(variant);
  return optionLines.length > 0 ? optionLines.join(" · ") : null;
};

export const buildVariantLabel = (variant: ProductVariantRedSocial) => {
  const variantTitle = getVariantTitle(variant);
  const optionLines = getVariantOptionLines(variant);

  if (!variantTitle && optionLines.length === 0) {
    return "Variante";
  }

  if (!variantTitle) {
    return optionLines.join(" · ");
  }

  if (optionLines.length === 0) {
    return variantTitle;
  }

  if (optionLines.length === 1) {
    const [singleOption] = optionLines;
    return singleOption.includes(":")
      ? `${variantTitle} (${singleOption})`
      : `${variantTitle}: ${singleOption}`;
  }

  return `${variantTitle} (${optionLines.join(" · ")})`;
};
