import React from "react";
import { ProductCard } from "./ProductCard";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";

interface Props {
  products: ProductRedSocial[];
  analyticsContextBuilder?: (
    product: ProductRedSocial,
    index: number
  ) => React.ComponentProps<typeof ProductCard>["analyticsContext"];
  cardVariant?: React.ComponentProps<typeof ProductCard>["variant"];
}

export const ProductGridProduct = ({
  products,
  analyticsContextBuilder,
  cardVariant = "default",
}: Props) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div
      className={
        cardVariant === "business_profile"
          ? "mb-16 grid w-full grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6"
          : "mb-20 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 2xl:grid-cols-4 2xl:gap-7"
      }
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.slug}
          product={product}
          analyticsContext={analyticsContextBuilder?.(product, index)}
          variant={cardVariant}
        />
      ))}
    </div>
  );
};
