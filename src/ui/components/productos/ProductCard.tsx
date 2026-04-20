"use client";

import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { textosFont, tituloCard } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { reportOperationalWarning } from "@/lib/observability/operationalLogger";
import { AddFavorites } from "./AddFavorites";
import { Precio } from "./Precio";
import {
  ProductRedSocial,
} from "@/interfaces/productRedSocial.interface";
import { motion, AnimatePresence } from "framer-motion";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { createPortal } from "react-dom";
import {
  buildVariantLabel,
  getVariantOptionSummary,
  getVariantTitle,
} from "./variantDisplay";
import {
  trackAnalyticsEvent,
  type EventSource,
  type NavigationMode,
} from "@/analytics/events";

interface ProductCardProps {
  product: ProductRedSocial;
  analyticsContext?: {
    negocioSlug?: string;
    navigationMode?: NavigationMode;
    source?: EventSource;
    groupId?: string;
    groupSlug?: string;
    sectionId?: string;
    sectionSlug?: string;
    position?: number;
  };
}

const urlWebProduccion = empresa.linkWebProduccion;
const FALLBACK_PRODUCT_IMAGE = PLACEHOLDER_PRODUCT_IMAGE;
const FALLBACK_PROFILE_IMAGE = PLACEHOLDER_BUSINESS_IMAGE;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

export const ProductCard: React.FC<ProductCardProps> = ({ product, analyticsContext }) => {
  const productImages = Array.isArray(product.imagenes)
    ? product.imagenes.filter(isRenderableImageSource)
    : [];
  const primaryImage = productImages[0] || FALLBACK_PRODUCT_IMAGE;
  const secondaryImage = productImages[1] || primaryImage;

  const [displayImage, setDisplayImage] = useState(primaryImage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [modalRoot, setModalRoot] = useState<Element | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);
  const analyticsNegocioSlug = analyticsContext?.negocioSlug ?? product.slugNegocio ?? "";
  const analyticsNavigationMode = analyticsContext?.navigationMode ?? "traditional";
  const analyticsSource = analyticsContext?.source ?? "productos_tab";
  const detailHref = useMemo(() => {
    const params = new URLSearchParams();

    if (analyticsContext && product.slugNegocio) {
      params.set("from", "profile-products");

      if (analyticsContext.groupSlug) {
        params.set("group", analyticsContext.groupSlug);
      } else if (
        analyticsContext.navigationMode === "traditional" &&
        analyticsContext.sectionSlug
      ) {
        params.set("section", analyticsContext.sectionSlug);
      }
    }

    const queryString = params.toString();
    return queryString ? `/producto/${product.slug}?${queryString}` : `/producto/${product.slug}`;
  }, [analyticsContext, product.slug, product.slugNegocio]);

  const telefonoLimpio = product.telefonoContacto?.replace(/\D/g, "") ?? "";

  const activeVariants = useMemo(
    () => (product.variantes ?? []).filter((variant) => variant.isActive),
    [product.variantes]
  );

  const hasVariants = product.usaVariantes === true && activeVariants.length > 0;

  const selectedVariant = useMemo(
    () =>
      hasVariants
        ? activeVariants.find((variant) => variant.id === selectedVariantId) ?? null
        : null,
    [activeVariants, hasVariants, selectedVariantId]
  );

  const minVariantPrice = useMemo(() => {
    if (!hasVariants || activeVariants.length === 0) return null;

    const variantPrices = activeVariants
      .map((variant) => variant.precio)
      .filter((price): price is number => typeof price === "number" && !Number.isNaN(price));

    if (variantPrices.length === 0) return null;

    return Math.min(...variantPrices);
  }, [activeVariants, hasVariants]);

  const displayPrice = minVariantPrice ?? product.precio;
  const shouldShowFromPrice = hasVariants && minVariantPrice !== null;
  const modalDisplayPrice = selectedVariant?.precio ?? minVariantPrice ?? product.precio;

  const variantHasLimitedStock =
    selectedVariant?.stockIlimitado === false &&
    typeof selectedVariant?.stock === "number";

  const variantStock = variantHasLimitedStock ? selectedVariant?.stock ?? null : null;

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

  const isCartDisabled = hasVariants ? areAllVariantsOutOfStock : isOutOfStock;

  useEffect(() => {
    setDisplayImage(primaryImage);
  }, [primaryImage]);

  useEffect(() => {
    if (hasVariants) {
      const selectedExists = activeVariants.some(
        (variant) => variant.id === selectedVariantId
      );

      if (selectedVariantId && !selectedExists) {
        setSelectedVariantId(null);
      }

      return;
    }

    if (selectedVariantId) {
      setSelectedVariantId(null);
    }
  }, [activeVariants, hasVariants, selectedVariantId]);

  useEffect(() => {
    const root = document.getElementById("modal-root") || document.body;
    setModalRoot(root);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  useEffect(() => {
    setQuantity((prev) => {
      if (typeof currentMaxStock === "number") {
        return Math.max(1, Math.min(prev, currentMaxStock));
      }

      return Math.max(1, prev);
    });
  }, [currentMaxStock]);

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
      `*${product.nombre}*\n` +
      `${shouldShowFromPrice ? "Precio desde" : "Precio"}: ${formatCurrency(displayPrice)}\n\n` +
      `${hasVariants ? "Veo que tiene opciones o variantes, me gustaría más información.\n\n" : ""}` +
      `Puedes ver más detalles aquí: ${urlWebProduccion}/producto/${product.slug}`
  );

  const handleAddToCart = useCallback(() => {
    if (!product.slugNegocio) {
      reportOperationalWarning({
        area: "product-card",
        event: "product_card_missing_business_slug",
        message: "Se intento agregar al carrito un producto sin slug de negocio.",
        context: {
          productId: product.id,
          productSlug: product.slug,
          source: analyticsSource,
        },
        dedupeKey: `product-card-missing-business-slug:${product.id}`,
      });

      return;
    }

    if (hasVariants && !selectedVariant) {
      return;
    }

    if (isOutOfStock) {
      return;
    }

    const effectivePrice = selectedVariant?.precio ?? product.precio;
    const effectiveImage = resolveSafeImageSource(selectedVariant?.imagenUrl, primaryImage);
    const effectiveStock = selectedVariant?.stock ?? product.stock ?? null;
    const effectiveStockIlimitado = selectedVariant
      ? selectedVariant.stockIlimitado ?? true
      : (product.stockIlimitado ?? true);

    // Track event
    trackAnalyticsEvent({
      event: "product_add_to_cart_clicked",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: analyticsNavigationMode,
      source: analyticsSource,
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: effectivePrice,
      variantId: selectedVariant?.id,
      quantity,
      groupId: analyticsContext?.groupId,
      groupSlug: analyticsContext?.groupSlug,
    });

    const cartProduct = {
      cartItemId: `${product.id}-${selectedVariant?.id ?? "base"}-${Date.now()}`,
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      precio: effectivePrice,
      cantidad: quantity,
      imagen: effectiveImage,
      seccionIds: product.sections,
      descripcionCorta: product.descripcionCorta ?? "",
      negocioFotoPerfil: product.negocioFotoPerfil,
      usaVariantes: hasVariants,
      productVariantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariant ? buildVariantLabel(selectedVariant) : null,
      stock: effectiveStock,
      stockIlimitado: effectiveStockIlimitado,
    };

    addProductToCart(product.slugNegocio, cartProduct);
    setIsModalOpen(false);
    setShowSuccess(true);
    setQuantity(1);

    window.setTimeout(() => setShowSuccess(false), 1000);
  }, [
    addProductToCart,
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    hasVariants,
    isOutOfStock,
    primaryImage,
    product,
    quantity,
    selectedVariant,
  ]);

  const trackProductCardClick = useCallback(() => {
    trackAnalyticsEvent({
      event: "product_card_clicked",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: analyticsNavigationMode,
      source: analyticsSource,
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: displayPrice,
      position: analyticsContext?.position,
      groupId: analyticsContext?.groupId,
      groupSlug: analyticsContext?.groupSlug,
    });
  }, [
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsContext?.position,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    displayPrice,
    product.id,
    product.nombre,
    product.slug,
  ]);

  const handleDetailLinkClick = useCallback(() => {
    trackProductCardClick();
  }, [trackProductCardClick]);

  const handleWhatsAppClick = useCallback(() => {
    trackAnalyticsEvent({
      event: "product_whatsapp_clicked",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: analyticsNavigationMode,
      source: analyticsSource,
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: selectedVariant?.precio ?? displayPrice,
      variantId: selectedVariant?.id,
      quantity,
      groupId: analyticsContext?.groupId,
      groupSlug: analyticsContext?.groupSlug,
    });
  }, [
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    displayPrice,
    product.id,
    product.nombre,
    product.slug,
    quantity,
    selectedVariant?.id,
    selectedVariant?.precio,
  ]);

  const handleOpenCartFlow = useCallback(() => {
    trackProductCardClick();

    trackAnalyticsEvent({
      event: "product_detail_viewed",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: analyticsNavigationMode,
      source: analyticsSource,
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: displayPrice,
      groupId: analyticsContext?.groupId,
      groupSlug: analyticsContext?.groupSlug,
      hasVariants,
    });

    setQuantity(1);
    setIsModalOpen(true);
  }, [
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    displayPrice,
    hasVariants,
    product,
    trackProductCardClick,
  ]);

  const ModalContent = (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setIsModalOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="mb-3 text-left text-base font-semibold text-gray-900">
              Agregar al carrito
            </h5>

            <div className="mb-4 border-b border-gray-100 pb-4 text-left">
              <p className="text-lg font-bold leading-tight text-gray-800">{product.nombre}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                {shouldShowFromPrice && !selectedVariant ? "Desde " : ""}
                {formatCurrency(modalDisplayPrice)}
              </p>

              {hasVariants && (
                <p className="mt-1 text-xs text-gray-500">
                  Elige la variante que quieres agregar.
                </p>
              )}

              {productHasLimitedStock && (
                <p className="mt-1 text-xs text-gray-500">
                  Stock disponible: {product.stock}
                </p>
              )}
            </div>

            {hasVariants && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Variantes
                </p>
                <div className="space-y-2">
                  {activeVariants.map((variant, index) => {
                    const optionSummary = getVariantOptionSummary(variant);
                    const variantOutOfStock =
                      variant.stockIlimitado === false &&
                      typeof variant.stock === "number" &&
                      variant.stock <= 0;
                    const stockSummary =
                      variant.stockIlimitado === false &&
                      typeof variant.stock === "number"
                        ? variant.stock > 0
                          ? `Stock: ${variant.stock}`
                          : "Sin stock"
                        : null;
                    const secondaryText = [optionSummary, stockSummary]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId((current) =>
                            current === variant.id ? null : variant.id
                          );
                          setQuantity(1);
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                          selectedVariantId === variant.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        } ${variantOutOfStock ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              selectedVariantId === variant.id
                                ? "border-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedVariantId === variant.id && (
                              <span className="h-2 w-2 rounded-full bg-blue-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-800">
                                  {getVariantTitle(variant, index)}
                                </p>
                                {secondaryText && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                    {secondaryText}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-sm font-semibold text-gray-900">
                                {formatCurrency(variant.precio ?? product.precio)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasVariants && !selectedVariant && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Selecciona una variante antes de continuar.
              </div>
            )}

            {selectedVariant && (
              <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                <span className="font-semibold">Elegida:</span>{" "}
                <span className="text-blue-800">{buildVariantLabel(selectedVariant)}</span>
              </div>
            )}

            {((hasVariants && selectedVariant) || !hasVariants) && (
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Cantidad</p>
                    {typeof currentMaxStock === "number" && (
                      <p className="text-xs text-gray-500">
                        Stock disponible: {currentMaxStock}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-lg font-bold text-gray-800 transition-colors duration-200 hover:bg-gray-100"
                      aria-label="Disminuir cantidad"
                    >
                      –
                    </button>

                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
                        if (typeof currentMaxStock === "number") {
                          setQuantity(Math.min(nextValue, currentMaxStock));
                          return;
                        }
                        setQuantity(nextValue);
                      }}
                      className="w-12 border-x border-gray-200 py-1.5 text-center text-base font-semibold text-gray-900 focus:outline-none"
                      min="1"
                      max={typeof currentMaxStock === "number" ? currentMaxStock : undefined}
                      aria-label="Cantidad del producto"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setQuantity((q) => {
                          const next = q + 1;
                          if (typeof currentMaxStock === "number") {
                            return Math.min(next, currentMaxStock);
                          }
                          return next;
                        });
                      }}
                      className="px-3 py-1.5 text-lg font-bold text-gray-800 transition-colors duration-200 hover:bg-gray-100"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-full bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-200"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={(hasVariants && !selectedVariant) || isOutOfStock}
                className="flex-1 rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isOutOfStock ? "Sin stock" : "Agregar al carrito"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ToastContent = (
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
          <div className="rounded-2xl border-2 border-green-600 bg-white/90 px-8 py-4 text-center text-lg font-semibold text-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] backdrop-blur-md">
            ✅ ¡Producto agregado al carrito!
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="relative mx-auto flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-lg transition-all duration-300 hover:shadow-2xl"
    >
      <div className="mb-3 flex items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <Image
              src={resolveSafeImageSource(product.negocioFotoPerfil, FALLBACK_PROFILE_IMAGE)}
              alt={`Perfil de ${product.nombreNegocio ?? "negocio"}`}
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>

          {product.nombreNegocio && product.slugNegocio ? (
            <Link
              href={`/perfil/${product.slugNegocio}`}
              className={`truncate text-md font-semibold text-gray-800 transition-colors duration-200 hover:text-blue-700 sm:text-sm ${tituloCard.className}`}
            >
              {product.nombreNegocio}
            </Link>
          ) : (
            <span
              className={`truncate text-md font-semibold text-gray-800 sm:text-sm ${tituloCard.className}`}
            >
              {product.nombreNegocio ?? "Negocio"}
            </span>
          )}
        </div>

        <div className="flex items-center">
          <FollowButton
            followedId={product.negocioId}
            version={2}
            type="USER_TO_BUSINESS"
            className="text-sm"
          />

          <div className="z-20 ml-2">
            <AddFavorites
              id={product.id}
              title={product.nombre}
              price={product.precio}
              description={product.descripcion}
              slug={product.slug}
              images={product.imagenes}
              descripcionCorta={product.descripcionCorta ?? ""}
              sections={product.sections}
              slugNegocio={product.slugNegocio || ""}
            />
          </div>
        </div>
      </div>

      <Link href={detailHref} onClick={handleDetailLinkClick} className="relative block">
        <div
          className="relative h-64 w-full cursor-pointer overflow-hidden rounded-xl"
          onMouseEnter={() => {
            if (secondaryImage !== displayImage) {
              setDisplayImage(secondaryImage);
            }
          }}
          onMouseLeave={() => {
            setDisplayImage(primaryImage);
          }}
        >
          <Image
            src={displayImage}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-[1.04]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-100" />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            {hasVariants && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
                Variantes
              </span>
            )}

            {product.etiquetaEspecial && product.etiquetaEspecial !== "ninguna" && (
              <span className="rounded-full bg-blue-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                {product.etiquetaEspecial.replaceAll("_", " ")}
              </span>
            )}

            {isOutOfStock && (
              <span className="rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                Agotado
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2 flex flex-grow flex-col justify-between">
        <div>
          <Link href={detailHref} onClick={handleDetailLinkClick} className="block">
            <h3
              className={`text-lg font-extrabold text-gray-800 transition duration-300 hover:text-blue-700 ${tituloCard.className}`}
              style={{ textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.08)" }}
            >
              {product.nombre}
            </h3>
          </Link>

          <p className={`mt-1 line-clamp-2 text-lg text-gray-600 ${textosFont.className}`}>
            {product.descripcionCorta || "Sin descripción disponible"}
          </p>
        </div>

        <div className="m-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {shouldShowFromPrice ? (
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Desde
                  </span>
                  <Precio value={displayPrice} />
                </div>
              ) : (
                <Precio value={displayPrice} />
              )}
            </div>

            <div className="flex items-center gap-3">
              {product.telefonoContacto && telefonoLimpio && (
                <Link
                  href={`https://wa.me/${telefonoLimpio}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  aria-label={`Contactar por WhatsApp sobre ${product.nombre}`}
                  className="flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600 p-3 transition-all duration-300 hover:from-green-600 hover:to-green-700"
                >
                  <BsWhatsapp className="text-2xl text-white sm:text-xl" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleOpenCartFlow}
                disabled={isCartDisabled}
                aria-label={
                  hasVariants
                    ? `Seleccionar variantes de ${product.nombre}`
                    : `Agregar ${product.nombre} al carrito`
                }
                className="flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-3 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
              >
                <FaShoppingCart className="text-2xl text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

              {modalRoot && createPortal(ModalContent, modalRoot)}
      {modalRoot && createPortal(ToastContent, modalRoot)}
    </motion.div>
  );
};
