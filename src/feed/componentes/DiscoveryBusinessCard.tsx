"use client";

import Link from "next/link";
import { toWhatsAppNumber } from "@/lib/contact/phone";
import Image from "next/image";
import { BsWhatsapp } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si";
import { FaArrowRight, FaMapMarkerAlt } from "react-icons/fa";
import { inter } from "@/config/fonts";
import styles from "./discoveryCards.module.css";
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
  const telefono = toWhatsAppNumber(business.telefonoContacto, "CO");
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy explorando negocios en Myckeo y me interesó *${business.nombre}*.\n\nVer perfil: /perfil/${business.slug}`,
  );

  return (
    <article className={`${styles.card} ${styles.business} ${inter.className}`}>
      <div className={styles.header}>
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

        <div className={styles.author}>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/perfil/${business.slug}`}
              className={styles.authorName}
            >
              {business.nombre}
            </Link>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
              {primeraCategoria}
            </span>
          </div>

          <div className={styles.context}>
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
        className={styles.cover}
      >
        <Image
          src={optimizedBusinessCoverUrl}
          alt={`Portada de ${business.nombre}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 hover:scale-105"
        />
      </Link>

      <p className={styles.summary}>{description}</p>

      <div className={styles.businessActions}>
        <Link
          href={`/perfil/${business.slug}`}
          className={`${styles.action} ${styles.primary}`}
        >
          Ver perfil
          <FaArrowRight className="text-xs" />
        </Link>

        {telefono && (
          <Link
            href={`https://wa.me/${telefono}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.action} ${styles.contact}`}
            aria-label={`Contactar a ${business.nombre} por WhatsApp`}
            title="WhatsApp"
          >
            <BsWhatsapp className="text-base" />
          </Link>
        )}

        {isValidUrl(business.urlGoogleMaps) && (
          <Link
            href={business.urlGoogleMaps || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.action} ${styles.map}`}
            aria-label={`Ver ${business.nombre} en el mapa`}
            title="Mapa"
          >
            <SiGooglemaps className="text-base" />
          </Link>
        )}
      </div>
    </article>
  );
};

export default DiscoveryBusinessCard;
