"use client";

import Link from "next/link";
import Image from "next/image";
import { BsWhatsapp } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si";
import { FaArrowRight, FaMapMarkerAlt } from "react-icons/fa";
import { titleFont, textosFont } from "@/config/fonts";
import { BusinessCardData } from "../feed.interfaces";
import { FollowButton } from "./FollowButton";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";

interface DiscoveryBusinessCardProps {
  business: BusinessCardData;
}

const isValidUrl = (url?: string) => {
  if (!url || url.trim() === "") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const formatCategory = (category?: string) => {
  if (!category) return "Negocio local";

  return category
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

export const DiscoveryBusinessCard: React.FC<DiscoveryBusinessCardProps> = ({
  business,
}) => {
  const portadaImage = resolveSafeImageSource(
    business.imagenPortada || business.imagenPerfil,
    PLACEHOLDER_BUSINESS_IMAGE,
  );
  const optimizedBusinessCoverUrl = getCloudinaryImageUrl(
    portadaImage,
    "business-cover",
  );
  const perfilImage = resolveSafeImageSource(
    business.imagenPerfil || business.imagenPortada,
    PLACEHOLDER_BUSINESS_IMAGE,
  );
  const optimizedBusinessAvatarUrl = getCloudinaryImageUrl(
    perfilImage,
    "avatar",
  );
  const primeraCategoria = formatCategory(business.categorias[0]);
  const description =
    business.descripcion?.trim() || "Explora este negocio y descubre lo que ofrece en tu zona.";
  const telefono = business.telefonoContacto?.replace(/\D/g, "") ?? "";
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy explorando negocios en Myckeo y me interesó *${business.nombre}*.\n\nVer perfil: /perfil/${business.slug}`,
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Link
          href={`/perfil/${business.slug}`}
          className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100"
        >
          <Image
            src={optimizedBusinessAvatarUrl}
            alt={`Perfil de ${business.nombre}`}
            fill
            sizes="48px"
            className="object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/perfil/${business.slug}`}
              className={`truncate text-base font-semibold text-slate-900 transition-colors hover:text-sky-700 ${titleFont.className}`}
            >
              {business.nombre}
            </Link>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              {primeraCategoria}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <FaMapMarkerAlt className="text-[11px] text-slate-400" />
              {business.ciudad}, {business.departamento}
            </span>
          </div>
        </div>

        <FollowButton
          version={2}
          followedId={business.negocioId || ""}
          type="USER_TO_BUSINESS"
          className="mt-1"
        />
      </div>

      <Link
        href={`/perfil/${business.slug}`}
        className="relative mt-3 block aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100"
      >
        <Image
          src={optimizedBusinessCoverUrl}
          alt={`Portada de ${business.nombre}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </Link>

      <p
        className={`mt-3 line-clamp-3 text-sm leading-6 text-slate-600 ${textosFont.className}`}
      >
        {description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/perfil/${business.slug}`}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Ver perfil
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

        {isValidUrl(business.urlGoogleMaps) && (
          <Link
            href={business.urlGoogleMaps || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
          >
            <SiGooglemaps className="text-base" />
            Mapa
          </Link>
        )}
      </div>
    </article>
  );
};

export default DiscoveryBusinessCard;
