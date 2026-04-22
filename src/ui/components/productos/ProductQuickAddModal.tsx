"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ProductVariantRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  getVariantOptionSummary,
  getVariantTitle,
} from "./variantDisplay";

interface ProductQuickAddModalProps {
  isOpen: boolean;
  onClose: (reason: "dismissed" | "cancelled") => void;
  productName: string;
  fallbackPrice: number;
  hasVariants: boolean;
  activeVariants: ProductVariantRedSocial[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
  selectedVariantLabel: string | null;
  modalDisplayPrice: number;
  shouldShowFromPrice: boolean;
  currentMaxStock: number | null;
  quantity: number;
  onQuantityChange: (nextQuantity: number) => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  requiresVariantSelection: boolean;
  isOutOfStock: boolean;
  isActionDisabled?: boolean;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

export function ProductQuickAddModal({
  isOpen,
  onClose,
  productName,
  fallbackPrice,
  hasVariants,
  activeVariants,
  selectedVariantId,
  onSelectVariant,
  selectedVariantLabel,
  modalDisplayPrice,
  shouldShowFromPrice,
  currentMaxStock,
  quantity,
  onQuantityChange,
  onDecreaseQuantity,
  onIncreaseQuantity,
  requiresVariantSelection,
  isOutOfStock,
  isActionDisabled = false,
  onConfirm,
  confirmLabel = "Agregar al carrito",
  cancelLabel = "Cancelar",
}: ProductQuickAddModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={() => onClose("dismissed")}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h5 className="mb-3 text-left text-base font-semibold text-gray-900">
              {hasVariants ? "Configura tu pedido" : "Agregar al carrito"}
            </h5>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Resumen rapido
              </p>
              <p className="mt-2 text-lg font-bold leading-tight text-gray-900">{productName}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {shouldShowFromPrice ? "Precio desde" : "Precio actual"}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                    {formatCurrency(modalDisplayPrice)}
                  </p>
                </div>

                {typeof currentMaxStock === "number" ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    Stock: {currentMaxStock}
                  </span>
                ) : (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                    Disponible
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {hasVariants
                  ? "Elige una opcion y confirma cuantas unidades quieres llevar."
                  : "Ajusta la cantidad antes de confirmar el agregado rapido."}
              </p>
            </div>

            {hasVariants && (
              <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Opciones disponibles
                  </p>
                  <span className="text-xs text-gray-400">
                    {activeVariants.length} {activeVariants.length === 1 ? "opcion" : "opciones"}
                  </span>
                </div>
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
                        : "Disponible";
                    const secondaryText = [optionSummary, stockSummary]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onSelectVariant(variant.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                          selectedVariantId === variant.id
                            ? "border-blue-500 bg-blue-50 shadow-sm"
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
                                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                    {secondaryText}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-sm font-semibold text-gray-900">
                                {formatCurrency(variant.precio ?? fallbackPrice)}
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

            {isActionDisabled && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Este producto no tiene stock disponible en este momento.
              </div>
            )}

            {requiresVariantSelection && !isActionDisabled && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Selecciona una opcion para continuar con el agregado rapido.
              </div>
            )}

            {selectedVariantLabel && (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Seleccion actual
                </p>
                <p className="mt-1 font-semibold text-blue-900">{selectedVariantLabel}</p>
              </div>
            )}

            {((hasVariants && !requiresVariantSelection) || !hasVariants) && (
              <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Cantidad y total
                  </p>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                      Total estimado
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(modalDisplayPrice * quantity)}
                    </p>
                  </div>
                </div>

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
                      onClick={onDecreaseQuantity}
                      className="px-3 py-1.5 text-lg font-bold text-gray-800 transition-colors duration-200 hover:bg-gray-100"
                      aria-label="Disminuir cantidad"
                    >
                      –
                    </button>

                    <input
                      type="number"
                      value={quantity}
                      onChange={(event) =>
                        onQuantityChange(
                          Math.max(1, parseInt(event.target.value, 10) || 1)
                        )
                      }
                      className="w-12 border-x border-gray-200 py-1.5 text-center text-base font-semibold text-gray-900 focus:outline-none"
                      min="1"
                      max={typeof currentMaxStock === "number" ? currentMaxStock : undefined}
                      aria-label="Cantidad del producto"
                    />

                    <button
                      type="button"
                      onClick={onIncreaseQuantity}
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
                onClick={() => onClose("cancelled")}
                className="flex-1 rounded-full bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-200"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isOutOfStock || isActionDisabled}
                className="flex-1 rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isOutOfStock || isActionDisabled
                  ? "Sin stock"
                  : requiresVariantSelection
                    ? "Elegir opcion"
                    : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}