"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BsWhatsapp } from "react-icons/bs";
import { FaArrowRight, FaRedoAlt, FaStar } from "react-icons/fa";
import { titleFont, textosFont } from "@/config/fonts";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { InfoEmpresa as empresa } from "@/config/config";
import { Precio } from "@/ui/components/productos/Precio";
import type { BusinessGuideResolvedPreset } from "@/perfil/guide/business-guide.types";

interface Props {
  selection: BusinessGuideResolvedPreset;
  onExploreMore: (selection: BusinessGuideResolvedPreset) => void;
  onResultClick?: (selection: BusinessGuideResolvedPreset, index: number) => void;
  onReset: () => void;
}

const urlWebProduccion = empresa.linkWebProduccion;

const formatSpecialLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatSignalLabel = (value: string) =>
  value.replace(/\b\w/g, (letter) => letter.toUpperCase());

const getDisplayPrice = (price: number, variantPrices: Array<number | null | undefined>) => {
  const normalizedVariantPrices = variantPrices.filter(
    (variantPrice): variantPrice is number =>
      typeof variantPrice === "number" && !Number.isNaN(variantPrice)
  );

  if (normalizedVariantPrices.length === 0) {
    return price;
  }

  return Math.min(price, ...normalizedVariantPrices);
};

export function BusinessGuideResults({ selection, onExploreMore, onResultClick, onReset }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      data-testid="business-guide-results"
      className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
    >
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,255,255,0.98))] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              <FaStar className="text-[10px] text-amber-300" />
              {selection.preset.label}
            </div>
            <h3 className={`text-xl text-slate-900 sm:text-2xl ${titleFont.className}`}>
              {selection.title}
            </h3>
            <p className={`mt-2 text-sm leading-6 text-slate-600 sm:text-base ${textosFont.className}`}>
              {selection.summary}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {selection.primaryAction && (
              <Link
                href={selection.primaryAction.href}
                target={selection.primaryAction.external ? "_blank" : undefined}
                rel={selection.primaryAction.external ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                <BsWhatsapp className="text-sm" />
                {selection.primaryAction.label}
              </Link>
            )}

            <button
              type="button"
              onClick={onReset}
              data-testid="business-guide-reset"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
            >
              <FaRedoAlt className="text-xs" />
              Cambiar selección
            </button>
            <button
              type="button"
              onClick={() => onExploreMore(selection)}
              data-testid="business-guide-explore-more"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/15 transition hover:bg-slate-800"
            >
              Ver más opciones
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        {selection.items.map((item, index) => {
          const primaryImage =
            item.product.imagenes.find(isRenderableImageSource) || PLACEHOLDER_PRODUCT_IMAGE;
          const optimizedProductImageUrl = getCloudinaryImageUrl(
            primaryImage,
            "product-card",
          );
          const telefonoLimpio = item.product.telefonoContacto?.replace(/\D/g, "") ?? "";
          const displayPrice = getDisplayPrice(
            item.product.precio,
            (item.product.variantes ?? []).map((variant) => variant.precio)
          );
          const whatsappMessage = encodeURIComponent(
            `¡Hola! Me interesó este producto recomendado en ${item.product.nombreNegocio || "Myckeo"}:\n\n*${item.product.nombre}*\n${urlWebProduccion}/producto/${item.product.slug}`
          );

          return (
            <motion.article
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.06 }}
              data-testid={`business-guide-result-${index}`}
              className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <Link
                href={`/producto/${item.product.slug}`}
                onClick={() => onResultClick?.(selection, index)}
                className="relative block aspect-[4/3] overflow-hidden"
              >
                <Image
                  src={optimizedProductImageUrl}
                  alt={item.product.nombre}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur">
                    {item.reason}
                  </span>
                  {item.product.etiquetaEspecial && item.product.etiquetaEspecial !== "ninguna" && (
                    <span className="rounded-full bg-amber-500/95 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                      {formatSpecialLabel(item.product.etiquetaEspecial)}
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col justify-between px-4 py-4">
                <div>
                  <Link href={`/producto/${item.product.slug}`} onClick={() => onResultClick?.(selection, index)}>
                    <h4 className={`text-lg leading-tight text-slate-900 transition hover:text-amber-700 ${titleFont.className}`}>
                      {item.product.nombre}
                    </h4>
                  </Link>

                  <p className={`mt-2 line-clamp-3 text-sm leading-6 text-slate-600 ${textosFont.className}`}>
                    {item.product.descripcionCorta || item.product.descripcion || "Una opción recomendada para empezar."}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {item.matchedSignals.slice(0, 2).map((signal) => (
                      <span
                        key={`${item.key}:signal:${signal}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                      >
                        {formatSignalLabel(signal)}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Precio value={displayPrice} />

                    <div className="flex items-center gap-2">
                      {telefonoLimpio && (
                        <Link
                          href={`https://wa.me/${telefonoLimpio}?text=${whatsappMessage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white shadow-sm transition hover:bg-green-600"
                          aria-label={`Pedir ${item.product.nombre} por WhatsApp`}
                        >
                          <BsWhatsapp className="text-lg" />
                        </Link>
                      )}

                      <Link
                        href={`/producto/${item.product.slug}`}
                        onClick={() => onResultClick?.(selection, index)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Ver detalle
                        <FaArrowRight className="text-xs" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.div>
  );
}
