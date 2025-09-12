"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Typography } from "@mui/material";
import { titulo1 } from "@/config/fonts";
import Interactions from "@/interacciones/componentes/Interactions";
import PublicationModal from "./PublicationModal";
import { motion } from "framer-motion";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";

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

// Hook personalizado para obtener dimensiones de medios (optimizado con fallback responsive)
const useMediaDimensions = (url: string, tipo: "IMAGEN" | "VIDEO" | undefined) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!url) {
      setAspectRatio(1); // Fallback cuadrado
      return;
    }

    const loadDimensions = async () => {
      try {
        if (tipo === "IMAGEN" || !tipo) {
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
              setAspectRatio(video.videoWidth / video.videoHeight || 9 / 16); // Vertical para videos sociales
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
        if (process.env.NODE_ENV === "development") {
          console.error("Error cargando dimensiones:", error);
        }
        setAspectRatio(tipo === "VIDEO" ? 9 / 16 : 1);
      }
    };

    loadDimensions();
    return () => {
      setAspectRatio(null);
    };
  }, [url, tipo]);

  return aspectRatio;
};

export const ShowTestimonioPublicacion = ({ publicacion, productos, isInModal = false }: ShowTestimonioPublicacionProps) => {
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);

  const media = publicacion.multimedia?.[0];
  const mediaUrl = media?.url || "/placeholder-image.jpg";
  const mediaTipo = media?.tipo;
  const aspectRatio = useMediaDimensions(mediaUrl, mediaTipo);
  const timeAgo = formatDistanceToNow(new Date(publicacion.createdAt), { addSuffix: true, locale: es });

  const handleOpenModal = useCallback(() => {
    if (!isInModal) {
      setIsModalOpenLocal(true);
    }
  }, [isInModal]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpenLocal(false);
  }, []);

  if (!publicacion.id || !/^c[0-9a-z]{24}$/.test(publicacion.id)) {
    return (
      <div className="w-full my-6 bg-white rounded-2xl shadow-lg p-4">
        <Typography color="error">Error: ID de publicación inválido</Typography>
      </div>
    );
  }
  if (!publicacion.negocio?.slug || !/^[a-z0-9-]+$/i.test(publicacion.negocio.slug)) {
    return (
      <div className="w-full my-6 bg-white rounded-2xl shadow-lg p-4">
        <Typography color="error">Error: Slug de negocio inválido</Typography>
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
              src={publicacion.negocio.fotoPerfil || "/default-profile.png"}
              alt="Avatar del negocio"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0"> {/* min-w-0 para truncate en móviles */}
            <Link
              href={`/perfil/${publicacion.negocio.slug}`}
              className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 truncate ${titulo1.className}`}
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
              <p className="whitespace-pre-wrap break-words text-md">
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
          {mediaUrl.endsWith(".mp4") || mediaTipo === "VIDEO" ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-contain rounded-b-xl" // Contain para no distorsionar
              controls
              preload="metadata"
              poster="/placeholder-video-poster.jpg" // Opcional para thumbnail
            />
          ) : (
            <Image
              src={mediaUrl}
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
                {productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg shadow-sm hover:bg-gray-100 transition-colors flex-1 min-w-[140px]" // Responsive min-width
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={producto.imagen || "/placeholder-image.jpg"}
                        alt={producto.nombre}
                        fill
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
                ))}
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