"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsWhatsapp } from "react-icons/bs";
import { FaArrowRight, FaPlay, FaTools } from "react-icons/fa";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import { titleFont, textosFont } from "@/config/fonts";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  isLikelyVideoUrl,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";

interface DiscoveryServiceCardProps {
  servicio: ServicioData;
}

const formatCurrency = (value: number, currency: string = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);

export const DiscoveryServiceCard: React.FC<DiscoveryServiceCardProps> = ({
  servicio,
}) => {
  const media = useMemo(
    () => [...servicio.multimedia].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [servicio.multimedia],
  );
  const primaryMedia = media[0];
  const hasMedia = Boolean(primaryMedia);
  const isVideo = primaryMedia
    ? primaryMedia.tipo === "VIDEO" || isLikelyVideoUrl(primaryMedia.url)
    : false;
  const optimizedServiceImageUrl = getCloudinaryImageUrl(
    primaryMedia?.url,
    "publication-preview",
  );
  const safeMediaImage = resolveSafeImageSource(
    optimizedServiceImageUrl,
    PLACEHOLDER_PRODUCT_IMAGE,
  );
  const fullDescription = servicio.descripcion.join(" ").trim();
  const description =
    fullDescription || "Explora este servicio y contacta al negocio para recibir más detalles.";
  const telefono = servicio.telefonoNegocio?.replace(/\D/g, "") ?? "";
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Vi en Myckeo el servicio *${servicio.titulo}* y quiero más información.`,
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
            <FaTools className="text-[10px]" />
            Servicio
          </span>

          <h3
            className={`mt-3 text-lg font-semibold leading-6 text-slate-900 ${titleFont.className}`}
          >
            {servicio.titulo}
          </h3>

          <Link
            href={`/perfil/${servicio.negocioSlug}`}
            className="mt-2 inline-flex text-sm font-medium text-slate-600 transition-colors hover:text-sky-700"
          >
            por {servicio.nombreNegocio}
          </Link>
        </div>

        {typeof servicio.precio === "number" && (
          <div className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
            {formatCurrency(servicio.precio, servicio.currency)}
          </div>
        )}
      </div>

      {hasMedia && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-orange-100 bg-white">
          {isVideo ? (
            <div className="flex aspect-[16/10] items-center justify-center bg-slate-900 text-white">
              <div className="flex flex-col items-center gap-2 opacity-90">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                  <FaPlay className="ml-1 text-base" />
                </span>
                <span className="text-sm font-medium">Vista previa</span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[16/10] w-full bg-slate-100">
              <Image
                src={safeMediaImage}
                alt={servicio.titulo}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}

      <p
        className={`mt-3 line-clamp-3 text-sm leading-6 text-slate-600 ${textosFont.className}`}
      >
        {description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/perfil/${servicio.negocioSlug}`}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Ver negocio
          <FaArrowRight className="text-xs" />
        </Link>

        {telefono && (
          <Link
            href={`https://wa.me/57${telefono}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <BsWhatsapp className="text-base" />
            WhatsApp
          </Link>
        )}
      </div>
    </article>
  );
};

export default DiscoveryServiceCard;
