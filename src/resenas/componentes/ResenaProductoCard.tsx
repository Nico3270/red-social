"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaGlobe, FaLock, FaUserFriends } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
}> = ({ media, index, multimediaLength, onClick, isInModal }) => {
  const aspectRatio = useMediaDimensions(media.url, media.tipo);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-h-[500px] mx-auto rounded-xl overflow-hidden shadow-sm cursor-pointer"
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
          className="w-full h-full object-cover"
        />
      ) : (
        <Image
          src={media.url}
          alt={`Imagen ${index + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
      )}
    </motion.div>
  );
};

const ResenaProductoCard: React.FC<Props> = ({ publicacion, isInModal = false }) => {
  const { data: session } = useSession();
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);
  const [extendedData, setExtendedData] = useState<ExtendedResenaData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDescription = useCallback((text: string) => {
    return text
      .replace(/#(\w+)/g, '<a href="/search?q=$1" class="text-blue-500 hover:underline">#$1</a>')
      .replace(/@(\w+)/g, '<a href="/profile/$1" class="text-blue-500 hover:underline">@$1</a>');
  }, []);

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
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6 p-4 text-center text-gray-500"
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
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6 p-4 text-center text-red-500"
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
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6 border border-gray-100"
      >
        <div className="flex items-center p-4 border-b border-gray-100">
          <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 shadow-sm">
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
            <p className="text-xs text-gray-500 flex items-center gap-1">
              reseñó
              <Link
                href={`/producto/${extendedData?.producto?.slug || "#"}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {extendedData?.producto?.nombre || "este producto"}
              </Link>
              en
              <Link
                href={`/perfil/${extendedData?.negocio?.slug || "#"}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {extendedData?.negocio?.nombre || "este negocio"}
              </Link>
              <span className="mx-1">·</span>
              {formatDistanceToNow(new Date(publicacion.createdAt), { locale: es, addSuffix: true })}
              {getVisibilityIcon()}
            </p>
          </div>
        </div>

        {extendedData?.calificacion != null && (
          <div className="px-4 py-2 flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <FaStar
                key={i}
                size={16}
                className={i < (extendedData?.calificacion ?? 0) ? "text-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
        )}

        {multimedia.length > 0 ? (
          <div className="relative w-full">
            <Swiper
              spaceBetween={10}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              loop={multimedia.length > 1}
              autoplay={{ delay: 3000, disableOnInteraction: true, pauseOnMouseEnter: true }}
              modules={[Pagination, Navigation, Autoplay]}
              className="mySwiper"
            >
              {multimedia.map((media, index) => (
                <SwiperSlide key={media.id}>
                  <MediaSlide
                    media={media}
                    index={index}
                    multimediaLength={multimedia.length}
                    onClick={handleOpenModal}
                    isInModal={isInModal}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div className="px-4 py-6 bg-gradient-to-b from-gray-50 to-white rounded-xl mx-4 my-4 shadow-inner">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words text-center italic">
              "{publicacion.descripcion || "Sin descripción"}"
            </p>
          </div>
        )}

        {publicacion.descripcion && multimedia.length > 0 && (
          <div className="px-4 py-3 text-gray-800 leading-relaxed">
            <p
              className="whitespace-pre-wrap break-words text-sm"
              dangerouslySetInnerHTML={{ __html: formatDescription(publicacion.descripcion) }}
            />
          </div>
        )}

        <Interactions
          key={publicacion.id}
          publicacionId={publicacion.id}
          slug={extendedData?.negocio?.slug}
          onOpenModal={handleOpenModal}
          isInModal={isInModal}
          numLikes={publicacion.numLikes}
          numComentarios={publicacion.numComentarios}
          numCompartidos={publicacion.numCompartidos}
          userReaction={publicacion.userReaction?.tipo ?? null}
          initialComments={publicacion.comments?.slice(0, 3) || []}
        />
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