"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
import Link from "next/link";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";
import { titulo1 } from "@/config/fonts";


interface Props {
  publicacion: EnhancedPublicacion;
}

// Hook personalizado para obtener dimensiones de medios
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



export const SocialMediaCarousel: React.FC<Props> = ({ publicacion }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const maxDescriptionLength = 100; // Límite para mostrar "Ver más"
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

  // Manejar interacciones (para pasar al componente Interactions)
  const handleInteraction = useCallback(
    (
      type: "COMENTARIO" | "REACCION" | "COMPARTIDO",
      data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }
    ) => {
      // TODO: Implementar server action para guardar la interacción
      console.log(`Interacción: ${type}`, data);
      publicacion.onInteraction?.(type, data); // Notificar al componente padre si existe onInteraction
    },
    [publicacion.onInteraction]
  );

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

  return (
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
          />
        </div>
        <div className="flex-1">
          <Link
            href={`/perfil/${publicacion.negocio?.slug || publicacion.usuario.id}`}
            className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer ${titulo1.className}`}
          >
            {publicacion.negocio?.nombre || `${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`}
          </Link>
          <div className="flex items-center text-sm text-gray-500">
            <span>{formatDistanceToNow(new Date(publicacion.createdAt), { locale: es, addSuffix: true })}</span>
            <span className="ml-2">{getVisibilityIcon()}</span>
          </div>
        </div>
      </div>

      {/* Descripción */}
      {publicacion.descripcion && (
        <div className="px-4 pt-2 pb-4 text-[18px] text-gray-800 leading-snug">
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isDescriptionExpanded ? "max-h-[999px]" : "max-h-[4.8em]"
              } relative`}
          >
            <p
              className="whitespace-pre-wrap break-words text-md"
              dangerouslySetInnerHTML={{
                __html: formatDescription(publicacion.descripcion),
              }}
            />
            {!isDescriptionExpanded && publicacion.descripcion.length > maxDescriptionLength && (
              <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
          {publicacion.descripcion.length > maxDescriptionLength && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none"
            >
              {isDescriptionExpanded ? "Ver menos" : "Ver más"}
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
            multimedia.map((media, index) => {
              const aspectRatio = useMediaDimensions(media.url, media.tipo);
              return (
                <SwiperSlide key={media.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full max-h-[500px] mx-auto"
                    style={{ aspectRatio: aspectRatio || 1 }}
                  >
                    {media.tipo === "VIDEO" ? (
                      <video
                        src={media.url}
                        controls
                        preload="metadata"
                        playsInline
                        muted={false}
                        className="w-full h-full object-contain rounded-xl"
                        aria-label={`Video ${index + 1} de ${multimedia.length} en carrusel`}
                      />
                    ) : (
                      <Image
                        src={media.url}
                        alt={publicacion.titulo || `Imagen ${index + 1} de carrusel`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover rounded-xl"
                        loading="lazy"
                      />
                    )}
                  </motion.div>
                </SwiperSlide>
              );
            })
          ) : (
            <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-200 rounded-xl">
              <p className="text-gray-500">No hay imágenes o videos disponibles</p>
            </div>
          )}
        </Swiper>
        {/* Botones personalizados */}
        {multimedia.length > 1 && (
          <>
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute top-1/2 left-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
              aria-label="Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md transition"
              aria-label="Siguiente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

      </div>



      {/* Interacciones */}
      <Interactions
        publicacionId={publicacion.id}
        numLikes={publicacion.numLikes}
        numComentarios={publicacion.numComentarios}
        numCompartidos={publicacion.numCompartidos}
        userReaction={publicacion.userReaction}
        comments={publicacion.comments}
        isAuthenticated={publicacion.isAuthenticated ?? true} // Usar valor por defecto si no se proporciona
        onInteraction={handleInteraction}
      />




    </motion.div>
  );
};

export default SocialMediaCarousel;