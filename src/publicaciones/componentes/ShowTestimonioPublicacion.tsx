"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Typography } from "@mui/material";
import { titulo1 } from "@/config/fonts";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";
import Interactions from "@/interacciones/componentes/Interactions";

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
}

export const ShowTestimonioPublicacion = ({ publicacion, productos }: ShowTestimonioPublicacionProps) => {
  const mediaUrl = publicacion.multimedia?.[0]?.url || "/placeholder-image.jpg";
  const timeAgo = formatDistanceToNow(new Date(publicacion.createdAt), { addSuffix: true, locale: es });

  const handleInteraction = useCallback(
    (type: "COMENTARIO" | "REACCION" | "COMPARTIDO", data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }) => {
      console.log(`Interacción: ${type}`, data);
      publicacion.onInteraction?.(type, data);
    },
    [publicacion.onInteraction]
  );

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
    <div className="w-full my-6 bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Cabecera: Usuario/Negocio */}
      <div className="p-4 flex items-center border-b border-gray-100">
        <div className="relative w-12 h-12 rounded-full overflow-hidden mr-3">
          <Image
            src={publicacion.negocio.fotoPerfil || "/default-profile.png"}
            alt="Avatar negocio"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <Link
            href={`/perfil/${publicacion.negocio.slug}`}
            className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 ${titulo1.className}`}
          >
            {publicacion.negocio?.nombre || "Negocio Desconocido"}
          </Link>
          <div className="flex items-center text-sm text-gray-500">
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Descripción encima de la imagen */}
      {publicacion.descripcion && (
        <div className="p-4 text-gray-800 leading-snug relative">
          <div className="transition-all duration-300 ease-in-out overflow-hidden max-h-[4.8em]">
            <p className="whitespace-pre-wrap break-words text-md">
              {publicacion.descripcion.length > 100
                ? `${publicacion.descripcion.slice(0, 100)}...`
                : publicacion.descripcion}
            </p>
          </div>
        </div>
      )}

      {/* Imagen o Video */}
      <div className="relative w-full">
        <div className="relative w-full" style={{ aspectRatio: 16 / 9 }}>
          {mediaUrl.endsWith(".mp4") ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover rounded-b-xl"
              controls
              preload="metadata"
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={publicacion.titulo || "Publicación"}
              fill
              className="object-cover rounded-b-xl"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Contenido (título y productos) */}
      <div className="p-4">
        {publicacion.titulo && (
          <Typography variant="h6" className="font-bold text-gray-900 mb-2">
            {publicacion.titulo}
          </Typography>
        )}
        {productos && productos.length > 0 && (
          <div className="mb-4">
            <Typography variant="caption" className="text-gray-500 mb-2 block">
              Productos relacionados:
            </Typography>
            <div className="flex flex-wrap gap-3">
              {productos.map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 relative">
                    <Image
                      src={producto.imagen || "/placeholder-image.jpg"}
                      alt={producto.nombre}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Link href={`/producto/${producto.slug}`} passHref>
                      <Typography
                        variant="body2"
                        className="text-blue-600 hover:underline cursor-pointer"
                        style={{ textDecoration: "none" }}
                      >
                        {producto.nombre}
                      </Typography>
                    </Link>
                    <Typography variant="caption" className="text-gray-600">
                      ${producto.precio.toFixed(2)}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interacciones */}
      <Interactions
        publicacionId={publicacion.id}
        numLikes={publicacion.numLikes}
        numComentarios={publicacion.numComentarios}
        numCompartidos={publicacion.numCompartidos}
        userReaction={publicacion.userReaction}
        comments={publicacion.comments || []}
        isAuthenticated={publicacion.isAuthenticated ?? true}
        onInteraction={handleInteraction}
      />
    </div>
  );
};

export default ShowTestimonioPublicacion;