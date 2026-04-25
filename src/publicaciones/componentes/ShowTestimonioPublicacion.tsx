"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Typography } from "@mui/material";
import { FaPlayCircle } from "react-icons/fa";
import Interactions from "@/interacciones/componentes/Interactions";
import PublicationModal from "./PublicationModal";
import { motion } from "framer-motion";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";
import { textosFont, titleFont } from "@/config/fonts";
import { useMediaAspectRatio } from "@/hooks/useMediaAspectRatio";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  PLACEHOLDER_PRODUCT_IMAGE,
  isLikelyVideoUrl,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import { getCloudinaryVideoPosterUrl } from "@/lib/cloudinary/buildCloudinaryVideoPosterUrl";
import { reportOperationalWarning } from "@/lib/observability/operationalLogger";


interface Productos {
  id: string;
  nombre: string;
  precio: number;
  imagen: string | null;
  slug: string;
}

interface ShowTestimonioPublicacionProps {
  publicacion: EnhancedPublicacion;
  productos?: Productos[];
  isInModal?: boolean;
}

export const ShowTestimonioPublicacion = ({ publicacion, productos, isInModal = false }: ShowTestimonioPublicacionProps) => {
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);

  const media = publicacion.multimedia?.[0];
  const mediaTipo = media?.tipo ?? "IMAGEN";
  const mediaIsVideo = mediaTipo === "VIDEO" || isLikelyVideoUrl(media?.url);
  const mediaUrl = mediaIsVideo
    ? media?.url || ""
    : resolveSafeImageSource(media?.url, PLACEHOLDER_PRODUCT_IMAGE);
  const safeMediaImage = resolveSafeImageSource(media?.url, PLACEHOLDER_PRODUCT_IMAGE);
  const optimizedPreviewImageUrl = getCloudinaryImageUrl(
    safeMediaImage,
    "publication-preview",
  );
  const optimizedDetailImageUrl = getCloudinaryImageUrl(
    safeMediaImage,
    "publication-detail",
  );
  const videoPreviewPosterUrl = getCloudinaryVideoPosterUrl(
    mediaUrl,
    "publication-preview",
  );
  const videoDetailPosterUrl = getCloudinaryVideoPosterUrl(
    mediaUrl,
    "publication-detail",
  );
  const imageSrc = isInModal ? optimizedDetailImageUrl : optimizedPreviewImageUrl;
  const aspectRatioUrl = mediaIsVideo
    ? isInModal
      ? mediaUrl
      : videoPreviewPosterUrl ?? undefined
    : imageSrc;
  const aspectRatioType = mediaIsVideo
    ? isInModal
      ? "VIDEO"
      : videoPreviewPosterUrl
        ? "IMAGEN"
        : "VIDEO"
    : "IMAGEN";
  const aspectRatio = useMediaAspectRatio(aspectRatioUrl, aspectRatioType);
  const timeAgo = formatDistanceToNow(new Date(publicacion.createdAt), { addSuffix: true, locale: es });
  const safeBusinessImage = resolveSafeImageSource(
    publicacion.negocio?.fotoPerfil,
    PLACEHOLDER_BUSINESS_IMAGE
  );
  const optimizedAvatarUrl = getCloudinaryImageUrl(safeBusinessImage, "avatar");
  const hasInvalidPublicationId = !publicacion.id || !/^c[0-9a-z]{24}$/.test(publicacion.id);
  const hasInvalidBusinessSlug = !publicacion.negocio?.slug || !/^[a-z0-9-]+$/i.test(publicacion.negocio.slug);

  useEffect(() => {
    if (!hasInvalidPublicationId) {
      return;
    }

    reportOperationalWarning({
      area: "public-feed",
      event: "testimonial_invalid_publication_id",
      message: "Se descartó un testimonio con ID de publicación inválido.",
      context: {
        publicationId: publicacion.id,
      },
      dedupeKey: `testimonial-invalid-publication-id:${publicacion.id ?? "missing"}`,
    });
  }, [hasInvalidPublicationId, publicacion.id]);

  useEffect(() => {
    if (!hasInvalidBusinessSlug) {
      return;
    }

    reportOperationalWarning({
      area: "public-feed",
      event: "testimonial_invalid_business_slug",
      message: "Se descartó un testimonio con slug de negocio inválido.",
      context: {
        publicationId: publicacion.id,
        negocioSlug: publicacion.negocio?.slug,
      },
      dedupeKey: `testimonial-invalid-business-slug:${publicacion.id}`,
    });
  }, [hasInvalidBusinessSlug, publicacion.id, publicacion.negocio?.slug]);

  

  const handleOpenModal = useCallback(() => {
    if (!isInModal) {
      setIsModalOpenLocal(true);
    }
  }, [isInModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpenLocal(false);
  }, []);

  if (hasInvalidPublicationId) {
    return (
      <div className="w-full my-6 bg-white rounded-2xl shadow-lg p-4">
        <Typography color="error">Error: ID de publicación inválido</Typography>
      </div>
    );
  }
  if (hasInvalidBusinessSlug) {
    return (
      <div className="w-full my-6 bg-white rounded-2xl shadow-lg p-4">
        {/* <Typography color="error">Error: Slug de negocio inválido</Typography> */}
      </div>
    );
  }

  return (
    <>
      <motion.div
        key={publicacion.id} // Key para reconciliation óptima en listas/feeds
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full my-6 bg-white rounded-2xl shadow-md overflow-hidden"
      >
        {/* Cabecera: Usuario/Negocio */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100"> {/* Fixed items-between a items-center para responsive */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-3">
            <Image
              src={optimizedAvatarUrl}
              alt="Avatar del negocio"
              fill
              sizes="48px"
              className="object-cover"
    
              // unoptimized={true} // Evita problemas con imágenes externas
            />
          </div>
          <div className="flex-1 min-w-0"> {/* min-w-0 para truncate en móviles */}
            <Link
              href={`/perfil/${publicacion.negocio?.slug || ""}`}
              className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 truncate ${titleFont.className}`}
            >
              {publicacion.negocio?.nombre || "Negocio Desconocido"}
            </Link>
            <div className="flex items-center text-sm text-gray-500">
              <span className="truncate">{timeAgo}</span>
            </div>
          </div>
          <FollowButton followedId={publicacion.negocio?.id || ''} version={2} type="USER_TO_BUSINESS" className="ml-auto flex-shrink-0" />
        </div>

        {/* Descripción encima de la imagen (elegante truncate con gradiente) */}
        {publicacion.descripcion && (
          <div className="p-4 text-gray-800 leading-snug relative">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden 
                ${isInModal ? "max-h-[999px]" : "max-h-[4.8em]"} relative`}
            >
              <p className={`whitespace-pre-wrap break-words text-md ${textosFont.className}`}>
                {publicacion.descripcion}
              </p>
              {!isInModal && publicacion.descripcion.length > 100 && (
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              )}
            </div>
            {!isInModal && publicacion.descripcion.length > 100 && (
              <button
                onClick={handleOpenModal}
                className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label="Ver descripción completa"
              >
                Ver más
              </button>
            )}
          </div>
        )}

        {/* Imagen o Video (responsive aspect-ratio) */}
        <div
          className="relative w-full max-h-[500px] mx-auto cursor-pointer" // Cursor solo si clickable
          style={{ aspectRatio: aspectRatio || (mediaTipo === "VIDEO" ? 9 / 16 : 16 / 9) }} // Fallback específico por tipo
          onClick={!isInModal ? handleOpenModal : undefined}
          role={!isInModal ? "button" : undefined}
          tabIndex={!isInModal ? 0 : undefined}
          aria-label={!isInModal ? "Abrir modal con detalle del testimonio" : undefined}
        >
          {mediaIsVideo ? (
            isInModal ? (
              <video
                src={mediaUrl}
                className="w-full h-full object-contain rounded-b-xl" // Contain para no distorsionar
                controls
                preload="metadata"
                poster={videoDetailPosterUrl ?? undefined}
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center rounded-b-xl bg-slate-900 text-white">
                {videoPreviewPosterUrl ? (
                  <Image
                    src={videoPreviewPosterUrl}
                    alt={publicacion.titulo || "Video del testimonio"}
                    fill
                    className="rounded-b-xl object-cover opacity-45"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                    loading="lazy"
                  />
                ) : null}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <FaPlayCircle className="text-4xl drop-shadow" />
                  <span className="text-sm font-semibold drop-shadow">Ver video</span>
                </div>
              </div>
            )
          ) : (
            <Image
              src={imageSrc}
              alt={publicacion.titulo || "Publicación del testimonio"}
              fill
              className="object-contain rounded-b-xl hover:scale-105 transition-transform duration-300" // Hover sutil para engagement
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"

            />
          )}
        </div>

        {/* Contenido (título y productos – grid responsive) */}
        <div className="p-4">
          {publicacion.titulo && (
            <Typography variant="h6" className="font-bold text-gray-900 mb-2">
              {publicacion.titulo}
            </Typography>
          )}
          {productos && productos.length > 0 && (
            <div className="mb-4">
              <Typography variant="caption" className="text-gray-500 mb-2 block font-medium">
                Productos relacionados:
              </Typography>
              <div className="flex flex-wrap gap-3">
                {productos.map((producto) => {
                  const optimizedRelatedProductImageUrl = getCloudinaryImageUrl(
                    resolveSafeImageSource(producto.imagen, PLACEHOLDER_PRODUCT_IMAGE),
                    "publication-preview",
                  );

                  return (
                    <div
                      key={producto.id}
                      className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg shadow-sm hover:bg-gray-100 transition-colors flex-1 min-w-[140px]" // Responsive min-width
                    >
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <Image
                          src={optimizedRelatedProductImageUrl}
                          alt={producto.nombre}
                          fill
                          sizes="48px"
                          className="object-cover rounded-md"
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <Link href={`/producto/${producto.slug}`} passHref legacyBehavior>
                          <a className="text-blue-600 hover:underline text-sm font-medium truncate">
                            {producto.nombre}
                          </a>
                        </Link>
                        <Typography variant="caption" className="text-gray-600 font-semibold">
                          ${producto.precio.toFixed(2)}
                        </Typography>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Interacciones – con key para optimización */}
        <Interactions
          key={publicacion.id} // Para React reconciliation en feeds múltiples
          publicacionId={publicacion.id}
          slug={publicacion.negocio?.slug}
          onOpenModal={handleOpenModal}
          isInModal={isInModal}
          numLikes={publicacion.numLikes}
          numComentarios={publicacion.numComentarios}
          numCompartidos={publicacion.numCompartidos}
          userReaction={publicacion.userReaction?.tipo ?? null} // Fix: Extrae solo 'tipo' (enum ReaccionTipo | null)
          initialComments={publicacion.comments?.slice(0, 3) || []}
        />
      </motion.div>

      {/* Renderizado local del modal solo si !isInModal */}
      {!isInModal && (
        <PublicationModal
          isOpen={isModalOpenLocal}
          publication={publicacion}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default ShowTestimonioPublicacion;
