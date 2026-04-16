"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaBriefcase } from "react-icons/fa";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import Divider from "@/ui/components/divider/Divider";
import { getDeterministicFloatingCardStyle } from "./landing-section.utils";

interface ServiciosSectionProps {
  servicios: ServicioData[];
  onSelectTab: () => void;
  limiteTeasers?: number;
}

const ServiciosSection: React.FC<ServiciosSectionProps> = ({
  servicios,
  onSelectTab,
  limiteTeasers = 4,
}) => {
  const teasers = useMemo(() => servicios.slice(0, limiteTeasers), [servicios, limiteTeasers]);
  const showSkeletons = teasers.length === 0;

  return (
    <section className="relative py-2 sm:py-2 bg-gradient-to-b from-white via-yellow-50/30 to-white overflow-hidden">
      {/* Fondo animado sutil */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {servicios.slice(0, 6).map((s, i) => (
          <motion.div
            key={s.id || i}
            className="absolute rounded-3xl overflow-hidden shadow-md opacity-20"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 8,
              delay: i * 0.2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "mirror",
            }}
            style={getDeterministicFloatingCardStyle(
              s.id || `${s.titulo}-${i}`,
              i
            )}
          >
            {s.multimedia[0]?.url && (
              <Image
                src={s.multimedia[0].url}
                alt={s.titulo}
                fill
                className="object-cover"
                
                sizes="30vw"
              />
            )}
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" />
      </div>

      {/* Título central, al estilo de ProductosSection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-10 sm:mb-6 px-6"
      >
        <motion.h2
          className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm mb-2 flex items-center justify-center gap-3"
          whileInView={{ scale: [0.97, 1] }}
          transition={{ duration: 0.6 }}
        >
          <FaBriefcase className="text-yellow-600 text-4xl sm:text-5xl" />
          Nuestros servicios
        </motion.h2>

        {/* <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-yellow-600 text-white font-semibold text-lg hover:bg-yellow-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Explorar todos los servicios
        </motion.button> */}
      </motion.div>

      {/* Contenedor de tarjetas */}
      <div className="relative z-10 px-6 sm:px-12">
        {showSkeletons ? (
          <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl bg-gray-200 h-[240px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {teasers.map((servicio, index) => (
              <motion.div
                key={servicio.id || index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                onClick={onSelectTab}
                className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative w-full aspect-[4/5]">
                  <Image
                    src={servicio.multimedia[0]?.url || "/placeholder-service.jpg"}
                    alt={servicio.titulo}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-black/60 text-center">
                    <p className="text-white text-lg sm:text-xl font-semibold tracking-tight">
                      {servicio.titulo}
                    </p>
                    {servicio.precio && (
                      <p className="text-yellow-300 text-sm mt-1 font-medium">
                        ${servicio.precio.toLocaleString("es-CO")}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Botón inferior */}
      <div className="relative z-10 flex justify-center mt-12">
        <motion.button
          onClick={onSelectTab}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full bg-yellow-600 text-white font-semibold text-lg hover:bg-yellow-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105"
        >
          Ver más servicios
        </motion.button>
      </div>
      <Divider />
    </section>
  );
};

export default ServiciosSection;
