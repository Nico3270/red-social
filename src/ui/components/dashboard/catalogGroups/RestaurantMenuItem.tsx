"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BsWhatsapp } from "react-icons/bs";
import { FaShoppingCart, FaStar } from "react-icons/fa";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { trackAnalyticsEvent } from "@/analytics/events";
import { Precio } from "@/ui/components/productos/Precio";

interface RestaurantMenuItemProps {
  product: ProductRedSocial;
  isFeatured?: boolean;
  onOpenDetail?: (product: ProductRedSocial) => void;
  onAddToCart?: (product: ProductRedSocial, quantity: number) => void;
  negocioSlug?: string;
  groupId?: string;
  groupSlug?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

export const RestaurantMenuItem: React.FC<RestaurantMenuItemProps> = ({
  product,
  isFeatured = false,
  onOpenDetail,
  onAddToCart,
  negocioSlug = "",
  groupId,
  groupSlug = "",
}) => {
  const primaryImage =
    product.imagenes?.find(isRenderableImageSource) || PLACEHOLDER_PRODUCT_IMAGE;
  const productDescription = product.descripcionCorta || product.descripcion;
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const activeVariants = useMemo(
    () => (product.variantes ?? []).filter((variant) => variant.isActive),
    [product.variantes]
  );
  const hasConfigurableVariants = useMemo(
    () => product.usaVariantes === true && activeVariants.length > 0,
    [activeVariants.length, product.usaVariantes]
  );
  const areAllVariantsOutOfStock =
    hasConfigurableVariants &&
    activeVariants.every(
      (variant) =>
        variant.stockIlimitado === false &&
        typeof variant.stock === "number" &&
        variant.stock <= 0
    );
  const simpleProductOutOfStock =
    !hasConfigurableVariants &&
    product.stockIlimitado === false &&
    typeof product.stock === "number" &&
    product.stock <= 0;
  const isOutOfStock = hasConfigurableVariants ? areAllVariantsOutOfStock : simpleProductOutOfStock;
  const phoneNumber = product.telefonoContacto?.replace(/\D/g, "") ?? "";
  const detailHref = `/producto/${product.slug}`;
  const activeVariantCount = activeVariants.length;
  const variantPriceFloor = activeVariants
    .map((variant) => variant.precio)
    .filter((price): price is number => typeof price === "number" && !Number.isNaN(price))
    .sort((left, right) => left - right)[0];
  const displayPrice = variantPriceFloor ?? product.precio;

  const trackItemSelection = useCallback(() => {
    if (isFeatured) {
      trackAnalyticsEvent({
        event: "restaurant_menu_featured_clicked",
        timestamp: Date.now(),
        negocioSlug,
        navigationMode: "catalog_groups",
        source: "grupo_navegacion",
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: product.precio,
        groupId,
        groupSlug,
      });
    }

    trackAnalyticsEvent({
      event: "restaurant_menu_item_clicked",
      timestamp: Date.now(),
      negocioSlug,
      navigationMode: "catalog_groups",
      source: "grupo_navegacion",
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: product.precio,
      groupId,
      groupSlug,
    });
  }, [groupId, groupSlug, isFeatured, negocioSlug, product]);

  const handleDetailIntent = useCallback(() => {
    trackItemSelection();
    trackAnalyticsEvent({
      event: "product_detail_viewed",
      timestamp: Date.now(),
      negocioSlug,
      navigationMode: "catalog_groups",
      source: "grupo_navegacion",
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: product.precio,
      groupId,
      groupSlug,
      hasVariants: hasConfigurableVariants,
    });

    onOpenDetail?.(product);
  }, [groupId, groupSlug, hasConfigurableVariants, negocioSlug, onOpenDetail, product, trackItemSelection]);

  const handleAddToCart = useCallback(() => {
    if (isOutOfStock) {
      return;
    }

    trackAnalyticsEvent({
      event: "product_add_to_cart_clicked",
      timestamp: Date.now(),
      negocioSlug,
      navigationMode: "catalog_groups",
      source: "grupo_navegacion",
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: product.precio,
      quantity: 1,
      groupId,
      groupSlug,
    });

    onAddToCart?.(product, 1);
    setShowAddedFeedback(true);
    window.setTimeout(() => setShowAddedFeedback(false), 1400);
  }, [groupId, groupSlug, isOutOfStock, negocioSlug, onAddToCart, product]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true }}
      data-testid={`restaurant-menu-item-${product.slug}`}
      className={`group rounded-[22px] border shadow-sm transition-all duration-300 ${
        isFeatured
          ? "border-amber-300 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] hover:border-amber-400 hover:shadow-lg"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isFeatured && (
                <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  <FaStar className="text-xs" />
                  Destacado
                </span>
              )}
              {hasConfigurableVariants && (
                <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {activeVariantCount} {activeVariantCount === 1 ? "opción" : "opciones"}
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Sin stock
                </span>
              )}
            </div>

            <Link
              href={detailHref}
              onClick={handleDetailIntent}
              className="inline-block max-w-full"
            >
              <h3 className="truncate text-lg font-semibold text-slate-900 transition-colors hover:text-amber-700 sm:text-xl">
                {product.nombre}
              </h3>
            </Link>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {variantPriceFloor !== undefined && (
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Desde
                </span>
              )}
              <Precio value={displayPrice} />
            </div>
          </div>

          {product.imagenes.length > 0 && (
            <Link
              href={detailHref}
              onClick={handleDetailIntent}
              className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:h-32 sm:w-32"
            >
              <Image
                src={primaryImage}
                alt={product.nombre}
                width={128}
                height={128}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </Link>
          )}
        </div>

        {productDescription && (
          <p className="line-clamp-2 text-sm text-gray-600">{productDescription}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {!hasConfigurableVariants && (
            <Link
              href={detailHref}
              onClick={handleDetailIntent}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Ver detalle
            </Link>
          )}

          {hasConfigurableVariants ? (
            <Link
              href={detailHref}
              onClick={handleDetailIntent}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              <FaShoppingCart className="text-sm" />
              Ver opciones
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <FaShoppingCart className="text-sm" />
              {isOutOfStock ? "Agotado" : showAddedFeedback ? "Agregado" : "Agregar"}
            </button>
          )}

          {phoneNumber && (
            <a
              href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(
                `¡Hola! Me interesa: *${product.nombre}* - ${formatCurrency(displayPrice)}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackAnalyticsEvent({
                  event: "product_whatsapp_clicked",
                  timestamp: Date.now(),
                  negocioSlug,
                  navigationMode: "catalog_groups",
                  source: "grupo_navegacion",
                  productId: product.id,
                  productSlug: product.slug,
                  productName: product.nombre,
                  productPrice: product.precio,
                  quantity: 1,
                  groupId,
                  groupSlug,
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-600 transition-colors hover:bg-green-50"
            >
              <BsWhatsapp className="text-sm" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};
