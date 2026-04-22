"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BsWhatsapp } from "react-icons/bs";
import { InfoEmpresa } from "@/config/config";
import { IoMdClose } from "react-icons/io";
import { HiOutlineCube } from "react-icons/hi";
import Link from "next/link";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import Divider from "../divider/Divider";
import { useSession } from "next-auth/react";
import { FaComment, FaShoppingCart } from "react-icons/fa";
import { ModalPublicaciones } from "@/publicaciones/componentes/ModalPublicaciones";
import { AddFavorites } from "./AddFavorites";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { reportOperationalWarning } from "@/lib/observability/operationalLogger";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { motion, AnimatePresence } from "framer-motion";
import { textosFont, titleFont, titulosPrincipales } from "@/config/fonts";
import FormCrearResenaProducto from "@/resenas/componentes/FormCrearResenaProducto";
import { buildVariantLabel } from "./variantDisplay";
import { ProductQuickAddModal } from "./ProductQuickAddModal";
import { useQuickAddSelection } from "./useQuickAddSelection";
import { trackAnalyticsEvent } from "@/analytics/events";

interface AddToCartProps {
  product: ProductRedSocial;
  telefonoNegocio?: string;
}

type SuccessType = "cart" | "review" | null;

const FALLBACK_IMAGE = PLACEHOLDER_PRODUCT_IMAGE;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

export const DetallesProducto: React.FC<AddToCartProps> = ({
  product,
  telefonoNegocio,
}) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isComponentsModalOpen, setIsComponentsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const quickAddCloseReasonRef = useRef<"dismissed" | "cancelled" | "completed" | null>(null);
  const quickAddWasOpenRef = useRef(false);
  const [successType, setSuccessType] = useState<SuccessType>(null);
  const detailTrackedRef = useRef<string | null>(null);

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);

  const telefonoLimpio = telefonoNegocio?.replace(/\D/g, "") ?? "";
  const analyticsNegocioSlug = product.slugNegocio ?? "";
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
    showFromPrice,
    currentMaxStock,
    areAllVariantsOutOfStock,
    isOutOfStock,
    isActionDisabled,
    requiresVariantSelection,
    effectivePrice,
    effectiveStock,
    effectiveStockIlimitado,
    selectedVariantLabel,
  } = useQuickAddSelection(product);

  const safePrimaryImage = useMemo(
    () => product.imagenes?.find(isRenderableImageSource) ?? FALLBACK_IMAGE,
    [product.imagenes]
  );
  const hasProductSpecs = Boolean(product.componentes?.length || product.atributos?.length);

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
      `*${product.nombre}*\n` +
      `${showFromPrice ? "Precio desde" : "Precio"}: ${formatCurrency(displayPrice)}\n` +
      `${selectedVariantLabel ? `Variante: ${selectedVariantLabel}\n` : ""}\n` +
      `Puedes ver más detalles aquí:\n` +
      `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`
  );

  const whatsappUrl = `https://wa.me/${telefonoLimpio}?text=${whatsappMessage}`;

  useEffect(() => {
    if (detailTrackedRef.current === product.id) {
      return;
    }

    detailTrackedRef.current = product.id;

    trackAnalyticsEvent({
      event: "product_detail_viewed",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: "traditional",
      source: "detalle_producto",
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: displayPrice,
      hasVariants,
    });
  }, [analyticsNegocioSlug, displayPrice, hasVariants, product.id, product.nombre, product.slug]);

  useEffect(() => {
    if (isCartModalOpen || isComponentsModalOpen || isReviewModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartModalOpen, isComponentsModalOpen, isReviewModalOpen]);

  useEffect(() => {
    if (isCartModalOpen && !quickAddWasOpenRef.current) {
      quickAddWasOpenRef.current = true;
      quickAddCloseReasonRef.current = null;

      trackAnalyticsEvent({
        event: "product_quick_add_opened",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: "traditional",
        source: "detalle_producto",
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: displayPrice,
        hasVariants,
        availableVariantCount: activeVariants.length,
      });

      return;
    }

    if (!isCartModalOpen && quickAddWasOpenRef.current) {
      quickAddWasOpenRef.current = false;

      trackAnalyticsEvent({
        event: "product_quick_add_closed",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: "traditional",
        source: "detalle_producto",
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: effectivePrice,
        hadVariantSelected: Boolean(selectedVariant),
        selectedVariantId: selectedVariant?.id,
        quantity,
        closeReason: quickAddCloseReasonRef.current ?? "dismissed",
      });

      quickAddCloseReasonRef.current = null;
    }
  }, [
    activeVariants.length,
    analyticsNegocioSlug,
    displayPrice,
    effectivePrice,
    hasVariants,
    isCartModalOpen,
    product.id,
    product.nombre,
    product.slug,
    quantity,
    selectedVariant,
  ]);

  const openCartModal = () => {
    if (isActionDisabled) {
      return;
    }

    if (!hasVariants) {
      handleAddToCart(1, "direct");
      return;
    }

    resetQuantity();
    setIsCartModalOpen(true);
  };

  const closeCartModal = () => {
    setIsCartModalOpen(false);
    resetSelectionState();
  };

  const handleAddToCart = (
    quantityToAdd = quantity,
    entryPoint: "direct" | "modal" = "modal"
  ) => {
    if (!product.slugNegocio) {
      reportOperationalWarning({
        area: "product-detail",
        event: "product_detail_missing_business_slug",
        message: "Se intento agregar al carrito desde detalle sin slug de negocio.",
        context: {
          productId: product.id,
          productSlug: product.slug,
        },
        dedupeKey: `product-detail-missing-business-slug:${product.id}`,
      });

      return;
    }

    if (hasVariants && !selectedVariant) {
      trackAnalyticsEvent({
        event: "product_variant_selection_required",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: "traditional",
        source: "detalle_producto",
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: displayPrice,
        availableVariantCount: activeVariants.length,
      });

      return;
    }

    if (isOutOfStock) {
      return;
    }

    const effectiveImage = resolveSafeImageSource(selectedVariant?.imagenUrl, safePrimaryImage);

    if (entryPoint === "modal") {
      trackAnalyticsEvent({
        event: "product_quick_add_confirmed",
        timestamp: Date.now(),
        negocioSlug: analyticsNegocioSlug,
        navigationMode: "traditional",
        source: "detalle_producto",
        productId: product.id,
        productSlug: product.slug,
        productName: product.nombre,
        productPrice: effectivePrice,
        variantId: selectedVariant?.id,
        quantity: quantityToAdd,
      });
    }

    trackAnalyticsEvent({
      event: "product_add_to_cart_clicked",
      timestamp: Date.now(),
      negocioSlug: analyticsNegocioSlug,
      navigationMode: "traditional",
      source: "detalle_producto",
      productId: product.id,
      productSlug: product.slug,
      productName: product.nombre,
      productPrice: effectivePrice,
      variantId: selectedVariant?.id,
      quantity: quantityToAdd,
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
    closeCartModal();
    setSuccessType("cart");
    setShowSuccess(true);

    window.setTimeout(() => {
      setShowSuccess(false);
      setSuccessType(null);
    }, 2500);
  };

  const handleReviewSuccess = () => {
    setIsReviewModalOpen(false);
    setSuccessType("review");
    setShowSuccess(true);

    window.setTimeout(() => {
      setShowSuccess(false);
      setSuccessType(null);
    }, 2500);
  };

  return (
    <div
      className="mb-10 flex flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-md sm:mt-10 md:mb-20"
      data-testid="product-detail-view"
    >
      <div className="text-center">
        <h1
          className={`break-words text-center text-2xl font-semibold leading-snug text-gray-800 sm:text-3xl md:text-4xl ${titleFont.className}`}
        >
          {product.nombre}
        </h1>

        <Divider />

        <div className="mt-0">
          <span
            className={`text-md font-semibold text-gray-800 ${titulosPrincipales.className}`}
          >
            {showFromPrice ? "Precio desde:" : "Precio:"}
          </span>

          <div className="mt-1 text-4xl font-extrabold tracking-tight text-gray-800">
            {formatCurrency(displayPrice)}
          </div>

          {hasVariants && (
            <p className={`mt-2 text-sm text-gray-500 ${textosFont.className}`}>
              Este producto tiene opciones o variantes disponibles.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 py-2">
          {hasProductSpecs && (
            <button
              onClick={() => setIsComponentsModalOpen(true)}
              className="mt-0 flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-gray-800"
            >
              <HiOutlineCube className="text-lg" />
              Especificaciones
            </button>
          )}

          {hasVariants && (
            <button
              onClick={openCartModal}
              disabled={isActionDisabled}
              className="mt-0 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {areAllVariantsOutOfStock ? "Opciones sin stock" : "Ver opciones del producto"}
            </button>
          )}
        </div>

        <p className={`mt-2 text-md text-gray-600 ${textosFont.className}`}>
          {product.descripcion}
        </p>
      </div>

      <AnimatePresence>
        {isComponentsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setIsComponentsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Especificaciones del producto
                </h2>
                <button
                  onClick={() => setIsComponentsModalOpen(false)}
                  className="text-gray-500 transition-colors hover:text-gray-700"
                  aria-label="Cerrar modal de especificaciones"
                >
                  <IoMdClose className="text-2xl" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {product.componentes && product.componentes.length > 0 ? (
                  <ul className="space-y-3">
                    {product.componentes.map((componente, index) => (
                      <li
                        key={`${componente}-${index}`}
                        className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-none"
                      >
                        <HiOutlineCube className="text-xl text-gray-700" />
                        <p className="font-medium text-gray-700">{componente}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">
                    No hay componentes disponibles para este producto.
                  </p>
                )}

                {product.atributos && product.atributos.length > 0 && (
                  <div className="mt-5">
                    <h3 className="mb-3 text-base font-semibold text-gray-800">
                      Atributos adicionales
                    </h3>
                    <div className="space-y-2">
                      {product.atributos
                        .slice()
                        .sort((a, b) => a.orden - b.orden)
                        .map((atributo) => (
                          <div
                            key={atributo.id}
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                          >
                            <span className="font-medium text-gray-700">
                              {atributo.nombre}
                            </span>
                            <span className="text-gray-600">{atributo.valor}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsComponentsModalOpen(false)}
                className="mt-5 w-full rounded-xl bg-gray-900 py-3 font-bold text-white transition-all hover:bg-gray-800"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {product.telefonoContacto && telefonoLimpio && (
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="product-detail-whatsapp"
            onClick={() => {
              trackAnalyticsEvent({
                event: "product_whatsapp_clicked",
                timestamp: Date.now(),
                negocioSlug: analyticsNegocioSlug,
                navigationMode: "traditional",
                source: "detalle_producto",
                productId: product.id,
                productSlug: product.slug,
                productName: product.nombre,
                productPrice: displayPrice,
                variantId: selectedVariant?.id,
                quantity,
              });
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 font-bold text-white shadow-sm transition-all hover:bg-green-600"
          >
            <BsWhatsapp className="text-lg" />
            WhatsApp
          </Link>
        )}

        <AddFavorites
          id={product.id}
          title={product.nombre}
          price={product.precio}
          slug={product.slug}
          images={[safePrimaryImage]}
          descripcionCorta={product.descripcionCorta ?? ""}
          description={product.descripcion}
          sections={product.sections}
          slugNegocio={product.slugNegocio || ""}
        />

        <button
          onClick={openCartModal}
          disabled={isActionDisabled}
          data-testid="product-detail-cart-trigger"
          className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 font-semibold text-white transition-all duration-300 hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
          aria-label="Agregar producto al carrito"
        >
          <FaShoppingCart className="text-xl text-white" />
          <span>{isActionDisabled ? "Sin stock" : hasVariants ? "Elegir variante" : "Agregar al carrito"}</span>
        </button>
      </div>

      {session && (
        <div className="mt-0 flex w-full justify-center gap-4">
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#274494] px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-[#2c5282]"
            aria-label="Deja una reseña de este producto"
          >
            <FaComment className="text-lg" />
            Deja una reseña de este producto
          </button>
        </div>
      )}

      <AnimatePresence>
        {isReviewModalOpen && (
          <ModalPublicaciones
            onClose={() => setIsReviewModalOpen(false)}
            userId={userId}
          >
            <FormCrearResenaProducto
              productoId={product.id}
              productoNombre={product.nombre}
              productoDescripcion={product.descripcion}
              resenaId={undefined}
              onCancel={() => setIsReviewModalOpen(false)}
              onSuccess={handleReviewSuccess}
            />
          </ModalPublicaciones>
        )}
      </AnimatePresence>

      <ProductQuickAddModal
        isOpen={isCartModalOpen}
        onClose={(reason) => {
          quickAddCloseReasonRef.current = reason;
          closeCartModal();
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
            navigationMode: "traditional",
            source: "detalle_producto",
            productId: product.id,
            productSlug: product.slug,
            productName: product.nombre,
            productPrice: nextVariant.precio ?? product.precio,
            variantId: nextVariant.id,
            variantLabel: buildVariantLabel(nextVariant),
            availableVariantCount: activeVariants.length,
          });
        }}
        selectedVariantLabel={selectedVariantLabel}
        modalDisplayPrice={modalDisplayPrice}
        shouldShowFromPrice={showFromPrice}
        currentMaxStock={currentMaxStock}
        quantity={quantity}
        onQuantityChange={updateQuantity}
        onDecreaseQuantity={decrementQuantity}
        onIncreaseQuantity={incrementQuantity}
        requiresVariantSelection={requiresVariantSelection}
        isOutOfStock={isOutOfStock}
        isActionDisabled={isActionDisabled}
        onConfirm={() => handleAddToCart(quantity, "modal")}
      />

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl border-2 border-green-600 bg-white/90 px-8 py-4 text-center text-lg font-semibold text-green-600 shadow-[0_0_20px_rgba(34,197,94,0.35)] backdrop-blur-md">
              ✅{" "}
              {successType === "review"
                ? "¡Reseña enviada exitosamente!"
                : "¡Producto agregado al carrito!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
