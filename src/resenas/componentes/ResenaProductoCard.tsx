"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import { motion} from "framer-motion";
import { FaStar, FaGlobe, FaLock, FaUserFriends } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Swiper as SwiperType } from "swiper";
import Interactions from "@/interacciones/componentes/Interactions";
import PublicationModal from "@/publicaciones/componentes/PublicationModal";
import { useMediaAspectRatio } from "@/hooks/useMediaAspectRatio";

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
  const aspectRatio = useMediaAspectRatio(media.url, media.tipo);
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
      className="relative w-full h-full rounded-3xl overflow-hidden shadow-md group"
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
          className="w-full h-full object-cover bg-gray-50 transition-transform duration-700 group-hover:scale-105"
          aria-label={`Video ${index + 1} de ${multimediaLength}`}
        />
      ) : (
        <Image
          src={media.url}
          alt={`Imagen ${index + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover bg-gray-50 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          quality={80}
        />
      )}
      {descripcion && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 rounded-b-3xl">
          <p
            className="text-white text-sm sm:text-base leading-relaxed italic line-clamp-3"
            dangerouslySetInnerHTML={{
              __html: isInModal ? formattedDescription : formattedDescription.slice(0, maxDescriptionLength),
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

const formatDescription = (text: string) => {
  return text
    .replace(/#(\w+)/g, '<a href="/search?q=$1" class="text-indigo-300 hover:underline">#$1</a>')
    .replace(/@(\w+)/g, '<a href="/profile/$1" class="text-indigo-300 hover:underline">@$1</a>');
};

const ResenaProductoCard: React.FC<Props> = ({ publicacion, isInModal = false }) => {
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
      } catch  {
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
        return <FaGlobe className="text-gray-400" aria-label="Pública" />;
      case "PRIVADA":
        return <FaLock className="text-gray-400" aria-label="Privada" />;
      case "AMIGOS":
        return <FaUserFriends className="text-gray-400" aria-label="Amigos" />;
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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full h-[280px] bg-gray-200 rounded-3xl shadow-md animate-pulse"
      />
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full h-[280px] bg-white rounded-3xl shadow-md p-4 text-center text-red-500"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.4 }}
        className="group relative w-full bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100"
      >
        {/* Fondo decorativo animado */}
      

        {/* Cabecera: Usuario/Negocio */}
        <div className="relative z-10 flex items-center p-4 border-b border-gray-100">
          <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 shadow-sm">
            <Image
              src={publicacion.usuario.fotoPerfil || "/default-profile.png"}
              alt={`Foto de perfil de ${publicacion.usuario.nombre} ${publicacion.usuario.apellido}`}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <Link
              href={`/perfil/${publicacion.usuario.id}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-200 text-sm sm:text-base"
            >
              {publicacion.usuario.nombre} {publicacion.usuario.apellido}
            </Link>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              reseñó{" "}
              <Link
                href={`/producto/${extendedData?.producto?.slug || "#"}`}
                className="font-medium text-indigo-600 hover:underline"
              >
                {extendedData?.producto?.nombre || "este producto"}
              </Link>{" "}
              en{" "}
              <Link
                href={`/perfil/${extendedData?.negocio?.slug || "#"}`}
                className="font-medium text-indigo-600 hover:underline"
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
          <div className="relative z-10 flex justify-center items-center gap-2 p-3">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                size={16}
                className={i < (extendedData?.calificacion ?? 0) ? "text-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
        )}

        {/* Contenido */}
        {multimedia.length > 0 ? (
          <div className="relative z-10 w-full h-[350px] sm:h-[400px]">
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
              className="w-full h-full rounded-3xl"
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
          <div className="relative z-10 px-4 py-6 bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-900 rounded-3xl mx-4 my-4 shadow-inner h-[350px] sm:h-[400px] flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-white text-base sm:text-lg italic leading-relaxed line-clamp-5"
                dangerouslySetInnerHTML={{ __html: formatDescription(publicacion.descripcion || "Sin descripción") }}
              />
              {publicacion.descripcion && publicacion.descripcion.length > 100 && !isInModal && (
                <button
                  onClick={handleOpenModal}
                  className="mt-3 text-indigo-300 hover:text-indigo-100 font-medium text-sm focus:outline-none"
                  aria-label="Ver más de la reseña"
                >
                  Ver más
                </button>
              )}
            </div>
          </div>
        )}

        {/* Interacciones */}
        <div className="relative z-10 p-4 border-t border-gray-100">
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
        </div>
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
