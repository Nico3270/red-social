"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaLock, FaGlobe, FaUserFriends } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Swiper as SwiperType } from "swiper";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./socialMediaCarousel.css";
import Interactions from "@/interacciones/componentes/Interactions";
import PublicationModal from "./PublicationModal";
import Link from "next/link";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";
import { titleFont } from "@/config/fonts";

// Hook personalizado para obtener dimensiones de medios (sin cambios, optimizado)
const useMediaDimensions = (url: string, tipo: "IMAGEN" | "VIDEO") => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!url) {
      setAspectRatio(1); // Fallback si no hay URL
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
              setAspectRatio(1); // Fallback: proporción cuadrada
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
              setAspectRatio(9 / 16); // Fallback: proporción vertical típica
              reject(new Error("Error cargando video"));
            };
          });
          video.remove();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error cargando dimensiones:", error);
        }
        setAspectRatio(tipo === "VIDEO" ? 9 / 16 : 1); // Fallback según tipo
      }
    };

    loadDimensions();
    return () => {
      setAspectRatio(null);
    };
  }, [url, tipo]);

  return aspectRatio;
};

interface Props {
  publicacion: EnhancedPublicacion;
  isInModal?: boolean; // ++++++++++ NUEVA PROP PARA DETECTAR SI ESTAMOS EN MODAL ++++++++++
}

// Componente wrapper para cada slide (con cambios para click en imagen)
const MediaSlide: React.FC<{ 
  media: EnhancedPublicacion["multimedia"][0]; 
  index: number; 
  multimediaLength: number; 
  onClick: () => void; // Prop para abrir modal
  isInModal: boolean; // Prop para evitar clicks en modal
}> = ({ media, index, multimediaLength, onClick, isInModal }) => {
  const aspectRatio = useMediaDimensions(media.url, media.tipo);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-h-[500px] mx-auto"
      style={{ aspectRatio: aspectRatio || 1 }}
      onClick={!isInModal ? onClick : undefined}
      role={!isInModal ? "button" : undefined}
      tabIndex={!isInModal ? 0 : undefined}
      aria-label={!isInModal ? `Abrir modal con detalle de la media ${index + 1} de ${multimediaLength}` : undefined}
    >
      {media.tipo === "VIDEO" ? (
        <video
          src={media.url}
          controls
          preload="metadata"
          playsInline
          muted={false}
          className="w-full h-full object-contain rounded-xl"
          aria-label={`Video ${index + 1} de ${multimediaLength} en carrusel`}
        />
      ) : (
        <Image
          src={media.url}
          alt={`Imagen ${index + 1} de carrusel`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover rounded-xl"
          loading="lazy"
        />
      )}
    </motion.div>
  );
};

export const SocialMediaCarousel: React.FC<Props> = ({ publicacion, isInModal = false }) => {
  // ++++++++++ ESTADO LOCAL PARA CONTROLAR EL MODAL (NUEVO) ++++++++++
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);

  const maxDescriptionLength = 100; // Límite para mostrar "Ver más" (solo fuera del modal)

  const swiperRef = useRef<SwiperType | null>(null);

  // Cachear multimedia para evitar re-renderizados
  const multimedia = useMemo(() => {
    return publicacion.multimedia.sort((a, b) => a.orden - b.orden);
  }, [publicacion.multimedia]);

  // Procesar hashtags y menciones
  const formatDescription = useCallback((text: string) => {
    return text
      .replace(/#(\w+)/g, '<Link href="/search?q=$1" class="text-blue-500 hover:underline">#$1</Link>')
      .replace(/@(\w+)/g, '<Link href="/profile/$1" class="text-blue-500 hover:underline">@$1</Link>');
  }, []);

  // Icono de visibilidad
  const getVisibilityIcon = useCallback(() => {
    switch (publicacion.visibilidad) {
      case "PUBLICA":
        return <FaGlobe className="text-gray-500" aria-label="Publicación pública" />;
      case "PRIVADA":
        return <FaLock className="text-gray-500" aria-label="Publicación privada" />;
      case "AMIGOS":
        return <FaUserFriends className="text-gray-500" aria-label="Publicación para amigos" />;
      default:
        return null;
    }
  }, [publicacion.visibilidad]);

  // ++++++++++ FUNCIÓN PARA ABRIR MODAL (AHORA LOCAL) ++++++++++
  const handleOpenModal = useCallback(() => {
    if (!isInModal) {
      setIsModalOpenLocal(true);
    }
  }, [isInModal]);

  // ++++++++++ FUNCIÓN PARA CERRAR MODAL (LOCAL) ++++++++++
  const handleCloseModal = useCallback(() => {
    setIsModalOpenLocal(false);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6"
      >
        {/* Cabecera: Usuario/Negocio */}
        <div className="flex items-center p-4 border-b border-gray-100">
          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-3">
            <Image
              src={publicacion.negocio?.fotoPerfil || publicacion.usuario.fotoPerfil || "/default-profile.png"}
              alt={`Foto de perfil de ${publicacion.negocio?.nombre || `${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1">
            <Link
              href={`/perfil/${publicacion.negocio?.slug || publicacion.usuario.id}`}
              className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer ${titleFont.className}`}
            >
              {publicacion.negocio?.nombre || `${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`}
            </Link>
            <div className="flex items-center text-sm text-gray-500">
              <span>{formatDistanceToNow(new Date(publicacion.createdAt), { locale: es, addSuffix: true })}</span>
              <span className="ml-2">{getVisibilityIcon()}</span>
            </div>
          </div>
          <FollowButton followedId={publicacion.negocio?.id || publicacion.usuario.id} version={2} type={publicacion.negocio ? "USER_TO_BUSINESS" : "USER_TO_USER"} className="ml-auto" />
        </div>

        {/* Descripción */}
        {publicacion.descripcion && (
          <div className="px-4 pt-2 pb-4  text-gray-800 leading-snug">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden 
                ${isInModal ? "max-h-[999px]" : "max-h-[4.8em]"} relative`}
            >
              <p
                className="whitespace-pre-wrap break-words text-md"
                dangerouslySetInnerHTML={{
                  __html: formatDescription(publicacion.descripcion),
                }}
              />
              {!isInModal && publicacion.descripcion.length > maxDescriptionLength && (
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
            {!isInModal && publicacion.descripcion.length > maxDescriptionLength && (
              <button
                onClick={handleOpenModal}
                className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none"
              >
                Ver más
              </button>
            )}
          </div>
        )}

        {/* Carrusel */}
        <div className="relative w-full">
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
                ? { delay: 30000, disableOnInteraction: true, pauseOnMouseEnter: true }
                : false
            }
            modules={[Pagination, Navigation, Autoplay]}
            aria-label={`Carrusel de ${publicacion.titulo || "publicación"}`}
            className="mySwiper"
          >
            {multimedia.length > 0 ? (
              multimedia.map((media, index) => (
                <SwiperSlide key={media.id}>
                  <MediaSlide 
                    media={media} 
                    index={index} 
                    multimediaLength={multimedia.length} 
                    onClick={handleOpenModal}
                    isInModal={isInModal}
                  />
                </SwiperSlide>
              ))
            ) : (
              <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-200 rounded-xl">
                <p className="text-gray-500">No hay imágenes o videos disponibles</p>
              </div>
            )}
          </Swiper>
          {/* Botones personalizados (hidden en mobile para priorizar swipe) */}
          {multimedia.length > 1 && (
            <>
              <button
                onClick={() => swiperRef.current?.slidePrev()}
                className="hidden md:block absolute top-1/2 left-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
                aria-label="Anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => swiperRef.current?.slideNext()}
                className="hidden md:block absolute top-1/2 right-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
                aria-label="Siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Interacciones (pasamos onOpenModal y isInModal) */}
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

      {/* ++++++++++ RENDERIZADO LOCAL DEL MODAL SOLO SI !isInModal ++++++++++ */}
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

export default SocialMediaCarousel;