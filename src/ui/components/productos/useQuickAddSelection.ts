"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ProductRedSocial,
  ProductVariantRedSocial,
} from "@/interfaces/productRedSocial.interface";
import { buildVariantLabel } from "./variantDisplay";

export function useQuickAddSelection(product: ProductRedSocial) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const activeVariants = useMemo(
    () => (product.variantes ?? []).filter((variant) => variant.isActive),
    [product.variantes]
  );

  const hasVariants = product.usaVariantes === true && activeVariants.length > 0;

  const selectedVariant = useMemo<ProductVariantRedSocial | null>(
    () =>
      hasVariants
        ? activeVariants.find((variant) => variant.id === selectedVariantId) ?? null
        : null,
    [activeVariants, hasVariants, selectedVariantId]
  );

  const minVariantPrice = useMemo(() => {
    if (!hasVariants) {
      return null;
    }

    const prices = activeVariants
      .map((variant) => variant.precio)
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

    if (!prices.length) {
      return null;
    }

    return Math.min(...prices);
  }, [activeVariants, hasVariants]);

  const displayPrice = minVariantPrice ?? product.precio;
  const selectedPrice = selectedVariant?.precio ?? product.precio;
  const modalDisplayPrice = selectedVariant?.precio ?? minVariantPrice ?? product.precio;
  const showFromPrice = hasVariants && !selectedVariant && minVariantPrice !== null;
  const shouldShowFromPrice = hasVariants && minVariantPrice !== null;

  const variantHasLimitedStock =
    selectedVariant?.stockIlimitado === false &&
    typeof selectedVariant.stock === "number";

  const variantStock = variantHasLimitedStock ? selectedVariant.stock ?? null : null;

  const productHasLimitedStock =
    !hasVariants &&
    product.stockIlimitado === false &&
    typeof product.stock === "number";

  const productStock = productHasLimitedStock ? product.stock ?? null : null;
  const currentMaxStock = hasVariants ? variantStock : productStock;

  const areAllVariantsOutOfStock =
    hasVariants &&
    activeVariants.every(
      (variant) =>
        variant.stockIlimitado === false &&
        typeof variant.stock === "number" &&
        variant.stock <= 0
    );

  const isOutOfStock = hasVariants
    ? !!selectedVariant &&
      selectedVariant.stockIlimitado === false &&
      typeof selectedVariant.stock === "number" &&
      selectedVariant.stock <= 0
    : product.stockIlimitado === false &&
      typeof product.stock === "number" &&
      product.stock <= 0;

  const isActionDisabled = hasVariants ? areAllVariantsOutOfStock : isOutOfStock;
  const requiresVariantSelection = hasVariants && !selectedVariant;

  const effectivePrice = selectedVariant?.precio ?? product.precio;
  const effectiveStock = selectedVariant?.stock ?? product.stock ?? null;
  const effectiveStockIlimitado = selectedVariant
    ? selectedVariant.stockIlimitado ?? true
    : (product.stockIlimitado ?? true);
  const selectedVariantLabel = selectedVariant ? buildVariantLabel(selectedVariant) : null;

  useEffect(() => {
    if (!hasVariants) {
      if (selectedVariantId !== null) {
        setSelectedVariantId(null);
      }

      return;
    }

    const selectedStillExists = activeVariants.some(
      (variant) => variant.id === selectedVariantId
    );

    if (selectedStillExists) {
      return;
    }

    if (activeVariants.length === 1) {
      setSelectedVariantId(activeVariants[0].id);
      return;
    }

    if (selectedVariantId !== null) {
      setSelectedVariantId(null);
    }
  }, [activeVariants, hasVariants, selectedVariantId]);

  useEffect(() => {
    setQuantity((previousQuantity) => {
      if (typeof currentMaxStock === "number") {
        return Math.max(1, Math.min(previousQuantity, currentMaxStock));
      }

      return Math.max(1, previousQuantity);
    });
  }, [currentMaxStock]);

  const selectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setQuantity(1);
  };

  const updateQuantity = (nextQuantity: number) => {
    const normalizedQuantity = Math.max(1, nextQuantity || 1);

    if (typeof currentMaxStock === "number") {
      setQuantity(Math.min(normalizedQuantity, currentMaxStock));
      return;
    }

    setQuantity(normalizedQuantity);
  };

  const incrementQuantity = () => {
    updateQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    updateQuantity(quantity - 1);
  };

  const resetQuantity = () => {
    setQuantity(1);
  };

  const resetSelectionState = () => {
    if (hasVariants && activeVariants.length === 1) {
      setSelectedVariantId(activeVariants[0].id);
    } else if (hasVariants) {
      setSelectedVariantId(null);
    } else {
      setSelectedVariantId(null);
    }

    setQuantity(1);
  };

  return {
    activeVariants,
    hasVariants,
    selectedVariant,
    selectedVariantId,
    selectVariant,
    quantity,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    resetQuantity,
    resetSelectionState,
    displayPrice,
    selectedPrice,
    modalDisplayPrice,
    minVariantPrice,
    showFromPrice,
    shouldShowFromPrice,
    currentMaxStock,
    areAllVariantsOutOfStock,
    isOutOfStock,
    isActionDisabled,
    requiresVariantSelection,
    effectivePrice,
    effectiveStock,
    effectiveStockIlimitado,
    selectedVariantLabel,
  };
}