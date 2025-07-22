"use client";


import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Typography } from "@mui/material";
import {  titulo1 } from "@/config/fonts";
import { EnhancedPublicacion } from "../interfaces/enhancedPublicacion.interface";
import Interactions from "@/interacciones/componentes/Interactions";
import { useCallback } from "react";


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

  console.log("ShowTestimonioPublicacion publicacion.id:", publicacion.id, "slug:", publicacion.negocio?.slug);
  console.log(publicacion.comments, "Comentarios obtenidos");

  // Validar publicacion.id y slug
  if (!publicacion.id || !/^c[0-9a-z]{24}$/.test(publicacion.id)) {
    return (
      <div className="max-w-3xl mx-auto my-6 bg-white rounded-2xl shadow-lg p-4">
        <Typography color="error">Error: ID de publicación inválido</Typography>
      </div>
    );
  }
  if (!publicacion.negocio?.slug || !/^[a-z0-9-]+$/i.test(publicacion.negocio.slug)) {
    return (
      <div className="max-w-3xl mx-auto my-6 bg-white rounded-2xl shadow-lg p-4">
        <Typography color="error">Error: Slug de negocio inválido</Typography>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-6 bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:scale-[1.01] duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gray-100">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            <Image
              src={publicacion.negocio.fotoPerfil || "/default-profile.png"}
              alt="Avatar negocio"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>

          {/* Nombre negocio y tiempo */}
          <div className="flex flex-col">
            <Link href={`/perfil/${publicacion.negocio.slug}`} passHref>
              <Typography
                variant="subtitle1"
                className={`font-semibold text-gray-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer ${titulo1.className}`}
                style={{ textDecoration: "none" }}
              >
                {publicacion.negocio?.nombre || "Negocio Desconocido"}
              </Typography>
            </Link>
            <Typography variant="caption" className="text-gray-500">
              {timeAgo}
            </Typography>
          </div>
        </div>
      </div>

      {/* Imagen o Video */}
      <div className="relative w-full h-64 md:h-96 bg-black">
        {mediaUrl.endsWith(".mp4") ? (
          <video
            src={mediaUrl}
            className="w-full h-full object-cover rounded-none"
            controls
            preload="metadata"
          />
        ) : (
          <Image
            src={mediaUrl}
            alt={publicacion.titulo || "Publicación"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        {publicacion.titulo && (
          <Typography variant="h6" className="font-bold text-gray-900 mb-2">
            {publicacion.titulo}
          </Typography>
        )}
        {publicacion.descripcion && (
          <Typography variant="body2" className="text-gray-700 mb-4">
            {publicacion.descripcion}
          </Typography>
        )}
        {/* Productos relacionados */}
        {productos && productos.length > 0 && (
          <div className="mb-1">
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
        isAuthenticated={publicacion.isAuthenticated ?? true} // Usar valor por defecto si no se proporciona
        onInteraction={handleInteraction}
      />
    </div>
  );
};