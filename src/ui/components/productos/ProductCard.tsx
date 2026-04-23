"use client";

import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { textosFont, tituloCard } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { logProductImageDiagnostics } from "@/lib/media/productImageDiagnostics";
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
import { ProductQuickAddModal } from "./ProductQuickAddModal";
import { useQuickAddSelection } from "./useQuickAddSelection";
import { buildVariantLabel } from "./variantDisplay";
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
  const rawProductImages = useMemo(
    () => (Array.isArray(product.imagenes) ? product.imagenes : []),
    [product.imagenes],
  );
  const productImages = useMemo(
    () => rawProductImages.filter(isRenderableImageSource),
    [rawProductImages],
  );
  const discardedImageCount = rawProductImages.length - productImages.length;
  const primaryImage = productImages[0] || FALLBACK_PRODUCT_IMAGE;
  const secondaryImage = productImages[1] || primaryImage;

  const [displayImage, setDisplayImage] = useState(primaryImage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [modalRoot, setModalRoot] = useState<Element | null>(null);
  const quickAddCloseReasonRef = useRef<"dismissed" | "cancelled" | "completed" | null>(null);
  const quickAddWasOpenRef = useRef(false);
  const safeDisplayImage = resolveSafeImageSource(
    displayImage,
    FALLBACK_PRODUCT_IMAGE,
  );

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);
  const analyticsNegocioSlug = analyticsContext?.negocioSlug ?? product.slugNegocio ?? "";
  const analyticsNavigationMode = analyticsContext?.navigationMode ?? "traditional";
  const analyticsSource = analyticsContext?.source ?? "productos_tab";
  const {
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
    modalDisplayPrice,
    shouldShowFromPrice,
    currentMaxStock,
    isOutOfStock,
    isActionDisabled,
    requiresVariantSelection,
    effectivePrice,
    effectiveStock,
    effectiveStockIlimitado,
    selectedVariantLabel,
  } = useQuickAddSelection(product);

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
  const hasSingleActiveVariant = hasVariants && activeVariants.length === 1 && !!selectedVariant;
  const hasMultipleVariantChoices = hasVariants && activeVariants.length > 1;
  const pricePrefixLabel = shouldShowFromPrice ? "Desde" : "Precio";

  useEffect(() => {
    setDisplayImage(primaryImage);
  }, [primaryImage]);

  useEffect(() => {
    if (rawProductImages.length > 0 && discardedImageCount === 0) {
      return;
    }

    logProductImageDiagnostics({
      area: "product-card",
      event: "card_images_received",
      message: "Shape de imágenes recibido por ProductCard.",
      product: {
        id: product.id,
        slug: product.slug,
        nombre: product.nombre,
        status: product.status,
        negocioSlug: product.slugNegocio,
      },
      imageUrls: rawProductImages,
      selectedImageUrl: primaryImage,
      context: {
        rawImageCount: rawProductImages.length,
        renderableImageCount: productImages.length,
        discardedImageCount,
        analyticsSource,
      },
      level:
        rawProductImages.length === 0 || discardedImageCount > 0
          ? "warn"
          : "info",
      dedupeKey: `product-card-images:${product.id}:${rawProductImages.join("|")}`,
    });
  }, [
    analyticsSource,
    discardedImageCount,
    primaryImage,
    product.id,
    product.nombre,
    product.slug,
    product.slugNegocio,
    product.status,
    productImages.length,
    rawProductImages,
  ]);

  const handleProductImageError = useCallback(() => {
    logProductImageDiagnostics({
      area: "product-card",
      event: "card_image_render_failed",
      message: "next/image no pudo renderizar la imagen principal de la card.",
      product: {
        id: product.id,
        slug: product.slug,
        nombre: product.nombre,
        status: product.status,
        negocioSlug: product.slugNegocio,
      },
      imageUrls: rawProductImages,
      selectedImageUrl: safeDisplayImage,
      context: {
        analyticsSource,
        fallbackImage: FALLBACK_PRODUCT_IMAGE,
      },
      level: "warn",
      dedupeKey: `product-card-render-failed:${product.id}:${safeDisplayImage}`,
    });

    if (safeDisplayImage !== FALLBACK_PRODUCT_IMAGE) {
      setDisplayImage(FALLBACK_PRODUCT_IMAGE);
    }
  }, [
    analyticsSource,
    product.id,
    product.nombre,
    product.slug,
    product.slugNegocio,
    product.status,
    rawProductImages,
    safeDisplayImage,
  ]);

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
    if (isModalOpen && !quickAddWasOpenRef.current) {
      quickAddWasOpenRef.current = true;
      quickAddCloseReasonRef.current = null;

      trackAnalyticsEvent({
        event: "product_quick_add_opened",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: analyticsNavigationMode,
        source: analyticsSource,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: displayPrice,
        hasVariants,
        availableVariantCount: activeVariants.length,
        groupId: analyticsContext?.groupId,
        groupSlug: analyticsContext?.groupSlug,
      });

      return;
    }

    if (!isModalOpen && quickAddWasOpenRef.current) {
      quickAddWasOpenRef.current = false;

      trackAnalyticsEvent({
        event: "product_quick_add_closed",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: analyticsNavigationMode,
        source: analyticsSource,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: effectivePrice,
        hadVariantSelected: Boolean(selectedVariant),
        selectedVariantId: selectedVariant?.id,
        quantity,
        closeReason: quickAddCloseReasonRef.current ?? "dismissed",
        groupId: analyticsContext?.groupId,
        groupSlug: analyticsContext?.groupSlug,
      });

      quickAddCloseReasonRef.current = null;
    }
  }, [
    activeVariants.length,
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    displayPrice,
    effectivePrice,
    hasVariants,
    isModalOpen,
    product.id,
    product.nombre,
    product.slug,
    quantity,
    selectedVariant,
  ]);

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
      `*${product.nombre}*\n` +
      `${shouldShowFromPrice ? "Precio desde" : "Precio"}: ${formatCurrency(displayPrice)}\n\n` +
      `${hasVariants ? "Veo que tiene opciones o variantes, me gustaría más información.\n\n" : ""}` +
      `Puedes ver más detalles aquí: ${urlWebProduccion}/producto/${product.slug}`
  );

  const handleAddToCart = useCallback((quantityToAdd = quantity, entryPoint: "direct" | "modal" = "modal") => {
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
      trackAnalyticsEvent({
        event: "product_variant_selection_required",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: analyticsNavigationMode,
        source: analyticsSource,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: displayPrice,
        availableVariantCount: activeVariants.length,
        groupId: analyticsContext?.groupId,
        groupSlug: analyticsContext?.groupSlug,
      });
      return;
    }

    if (isOutOfStock) {
      return;
    }

    const effectiveImage = resolveSafeImageSource(selectedVariant?.imagenUrl, primaryImage);

    if (entryPoint === "direct") {
      trackAnalyticsEvent({
        event: "product_card_direct_add_to_cart_clicked",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: analyticsNavigationMode,
        source: analyticsSource,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: effectivePrice,
        variantId: selectedVariant?.id,
        quantity: quantityToAdd,
        groupId: analyticsContext?.groupId,
        groupSlug: analyticsContext?.groupSlug,
      });
    } else {
      trackAnalyticsEvent({
        event: "product_quick_add_confirmed",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: analyticsNavigationMode,
        source: analyticsSource,
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: effectivePrice,
        variantId: selectedVariant?.id,
        quantity: quantityToAdd,
        groupId: analyticsContext?.groupId,
        groupSlug: analyticsContext?.groupSlug,
      });
    }

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
      quantity: quantityToAdd,
      groupId: analyticsContext?.groupId,
      groupSlug: analyticsContext?.groupSlug,
    });

    const cartProduct = {
      cartItemId: `${product.id}-${selectedVariant?.id ?? "base"}-${Date.now()}`,
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      precio: effectivePrice,
      cantidad: quantityToAdd,
      imagen: effectiveImage,
      seccionIds: product.sections,
      descripcionCorta: product.descripcionCorta ?? "",
      negocioFotoPerfil: product.negocioFotoPerfil,
      usaVariantes: hasVariants,
      productVariantId: selectedVariant?.id ?? null,
      variantLabel: selectedVariantLabel,
      stock: effectiveStock,
      stockIlimitado: effectiveStockIlimitado,
    };

    addProductToCart(product.slugNegocio, cartProduct);
    quickAddCloseReasonRef.current = entryPoint === "modal" ? "completed" : null;
    setIsModalOpen(false);
    setShowSuccess(true);
    resetQuantity();

    window.setTimeout(() => setShowSuccess(false), 1000);
  }, [
    addProductToCart,
    analyticsContext?.groupId,
    analyticsContext?.groupSlug,
    analyticsNavigationMode,
    analyticsNegocioSlug,
    analyticsSource,
    displayPrice,
    effectivePrice,
    effectiveStock,
    effectiveStockIlimitado,
    hasVariants,
    isOutOfStock,
    activeVariants.length,
    primaryImage,
    product,
    quantity,
    resetQuantity,
    selectedVariant,
    selectedVariantLabel,
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
    resetQuantity();
    setIsModalOpen(true);
  }, [
    resetQuantity,
  ]);

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
            src={safeDisplayImage}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={80}
            onError={handleProductImageError}
            className="object-cover transition-transform duration-300 hover:scale-[1.04]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-100" />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            {hasVariants && (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
                {activeVariants.length === 1 ? "1 opcion" : "Variantes"}
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
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {pricePrefixLabel}
                </span>
                <Precio value={displayPrice} />
              </div>

              {hasSingleActiveVariant && selectedVariantLabel && (
                <p className="mt-1 text-xs text-gray-500">{selectedVariantLabel}</p>
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
                disabled={isActionDisabled}
                aria-label={
                  isActionDisabled
                    ? `${product.nombre} agotado`
                    : hasMultipleVariantChoices
                      ? `Elegir opciones de ${product.nombre}`
                      : `Agregar ${product.nombre} al carrito`
                }
                className="flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-3 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-80"
              >
                <FaShoppingCart className="text-2xl text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalRoot &&
        createPortal(
          <ProductQuickAddModal
            isOpen={isModalOpen}
            onClose={(reason) => {
              quickAddCloseReasonRef.current = reason;
              setIsModalOpen(false);
              resetSelectionState();
            }}
            productName={product.nombre}
            fallbackPrice={product.precio}
            hasVariants={hasVariants}
            activeVariants={activeVariants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={(variantId) => {
              selectVariant(variantId);

              const nextVariant = activeVariants.find((variant) => variant.id === variantId);
              if (!nextVariant) {
                return;
              }

              trackAnalyticsEvent({
                event: "product_variant_selected",
                timestamp: Date.now(),
                negocioSlug: analyticsNegocioSlug,
                navigationMode: analyticsNavigationMode,
                source: analyticsSource,
                productId: product.id,
                productSlug: product.slug,
                productName: product.nombre,
                productPrice: nextVariant.precio ?? product.precio,
                variantId: nextVariant.id,
                variantLabel: buildVariantLabel(nextVariant),
                availableVariantCount: activeVariants.length,
                groupId: analyticsContext?.groupId,
                groupSlug: analyticsContext?.groupSlug,
              });
            }}
            selectedVariantLabel={selectedVariantLabel}
            modalDisplayPrice={modalDisplayPrice}
            shouldShowFromPrice={hasVariants && shouldShowFromPrice && !selectedVariant}
            currentMaxStock={currentMaxStock}
            quantity={quantity}
            onQuantityChange={updateQuantity}
            onDecreaseQuantity={decrementQuantity}
            onIncreaseQuantity={incrementQuantity}
            requiresVariantSelection={requiresVariantSelection}
            isOutOfStock={isOutOfStock}
            isActionDisabled={isActionDisabled}
            onConfirm={() => handleAddToCart(quantity, "modal")}
          />,
          modalRoot
        )}
      {modalRoot && createPortal(ToastContent, modalRoot)}
    </motion.div>
  );
};
