"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaStar } from "react-icons/fa";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

interface ResenasSectionProps {
  resenas: EnhancedPublicacion[];
  onSelectTab: () => void;
  limiteTeasers?: number;
}

const ResenasSection: React.FC<ResenasSectionProps> = ({
  resenas,
  onSelectTab,
  limiteTeasers = 4,
}) => {
  // 🔹 Solo reseñas con producto asociado (imagen opcional)
  const teasers = useMemo(
    () =>
      resenas
        .filter((r) => r.producto)
        .slice(0, limiteTeasers),
    [resenas, limiteTeasers]
  );

  const showSkeletons = teasers.length === 0;

  return (
    <section className="relative py-6 sm:py-6 bg-gradient-to-b from-white via-indigo-50/30 to-white overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {teasers
          .filter((r) => r.multimedia?.length > 0)
          .slice(0, 6)
          .map((r, i) => (
            <motion.div
              key={r.id}
              className="absolute rounded-3xl overflow-hidden shadow-md opacity-20"
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 10,
                delay: i * 0.25,
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
              <Image
                src={r.multimedia[0]?.url || "/placeholder-resena.jpg"}
                alt={r.titulo || "Reseña"}
                fill
                className="object-cover"

                sizes="30vw"
              />
            </motion.div>
          ))}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" />
      </div>

      {/* Título */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-10 sm:mb-6 px-6"
      >
        <motion.h2
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm mb-6 flex items-center justify-center gap-3"
          whileInView={{ scale: [0.97, 1] }}
          transition={{ duration: 0.6 }}
        >
          <FaStar className="text-yellow-400 text-4xl" />
          Opiniones de nuestros clientes
        </motion.h2>

        <p className="text-gray-600 text-base sm:text-lg mb-6 max-w-2xl mx-auto">
          Conoce las experiencias de quienes ya confiaron en nosotros
        </p>
      </motion.div>

      {/* Cuadrícula de reseñas */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 sm:px-12">
        {showSkeletons
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl bg-gray-200 h-[280px] animate-pulse"
              />
            ))
          : teasers.map((resena, index) => {
              const media = resena.multimedia[0];
              const tieneMedia = media?.url;
              const usuario =
                resena.negocio?.nombre ||
                `${resena.usuario.nombre} ${resena.usuario.apellido}`;
              const fotoPerfil =
                resena.negocio?.fotoPerfil || resena.usuario?.fotoPerfil;

              return (
                <motion.div
                  key={resena.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={onSelectTab}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 bg-white"
                >
                  {/* Imagen o texto motivacional */}
                  <div className="relative w-full aspect-[4/5]">
                    {tieneMedia ? (
                      <Image
                        src={media.url}
                        alt={resena.titulo || "Reseña"}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                     
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full px-6 text-center bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-900 text-white">
                        <p className="italic text-base sm:text-lg font-medium line-clamp-5 leading-relaxed">
                          <span className="text-4xl text-indigo-200 mr-1">“</span>
                          {resena.descripcion?.trim() ||
                            "Una experiencia maravillosa, totalmente recomendados."}
                          <span className="text-4xl text-indigo-200 ml-1">”</span>
                        </p>
                      </div>
                    )}

                    {/* Gradiente inferior e info */}
                    {tieneMedia && (
                      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-black/60 backdrop-blur-sm text-white">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              size={14}
                              className={
                                i < (resena.calificacion ?? 0)
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                              }
                            />
                          ))}
                        </div>

                        <p className="text-sm font-semibold line-clamp-2 mb-2">
                          {resena.titulo ||
                            resena.descripcion ||
                            "Excelente servicio"}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          {fotoPerfil && (
                            <Image
                              src={fotoPerfil}
                              alt={usuario}
                              width={26}
                              height={26}
                              className="rounded-full object-cover border border-white/40"
                            />
                          )}
                          <span className="text-xs opacity-90 font-medium">
                            {usuario}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
      </div>

      {/* Botón inferior */}
      <div className="relative z-10 flex justify-center mt-12">
        <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Ver más reseñas
        </motion.button>
      </div>
    </section>
  );
};

export default ResenasSection;
