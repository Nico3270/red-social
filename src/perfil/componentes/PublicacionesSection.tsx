"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { FaRegNewspaper, FaImages, FaPlayCircle, FaQuoteRight } from "react-icons/fa";
import Image from "next/image";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import Divider from "@/ui/components/divider/Divider";

interface PublicacionesSectionProps {
  publicaciones: EnhancedPublicacion[];
  onSelectTab: () => void;
  limiteTeasers?: number;
}

const iconosTipo: Record<EnhancedPublicacion["tipo"], JSX.Element> = {
  CARRUSEL_IMAGENES: <FaImages className="text-white text-lg" />,
  VIDEO_HORIZONTAL: <FaPlayCircle className="text-white text-lg" />,
  VIDEO_VERTICAL: <FaPlayCircle className="text-white text-lg" />,
  PRODUCTO_DESTACADO: <FaRegNewspaper className="text-white text-lg" />,
  MINI_GRID: <FaImages className="text-white text-lg" />,
  TESTIMONIO: <FaQuoteRight className="text-white text-lg" />,
};

const PublicacionesSection: React.FC<PublicacionesSectionProps> = ({
  publicaciones,
  onSelectTab,
  limiteTeasers = 4,
}) => {
  // 🔹 Solo publicaciones con multimedia y sin producto asociado
  const teasers = useMemo(
    () =>
      publicaciones
        .filter((p) => p.multimedia?.length > 0 && !p.producto)
        .slice(0, limiteTeasers),
    [publicaciones, limiteTeasers]
  );

  return (
    <section className="relative py-0 sm:py-6 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {teasers.slice(0, 6).map((p, i) => {
          const media =
            p.multimedia.find((m) => m.tipo === "IMAGEN" || m.tipo === "VIDEO") ||
            p.multimedia[0];

          return (
            <motion.div
              key={p.id}
              className="absolute rounded-3xl overflow-hidden shadow-md opacity-15"
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 10,
                delay: i * 0.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }}
              style={{
                top: `${Math.random() * 70}%`,
                left: `${Math.random() * 70}%`,
                width: `${180 + Math.random() * 160}px`,
                height: `${140 + Math.random() * 180}px`,
                rotate: `${Math.random() * 20 - 10}deg`,
              }}
            >
              {media?.url && (
                <Image
                  src={media.url}
                  alt={p.titulo || "Publicación"}
                  fill
                  className="object-cover"
    
                  sizes="30vw"
                />
              )}
            </motion.div>
          );
        })}
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
      </div>

      {/* Título y botón */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-10 sm:mb-4 px-6"
      >
        <motion.h2
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm mb-6"
          whileInView={{ scale: [0.97, 1] }}
          transition={{ duration: 0.6 }}
        >
          Últimas publicaciones
        </motion.h2>

        {/* <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Explorar todas las publicaciones
        </motion.button> */}
      </motion.div>

      {/* Grid de publicaciones */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-6 sm:px-12">
        {teasers.map((pub, index) => {
          const media =
            pub.multimedia.find((m) => m.tipo === "IMAGEN" || m.tipo === "VIDEO") ||
            pub.multimedia[0];
          const descripcion = pub.descripcion || pub.titulo || "Publicación destacada";

          return (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              onClick={onSelectTab}
              className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <div className="relative w-full aspect-[4/5]">
                {media?.tipo === "VIDEO" ? (
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    loop
                    autoPlay
                  />
                ) : (
                  <Image
                    src={media?.url || "/placeholder.jpg"}
                    alt={pub.titulo || "Publicación"}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )}

                {/* Caja fija con descripción */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-black/60 backdrop-blur-sm text-center">
                  <div className="flex justify-center mb-1">
                    {iconosTipo[pub.tipo]}
                  </div>
                  <p className="text-white text-sm sm:text-base font-semibold line-clamp-2">
                    {descripcion}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Botón inferior */}
      <div className="relative z-10 flex justify-center mt-6">
        <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Ver más publicaciones
        </motion.button>
      </div>
      <Divider />
    </section>
  );
};

export default PublicacionesSection;
