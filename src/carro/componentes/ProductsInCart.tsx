"use client";

import { CartProduct, useCartCatalogoStore } from "@/store/carro/carro-store";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaTrash } from "react-icons/fa";

// Función para fetch real del nombre del negocio
export const fetchNegocioName = async (slug: string): Promise<string> => {
  try {
    const res = await fetch(`/api/negocios/${slug}`);
    if (!res.ok) {
      throw new Error("Error al obtener la información del negocio");
    }
    const data = await res.json();
    return data.negocio?.nombre_negocio || "Negocio Desconocido"; // Fallback si no hay nombre
  } catch (error) {
    console.error(`Error fetching negocio ${slug}:`, error);
    return "Negocio Desconocido"; // Fallback en caso de error
  }
};

// Cache global/simple para nombres (puedes usar un Map o localStorage para persistencia)
const negocioNameCache: Record<string, string> = {}; // Fuera del componente, o usa useRef para persistir

const formatCurrency = (value: number) =>
  `$${new Intl.NumberFormat("es-CO").format(value)}`;

const getSubtotalForItems = (items: CartProduct[]) =>
  items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

const getUnitsForItems = (items: CartProduct[]) =>
  items.reduce((sum, item) => sum + item.cantidad, 0);

const TOTAL_SECTION_ID = "cart-total-summary";
const getNegocioSectionId = (negocioId: string) =>
  `cart-negocio-${negocioId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

export const ProductsInCart = () => {
  const {
    carts,
    updateProductQuantity,
    removeProduct,
    clearCartForNegocio,
  } = useCartCatalogoStore();

  const [negocioNames, setNegocioNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const cartEntries = useMemo(
    () => Object.entries(carts).filter(([, items]) => Array.isArray(items) && items.length > 0),
    [carts]
  );
  const negocioIds = useMemo(() => cartEntries.map(([id]) => id), [cartEntries]);

  useEffect(() => {
    const loadNames = async () => {
      setIsLoading(true);
      const promises: Promise<void>[] = [];

      for (const id of negocioIds) {
        if (!negocioNameCache[id]) {
          promises.push(
            fetchNegocioName(id).then((name) => {
              negocioNameCache[id] = name;
            })
          );
        }
      }

      await Promise.all(promises);
      setNegocioNames((prev) => {
        const newNames = { ...prev }; // Copia actual usando functional update
        negocioIds.forEach((id) => {
          newNames[id] = negocioNameCache[id] || "Negocio Desconocido";
        });
        return newNames;
      });
      setIsLoading(false);
    };

    if (negocioIds.length > 0) {
      loadNames();
    } else {
      setIsLoading(false);
    }
  }, [negocioIds]);

  const total = useMemo(
    () => cartEntries.reduce((sum, [, items]) => sum + getSubtotalForItems(items), 0),
    [cartEntries]
  );

  const numNegocios = negocioIds.length;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (numNegocios === 0) {
    return (
      <div className="flex items-center justify-center h-full p-0">
        <div className="bg-white backdrop-blur-sm border border-gray-200 rounded-3xl shadow-md p-2 flex flex-col items-center text-center w-full">
          <div className="relative w-48 h-48 sm:w-48 sm:h-48 mb-2">
            <Image
              src="/imgs/emptyCar.png"
              alt="Carrito vacío"
              fill
              className="object-contain drop-shadow-lg"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-500 text-base sm:text-lg mb-6 max-w-sm">
            Explora productos <span className="text-gray-700 font-medium">premium</span> y agrega tus favoritos.
          </p>

          <Link
            href="/"
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-all duration-300 shadow-md"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Continúa tu compra
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
              {numNegocios === 1
                ? "Tienes productos listos para continuar con este negocio."
                : "Tienes pedidos en los siguientes negocios."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Puedes continuar el pedido completo o elegir el negocio que vas a revisar
              primero. Usa estas tarjetas para saltar directo al resumen que necesitas.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {numNegocios > 1 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                Pedido completo
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                {formatCurrency(total)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Incluye {numNegocios} negocios y sus subtotales.
              </p>
              <button
                type="button"
                onClick={() => scrollToSection(TOTAL_SECTION_ID)}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-800"
              >
                Ver resumen total
              </button>
            </div>
          )}

          {cartEntries.map(([negocioId, items]) => {
            const nombreNegocio = negocioNames[negocioId] || "Negocio Desconocido";
            const subtotal = getSubtotalForItems(items);
            const units = getUnitsForItems(items);

            return (
              <div
                key={`quick-${negocioId}`}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="truncate text-base font-semibold text-gray-900">
                  {nombreNegocio}
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    {units} {units === 1 ? "producto" : "productos"}
                  </p>
                  <p>
                    Subtotal:{" "}
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection(getNegocioSectionId(negocioId))}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-yellow-300 bg-yellow-400 px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors duration-200 hover:border-yellow-400 hover:bg-yellow-500"
                >
                  Ver pedido de este negocio
                </button>
              </div>
            );
          })}
        </div>
      </motion.section>

      {numNegocios > 1 && (
        <div
          id={TOTAL_SECTION_ID}
          className="scroll-mt-28 bg-white border border-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)] p-6 rounded-3xl"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen Total</h2>
          <div className="space-y-2 mb-4">
            {cartEntries.map(([negocioId, items]) => {
              const subtotal = getSubtotalForItems(items);
              const nombreNegocio = negocioNames[negocioId] || "Negocio Desconocido";
              return (
                <div key={negocioId} className="flex justify-between text-base sm:text-sm text-gray-600">
                  <span>Subtotal en {nombreNegocio}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between text-lg sm:text-base font-medium text-gray-900">
            <span>Total General</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <Link
            href="/address"
            className="block mt-4 bg-blue-600 text-white px-4 py-3 rounded-full font-medium hover:bg-blue-700 transition-all duration-300 text-center shadow-sm"
          >
            Generar Todos los Pedidos
          </Link>
        </div>
      )}

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {cartEntries.map(([negocioId, items]) => {
            const nombreNegocio = negocioNames[negocioId] || "Negocio Desconocido";
            const subtotal = getSubtotalForItems(items);

            return (
              <motion.div
                key={negocioId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                id={getNegocioSectionId(negocioId)}
                className="scroll-mt-28 flex flex-col lg:flex-row gap-6 bg-white rounded-3xl p-6 border border-gray-300 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <div className="lg:w-2/3 w-full">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
                    <h2 className="text-2xl font-medium tracking-tight">
                      <span className="text-gray-500">Productos en </span>
                      <span className="text-gray-900 font-semibold">{nombreNegocio}</span>
                    </h2>
                    <button
                      onClick={() => clearCartForNegocio(negocioId)}
                      className="flex items-center gap-2 rounded-lg bg-red-700 text-white px-3 py-1.5 text-sm font-medium 
                 hover:bg-gray-700 active:scale-95 transition-all duration-200"
                    >
                      <FaTrash className="text-sm" />
                      Vaciar
                    </button>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {items.map((item) => {
                        const hasLimitedStock =
                          item.stockIlimitado === false && typeof item.stock === "number";
                        const reachedStockLimit =
                          hasLimitedStock && item.cantidad >= (item.stock ?? 0);

                        return (
                          <motion.div
                            key={item.cartItemId}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between bg-white rounded-2xl p-4 hover:shadow-md transition-all duration-300 border border-gray-100"
                          >
                            <div className="hidden md:block relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
                              <Image
                                src={item.imagen}
                                alt={item.nombre}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-grow ml-0 md:ml-4">
                              <h3 className="text-base font-medium text-gray-900 leading-tight">
                                {item.nombre}
                              </h3>
                              {item.variantLabel && (
                                <p className="text-sm text-blue-700 mt-1">
                                  Variante: {item.variantLabel}
                                </p>
                              )}
                              <p className="text-base sm:text-sm text-gray-500 mt-1">
                                {formatCurrency(item.precio)}{" "}
                                <span className="text-gray-400">c/u</span>
                              </p>
                              {hasLimitedStock && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Stock disponible: {item.stock}
                                  {reachedStockLimit && (
                                    <span className="ml-2 font-medium text-amber-700">
                                      Máximo alcanzado
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center rounded-full border border-gray-300 bg-gray-100 shadow-inner mx-2 sm:mx-4">
                              <button
                                onClick={() =>
                                  updateProductQuantity(
                                    negocioId,
                                    item.cartItemId,
                                    item.cantidad - 1
                                  )
                                }
                                className="px-3 py-2 bg-gray-800 text-white text-lg font-medium rounded-l-full hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                                disabled={item.cantidad <= 1}
                              >
                                –
                              </button>

                              <div className="w-14 text-center text-gray-900 text-base font-semibold">
                                {item.cantidad}
                              </div>

                              <button
                                onClick={() =>
                                  updateProductQuantity(
                                    negocioId,
                                    item.cartItemId,
                                    item.cantidad + 1
                                  )
                                }
                                className="px-3 py-2 bg-gray-800 text-white text-lg font-medium rounded-r-full hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
                                disabled={reachedStockLimit}
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeProduct(negocioId, item.cartItemId)}
                              className="ml-2 sm:ml-4 text-red-700 hover:text-red-400 transition-colors"
                            >
                              <FaTrash className="text-lg" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="lg:w-1/3 w-full bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm lg:self-start">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de {nombreNegocio}</h3>

                  <div className="grid grid-cols-3 text-sm sm:text-xs font-medium text-gray-700 border-b border-gray-200 pb-2 mb-2">
                    <span>Cant.</span>
                    <span className="text-center">Producto</span>
                    <span className="text-right">Precio</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-2 text-base sm:text-sm text-gray-600"
                      >
                        <span>{item.cantidad}</span>
                        <div className="min-w-0 text-center">
                          <p className="truncate">{item.nombre}</p>
                          {item.variantLabel && (
                            <p className="truncate text-xs text-blue-700 mt-0.5">
                              {item.variantLabel}
                            </p>
                          )}
                        </div>
                        <span className="text-right whitespace-nowrap">
                          {formatCurrency(item.precio * item.cantidad)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between text-base sm:text-sm font-semibold text-gray-900">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <Link
                    href={`/address/${negocioId}`}
                    className="block mt-4 bg-blue-700 text-white px-4 py-3 rounded-full font-medium hover:bg-gray-600 transition-all duration-300 text-center shadow-sm"
                  >
                    Continuar con {nombreNegocio}
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
