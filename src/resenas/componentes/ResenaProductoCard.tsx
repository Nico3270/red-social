"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaGlobe, FaLock, FaUserFriends } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Interactions from "@/interacciones/componentes/Interactions";
import PublicationModal from "@/publicaciones/componentes/PublicationModal";

interface EnhancedPublicacion {
  id: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    fotoPerfil?: string;
    username: string;
  };
  negocio?: { id: string; nombre: string; fotoPerfil?: string; slug?: string };
  tipo: "CARRUSEL_IMAGENES" | "VIDEO_HORIZONTAL" | "VIDEO_VERTICAL" | "PRODUCTO_DESTACADO" | "MINI_GRID" | "TESTIMONIO";
  titulo?: string;
  descripcion?: string;
  multimedia: { id: string; url: string; tipo: "IMAGEN" | "VIDEO"; formato?: string; orden: number }[];
  visibilidad: "PUBLICA" | "PRIVADA" | "AMIGOS";
  createdAt: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: { id: string; tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" } | null;
  comments: Array<{
    id: string;
    contenido: string;
    createdAt: string;
    usuario: { id: string; nombre: string; apellido: string; fotoPerfil?: string; username: string };
  }>;
  calificacion?: number;
  isAuthenticated?: boolean;
  onInteraction?: (
    type: "COMENTARIO" | "REACCION" | "COMPARTIDO",
    data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }
  ) => void;
}

const useMediaDimensions = (url: string, tipo: "IMAGEN" | "VIDEO") => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!url) {
      setAspectRatio(1);
      return;
    }

    const loadDimensions = async () => {
      try {
        if (tipo === "IMAGEN") {
          const img = new window.Image();
          img.src = url;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
              resolve(null);
            };
            img.onerror = () => {
              setAspectRatio(1);
              reject(new Error("Error cargando imagen"));
            };
          });
        } else if (tipo === "VIDEO") {
          const video = document.createElement("video");
          video.src = url + "#t=0.1";
          video.muted = true;
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
              setAspectRatio(video.videoWidth / video.videoHeight || 9 / 16);
              resolve(null);
            };
            video.onerror = () => {
              setAspectRatio(9 / 16);
              reject(new Error("Error cargando video"));
            };
          });
          video.remove();
        }
      } catch (error) {
        setAspectRatio(tipo === "VIDEO" ? 9 / 16 : 1);
      }
    };

    loadDimensions();
    return () => setAspectRatio(null);
  }, [url, tipo]);

  return aspectRatio;
};

interface Props {
  publicacion: EnhancedPublicacion;
  isInModal?: boolean;
}

interface ExtendedResenaData {
  producto?: {
    id: string;
    nombre: string;
    imagen: string;
    slug: string;
  };
  negocio?: {
    id: string;
    nombre: string;
    slug?: string;
    fotoPerfil?: string;
  };
  calificacion?: number;
}

const MediaSlide: React.FC<{
  media: EnhancedPublicacion["multimedia"][0];
  index: number;
  multimediaLength: number;
  onClick: () => void;
  isInModal: boolean;
  descripcion?: string;
}> = ({ media, index, multimediaLength, onClick, isInModal, descripcion }) => {
  const aspectRatio = useMediaDimensions(media.url, media.tipo);
  const maxDescriptionLength = 100;

  const formattedDescription = useMemo(() => {
    if (!descripcion) return "";
    return formatDescription(descripcion);
  }, [descripcion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full rounded-xl overflow-hidden shadow-sm"
      style={{ aspectRatio: aspectRatio || 1 }}
      onClick={!isInModal ? onClick : undefined}
      role={!isInModal ? "button" : undefined}
      tabIndex={!isInModal ? 0 : undefined}
      aria-label={`Media ${index + 1} de ${multimediaLength}`}
    >
      {media.tipo === "VIDEO" ? (
        <video
          src={media.url}
          controls
          preload="metadata"
          playsInline
          muted={false}
          className="w-full h-full object-contain bg-gray-50"
          aria-label={`Video ${index + 1} de ${multimediaLength}`}
        />
      ) : (
        <Image
          src={media.url}
          alt={`Imagen ${index + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover bg-gray-50"
          loading="lazy"
        />
      )}
      {descripcion && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-xl">
          <div className="bg-white/95 rounded-xl p-4 shadow-xl max-h-40 overflow-y-auto">
  <p
    className="text-gray-900 text-base sm:text-lg leading-relaxed italic"
    dangerouslySetInnerHTML={{
      __html: isInModal ? formattedDescription : formattedDescription.slice(0, maxDescriptionLength),
    }}
  />
</div>

        </div>
      )}
    </motion.div>
  );
};

const formatDescription = (text: string) => {
  return text
    .replace(/#(\w+)/g, '<a href="/search?q=$1" class="text-blue-500 hover:underline">#$1</a>')
    .replace(/@(\w+)/g, '<a href="/profile/$1" class="text-blue-500 hover:underline">@$1</a>');
};

const ResenaProductoCard: React.FC<Props> = ({ publicacion, isInModal = false }) => {
  const { data: session } = useSession();
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);
  const [extendedData, setExtendedData] = useState<ExtendedResenaData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const fetchExtendedData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const response = await fetch(`/api/resenasPrueba/${publicacion.id}`);
        const data = await response.json();
        if (data.ok) {
          setExtendedData({
            producto: data.resena.producto,
            negocio: data.resena.negocio || publicacion.negocio,
            calificacion: data.resena.calificacion || publicacion.calificacion,
          });
        } else {
          setError(data.message || "Error al cargar datos adicionales de la reseña");
        }
      } catch (err) {
        setError("Error al cargar datos adicionales de la reseña");
      } finally {
        setLoadingData(false);
      }
    };

    fetchExtendedData();
  }, [publicacion]);

  const multimedia = useMemo(() => publicacion.multimedia.sort((a, b) => a.orden - b.orden), [publicacion.multimedia]);

  const getVisibilityIcon = useCallback(() => {
    switch (publicacion.visibilidad) {
      case "PUBLICA":
        return <FaGlobe className="text-gray-500" aria-label="Pública" />;
      case "PRIVADA":
        return <FaLock className="text-gray-500" aria-label="Privada" />;
      case "AMIGOS":
        return <FaUserFriends className="text-gray-500" aria-label="Amigos" />;
      default:
        return null;
    }
  }, [publicacion.visibilidad]);

  const handleOpenModal = useCallback(() => {
    if (!isInModal) {
      setIsModalOpenLocal(true);
    }
  }, [isInModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpenLocal(false);
  }, []);

  if (loadingData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full bg-white rounded-2xl shadow-md overflow-hidden p-4 text-center text-gray-500"
      >
        Cargando reseña...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full bg-white rounded-2xl shadow-md overflow-hidden p-4 text-center text-red-500"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
      >
        {/* Cabecera: Usuario/Negocio */}
        <div className="flex items-start p-4 border-b border-gray-100">
          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 shadow-sm">
            <Image
              src={publicacion.usuario.fotoPerfil || "/default-profile.png"}
              alt={`Foto de perfil de ${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <Link
              href={`/perfil/${publicacion.usuario.id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm"
            >
              {publicacion.usuario.nombre} {publicacion.usuario.apellido}
            </Link>
            <p className="text-sm text-gray-700 mt-0.5">
              reseñó{" "}
              <Link
                href={`/producto/${extendedData?.producto?.slug || "#"}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {extendedData?.producto?.nombre || "este producto"}
              </Link>{" "}
              en{" "}
              <Link
                href={`/perfil/${extendedData?.negocio?.slug || "#"}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {extendedData?.negocio?.nombre || "este negocio"}
              </Link>
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(publicacion.createdAt), { locale: es, addSuffix: true })}
              <span className="mx-1">·</span>
              {getVisibilityIcon()}
            </div>
          </div>
        </div>

        {/* Calificación */}
        {extendedData?.calificacion != null && (
          <div className="px-4 py-2 flex justify-center items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                size={18}
                className={i < (extendedData?.calificacion ?? 0) ? "text-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
        )}

        {/* Contenido */}
        {multimedia.length > 0 ? (
          <div className="relative w-full h-[350px] sm:h-[450px]">
            <Swiper
              onSwiper={(swiper) => (swiperRef.current = swiper)}
              onSlideChange={() => {
                const videos = document.querySelectorAll("video");
                videos.forEach((video) => {
                  if (!video.paused) video.pause();
                });
              }}
              spaceBetween={10}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              loop={multimedia.length > 1}
              autoplay={
                multimedia.every((m) => m.tipo === "IMAGEN")
                  ? { delay: 3000, disableOnInteraction: true, pauseOnMouseEnter: true }
                  : false
              }
              modules={[Pagination, Navigation, Autoplay]}
              className="w-full h-full"
              aria-label={`Carrusel de reseña ${publicacion.id}`}
            >
              {multimedia.map((media, index) => (
                <SwiperSlide key={media.id}>
                  <MediaSlide
                    media={media}
                    index={index}
                    multimediaLength={multimedia.length}
                    onClick={handleOpenModal}
                    isInModal={isInModal}
                    descripcion={publicacion.descripcion}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            {multimedia.length > 1 && (
              <>
                <button
                  onClick={() => swiperRef.current?.slidePrev()}
                  className="hidden md:block absolute top-1/2 left-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
                  aria-label="Anterior"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => swiperRef.current?.slideNext()}
                  className="hidden md:block absolute top-1/2 right-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
                  aria-label="Siguiente"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-6 bg-gradient-to-b from-gray-50 to-white rounded-xl mx-4 my-4 shadow-inner h-[350px] sm:h-[450px] flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words italic text-md"
                dangerouslySetInnerHTML={{ __html: formatDescription(publicacion.descripcion || "Sin descripción") }}
              />
              {publicacion.descripcion && publicacion.descripcion.length > 100 && !isInModal && (
                <button
                  onClick={handleOpenModal}
                  className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none"
                  aria-label="Ver más de la reseña"
                >
                  Ver más
                </button>
              )}
            </div>
          </div>
        )}

    
      </motion.div>

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

export default ResenaProductoCard;