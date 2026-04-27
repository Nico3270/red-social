"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  FaCommentDots,
  FaHeart,
  FaImage,
  FaPlay,
  FaStar,
} from "react-icons/fa";
import { titleFont, textosFont } from "@/config/fonts";
import PublicationModal from "@/publicaciones/componentes/PublicationModal";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import {
  buildCloudinaryVideoPosterUrl,
  getCloudinaryVideoPosterUrl,
} from "@/lib/cloudinary/buildCloudinaryVideoPosterUrl";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  PLACEHOLDER_PRODUCT_IMAGE,
  isLikelyVideoUrl,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";

interface DiscoveryPublicationCardProps {
  publicacion: EnhancedPublicacion;
}

type MediaOrientation = "vertical" | "horizontal" | "square" | "unknown";

const getMediaAspectClass = (orientation: MediaOrientation) => {
  switch (orientation) {
    case "vertical":
      return "aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]";
    case "horizontal":
      return "aspect-[16/10] sm:aspect-[16/9]";
    case "square":
      return "aspect-square sm:aspect-[4/3]";
    default:
      return "aspect-[4/5] sm:aspect-[4/3]";
  }
};

const buildAuthorName = (publicacion: EnhancedPublicacion) => {
  if (publicacion.negocio?.nombre) return publicacion.negocio.nombre;

  return `${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`.trim();
};

const buildPublicationLabel = (publicacion: EnhancedPublicacion) => {
  if (publicacion.tipo === "TESTIMONIO") {
    return publicacion.producto ? "Reseña" : "Testimonio";
  }

  return "Publicación";
};

export const DiscoveryPublicationCard: React.FC<
  DiscoveryPublicationCardProps
> = ({ publicacion }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaOrientation, setMediaOrientation] =
    useState<MediaOrientation>("unknown");
  const [videoPosterAttempt, setVideoPosterAttempt] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);

  const authorName = buildAuthorName(publicacion);
  const authorHref = `/perfil/${publicacion.negocio?.slug || publicacion.usuario.id}`;
  const publicationLabel = buildPublicationLabel(publicacion);
  const media = useMemo(
    () => [...publicacion.multimedia].sort((a, b) => a.orden - b.orden),
    [publicacion.multimedia],
  );
  const primaryMedia = media[0];
  const hasMedia = Boolean(primaryMedia);
  const isVideo = primaryMedia
    ? primaryMedia.tipo === "VIDEO" || isLikelyVideoUrl(primaryMedia.url)
    : false;
  const safeAuthorImage = resolveSafeImageSource(
    publicacion.negocio?.fotoPerfil || publicacion.usuario.fotoPerfil,
    PLACEHOLDER_BUSINESS_IMAGE,
  );
  const optimizedBusinessAvatarUrl = getCloudinaryImageUrl(
    safeAuthorImage,
    "avatar",
  );
  const safeMediaImage = resolveSafeImageSource(
    primaryMedia?.url,
    PLACEHOLDER_PRODUCT_IMAGE,
  );
  const optimizedPublicationImageUrl = isVideo
    ? safeMediaImage
    : getCloudinaryImageUrl(safeMediaImage, "publication-preview");
  const videoPosterCandidates = useMemo(() => {
    if (!isVideo || !primaryMedia?.url) {
      return [] as string[];
    }

    return [
      buildCloudinaryVideoPosterUrl(primaryMedia.url, {
        preset: "publication-preview",
        startOffset: 2,
      }),
      buildCloudinaryVideoPosterUrl(primaryMedia.url, {
        preset: "publication-preview",
        startOffset: 0,
      }),
      getCloudinaryVideoPosterUrl(primaryMedia.url, "publication-preview"),
    ].filter((candidate, index, candidates): candidate is string => {
      return Boolean(candidate) && candidates.indexOf(candidate) === index;
    });
  }, [isVideo, primaryMedia?.url]);
  const videoPosterUrl = isVideo
    ? !posterFailed
      ? videoPosterCandidates[videoPosterAttempt] ?? null
      : null
    : null;
  const visualMediaUrl = isVideo ? videoPosterUrl : optimizedPublicationImageUrl;
  const mediaPreviewAlt = isVideo
    ? publicacion.titulo || "Vista previa del video"
    : publicacion.titulo || "Vista previa de la publicación";
  const previewText =
    publicacion.descripcion?.trim() ||
    publicacion.titulo ||
    (publicacion.producto
      ? `Opinión sobre ${publicacion.producto.nombre}`
      : "Mira esta publicación de la comunidad.");
  const descriptionClamp = hasMedia ? "line-clamp-3" : "line-clamp-4";
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const mediaAspectClass = useMemo(
    () => getMediaAspectClass(mediaOrientation),
    [mediaOrientation],
  );
  const timeAgo = formatDistanceToNow(new Date(publicacion.createdAt), {
    addSuffix: true,
    locale: es,
  });

  useEffect(() => {
    setVideoPosterAttempt(0);
    setPosterFailed(false);
  }, [primaryMedia?.url]);

  useEffect(() => {
    if (typeof window === "undefined" || !visualMediaUrl) {
      setMediaOrientation("unknown");
      return;
    }

    let isCancelled = false;
    const image = new window.Image();

    image.onload = () => {
      if (isCancelled) return;

      const { naturalWidth, naturalHeight } = image;
      if (!naturalWidth || !naturalHeight) {
        setMediaOrientation("unknown");
        return;
      }

      const ratio = naturalWidth / naturalHeight;
      if (Math.abs(ratio - 1) <= 0.08) {
        setMediaOrientation("square");
        return;
      }

      setMediaOrientation(ratio > 1 ? "horizontal" : "vertical");
    };

    image.onerror = () => {
      if (!isCancelled) {
        setMediaOrientation("unknown");
      }
    };

    image.src = visualMediaUrl;

    return () => {
      isCancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [visualMediaUrl]);

  const handleVideoPosterError = useCallback(() => {
    setVideoPosterAttempt((currentAttempt) => {
      const nextAttempt = currentAttempt + 1;
      if (nextAttempt < videoPosterCandidates.length) {
        return nextAttempt;
      }

      setPosterFailed(true);
      return currentAttempt;
    });
  }, [videoPosterCandidates.length]);

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start gap-3 p-3">
          <Link
            href={authorHref}
            className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-slate-100"
          >
            <Image
              src={optimizedBusinessAvatarUrl}
              alt={`Perfil de ${authorName}`}
              fill
              sizes="44px"
              className="object-cover"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={authorHref}
                className={`truncate text-sm font-semibold text-slate-900 transition-colors hover:text-sky-700 ${titleFont.className}`}
              >
                {authorName}
              </Link>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {publicationLabel}
              </span>
              {publicacion.producto && (
                <Link
                  href={`/producto/${publicacion.producto.slug}`}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                >
                  {publicacion.producto.nombre}
                </Link>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-500">{timeAgo}</p>
          </div>

          {media.length > 1 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
              <FaImage className="text-[10px]" />
              {media.length}
            </div>
          )}
        </div>

        {hasMedia && (
          <button
            type="button"
            onClick={openModal}
            className="group block w-full text-left"
            aria-label="Abrir publicación"
          >
            {isVideo ? (
              videoPosterUrl ? (
                <div className={`relative w-full overflow-hidden bg-slate-950 ${mediaAspectClass}`}>
                  <Image
                    src={videoPosterUrl}
                    alt={mediaPreviewAlt}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={handleVideoPosterError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/42 via-slate-950/12 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="flex flex-col items-center gap-2 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                        <FaPlay className="ml-1 text-base" />
                      </span>
                      <span className="text-sm font-medium">Ver video</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex w-full items-center justify-center bg-slate-900 text-white ${mediaAspectClass}`}>
                  <div className="flex flex-col items-center gap-2 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                      <FaPlay className="ml-1 text-base" />
                    </span>
                    <span className="text-sm font-medium">Ver video</span>
                  </div>
                </div>
              )
            ) : (
              <div className={`relative w-full overflow-hidden bg-slate-100 ${mediaAspectClass}`}>
                <Image
                  src={optimizedPublicationImageUrl}
                  alt={mediaPreviewAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
            )}
          </button>
        )}

        <div className="p-3">
          {publicacion.titulo && (
            <h3
              className={`text-base font-semibold leading-6 text-slate-900 ${titleFont.className}`}
            >
              {publicacion.titulo}
            </h3>
          )}

          <p
            className={`mt-2 text-sm leading-6 text-slate-600 ${textosFont.className} ${descriptionClamp}`}
          >
            {previewText}
          </p>

          {typeof publicacion.calificacion === "number" && (
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <FaStar
                  key={`${publicacion.id}-star-${index}`}
                  className={
                    index < Math.round(publicacion.calificacion || 0)
                      ? "text-sm text-amber-400"
                      : "text-sm text-slate-200"
                  }
                />
              ))}
              <span className="ml-1 text-xs font-semibold text-slate-500">
                {publicacion.calificacion.toFixed(1)}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-rose-50 px-3 text-sm font-semibold text-slate-700 ring-1 ring-rose-100">
                <FaHeart className="text-[13px] text-rose-500" />
                <span>{publicacion.numLikes}</span>
              </span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sky-50 px-3 text-sm font-semibold text-slate-700 ring-1 ring-sky-100">
                <FaCommentDots className="text-[13px] text-sky-600" />
                <span>{publicacion.numComentarios}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={openModal}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700"
            >
              Ver publicación
            </button>
          </div>
        </div>
      </article>

      <PublicationModal
        isOpen={isModalOpen}
        publication={publicacion}
        onClose={closeModal}
      />
    </>
  );
};

export default DiscoveryPublicationCard;
