"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toWhatsAppNumber } from "@/lib/contact/phone";
import { BsWhatsapp } from "react-icons/bs";
import { FaArrowRight } from "react-icons/fa";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import { inter } from "@/config/fonts";
import styles from "./discoveryCards.module.css";
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
  const telefono = toWhatsAppNumber(servicio.telefonoNegocio, "CO");
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Vi en Myckeo el servicio *${servicio.titulo}* y quiero más información.`,
  );

  return (
    <article className={`${styles.card} ${styles.service} ${inter.className}`}>
      <div className={styles.serviceBody}>
        <div className={styles.serviceCopy}>
          <span className={styles.serviceLabel}>Servicio</span>
          <h3 className={styles.title}>{servicio.titulo}</h3>
          <Link href={`/perfil/${servicio.negocioSlug}`} className={styles.serviceAuthor}>
            por {servicio.nombreNegocio}
          </Link>
        </div>
        {hasMedia && (
          <div className={styles.thumbnail}>
            {isVideo ? (
              <span className={styles.videoPreview}>Video en el perfil</span>
            ) : (
              <Image
                src={safeMediaImage}
                alt={servicio.titulo}
                fill
                sizes="88px"
                className="object-cover"
              />
            )}
          </div>
        )}
      </div>
      <p className={styles.summary}>{description}</p>
      <div className={styles.serviceFooter}>
        {typeof servicio.precio === "number" && (
          <span className={styles.price}>{formatCurrency(servicio.precio, servicio.currency)}</span>
        )}
        <div className={styles.businessActions}>
          <Link href={`/perfil/${servicio.negocioSlug}`} className={`${styles.action} ${styles.primary}`}>
            Ver negocio <FaArrowRight className="text-xs" />
          </Link>
          {telefono && (
            <Link
              href={`https://wa.me/${telefono}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Consultar ${servicio.titulo} por WhatsApp`}
              title="WhatsApp"
              className={`${styles.action} ${styles.contact}`}
            >
              <BsWhatsapp className="text-base" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default DiscoveryServiceCard;
