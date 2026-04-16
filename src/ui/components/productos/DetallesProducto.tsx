"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { motion, AnimatePresence } from "framer-motion";
import { textosFont, titleFont, titulosPrincipales } from "@/config/fonts";
import FormCrearResenaProducto from "@/resenas/componentes/FormCrearResenaProducto";
import {
  buildVariantLabel,
  getVariantOptionSummary,
  getVariantTitle,
} from "./variantDisplay";

interface AddToCartProps {
  product: ProductRedSocial;
  telefonoNegocio?: string;
}

type SuccessType = "cart" | "review" | null;

const FALLBACK_IMAGE = "/imgs/no-image.png";

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
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<SuccessType>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);

  const telefonoLimpio = telefonoNegocio?.replace(/\D/g, "") ?? "";

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
    if (!hasVariants) return null;

    const prices = activeVariants
      .map((variant) => variant.precio)
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

    if (!prices.length) return null;
    return Math.min(...prices);
  }, [activeVariants, hasVariants]);

  const displayPrice = selectedVariant?.precio ?? minVariantPrice ?? product.precio;
  const showFromPrice = hasVariants && !selectedVariant && minVariantPrice !== null;

  const variantHasLimitedStock =
    selectedVariant &&
    selectedVariant.stockIlimitado === false &&
    typeof selectedVariant.stock === "number";

  const variantStock = variantHasLimitedStock ? selectedVariant?.stock ?? null : null;

  const productHasLimitedStock =
    !hasVariants &&
    product.stockIlimitado === false &&
    typeof product.stock === "number";

  const productStock = productHasLimitedStock ? product.stock ?? null : null;

  const currentMaxStock = hasVariants ? variantStock : productStock;

  const isOutOfStock = hasVariants
    ? !!selectedVariant &&
      selectedVariant.stockIlimitado === false &&
      typeof selectedVariant.stock === "number" &&
      selectedVariant.stock <= 0
    : product.stockIlimitado === false &&
      typeof product.stock === "number" &&
      product.stock <= 0;

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
      `*${product.nombre}*\n` +
      `${showFromPrice ? "Precio desde" : "Precio"}: ${formatCurrency(displayPrice)}\n` +
      `${selectedVariant ? `Variante: ${buildVariantLabel(selectedVariant)}\n` : ""}\n` +
      `Puedes ver más detalles aquí:\n` +
      `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`
  );

  const whatsappUrl = `https://wa.me/${telefonoLimpio}?text=${whatsappMessage}`;

  useEffect(() => {
    if (hasVariants && activeVariants.length === 1 && !selectedVariantId) {
      setSelectedVariantId(activeVariants[0].id);
    }
  }, [activeVariants, hasVariants, selectedVariantId]);

  useEffect(() => {
    setQuantity((prev) => {
      if (typeof currentMaxStock === "number") {
        return Math.max(1, Math.min(prev, currentMaxStock));
      }
      return Math.max(1, prev);
    });
  }, [currentMaxStock]);

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

  const openCartModal = () => {
    if (hasVariants && activeVariants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(activeVariants[0].id);
    }
    setQuantity(1);
    setIsCartModalOpen(true);
  };

  const closeCartModal = () => {
    setIsCartModalOpen(false);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!product.slugNegocio) {
      console.error("No se encontró el slug del negocio");
      return;
    }

    if (hasVariants && !selectedVariant) {
      return;
    }

    if (isOutOfStock) {
      return;
    }

    const effectivePrice = selectedVariant?.precio ?? product.precio;
    const effectiveImage = selectedVariant?.imagenUrl || product.imagenes?.[0] || FALLBACK_IMAGE;
    const effectiveStock = selectedVariant?.stock ?? product.stock ?? null;
    const effectiveStockIlimitado = selectedVariant
      ? selectedVariant.stockIlimitado
      : (product.stockIlimitado ?? true);

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
    <div className="mb-10 flex flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-md sm:mt-10 md:mb-20">
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
          <button
            onClick={() => setIsComponentsModalOpen(true)}
            className="mt-0 flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-gray-800"
          >
            <HiOutlineCube className="text-lg" />
            Especificaciones
          </button>

          {hasVariants && (
            <button
              onClick={openCartModal}
              className="mt-0 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100"
            >
              Ver opciones del producto
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
          images={product.imagenes?.[0] ? [product.imagenes[0]] : []}
          descripcionCorta={product.descripcionCorta ?? ""}
          description={product.descripcion}
          sections={product.sections}
          slugNegocio={product.slugNegocio || ""}
        />

        <button
          onClick={openCartModal}
          className="flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-3 transition-all duration-300 hover:from-blue-600 hover:to-blue-700"
          aria-label="Agregar producto al carrito"
        >
          <FaShoppingCart className="text-xl text-white" />
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

      <AnimatePresence>
        {isCartModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
            onClick={closeCartModal}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeCartModal}
                className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-700"
                aria-label="Cerrar modal de carrito"
              >
                <IoMdClose className="text-2xl" />
              </button>

              <h5 className="mb-3 text-left text-base font-semibold text-gray-900">
                Agregar al carrito
              </h5>

              <div className="mb-4 border-b border-gray-100 pb-4 text-left">
                <p className="text-lg font-bold leading-tight text-gray-900">{product.nombre}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                  {showFromPrice ? "Desde " : ""}
                  {formatCurrency(displayPrice)}
                </p>

                {hasVariants && (
                  <p className="mt-1 text-xs text-gray-500">
                    Elige la variante que quieres agregar.
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
                            setSelectedVariantId(variant.id);
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
                          const parsed = Math.max(1, parseInt(e.target.value, 10) || 1);

                          if (typeof currentMaxStock === "number") {
                            setQuantity(Math.min(parsed, currentMaxStock));
                            return;
                          }

                          setQuantity(parsed);
                        }}
                        className="w-12 border-x border-gray-200 py-1.5 text-center text-base font-semibold text-gray-900 focus:outline-none"
                        min="1"
                        max={typeof currentMaxStock === "number" ? currentMaxStock : undefined}
                      />

                      <button
                        onClick={() =>
                          setQuantity((q) => {
                            const next = q + 1;
                            if (typeof currentMaxStock === "number") {
                              return Math.min(next, currentMaxStock);
                            }
                            return next;
                          })
                        }
                        className="px-3 py-1.5 text-lg font-bold text-gray-800 transition-colors duration-200 hover:bg-gray-100"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <button
                  onClick={closeCartModal}
                  className="flex-1 rounded-full border border-gray-300 bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-red-600 hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={(hasVariants && !selectedVariant) || isOutOfStock}
                  className="flex-1 rounded-full border border-gray-500 bg-gray-900 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-300 disabled:text-gray-500"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
