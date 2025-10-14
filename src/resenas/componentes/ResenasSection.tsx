// app/ui/components/landing-page/ResenasSection.tsx

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaStar } from "react-icons/fa";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

interface ResenasSectionProps {
  resenas: EnhancedPublicacion[]; // Array de reseñas (precargadas o dinámicas)
  onSelectTab: () => void; // Función para cambiar a pestaña "Reseñas"
  limiteTeasers?: number; // Opcional: número de teasers a mostrar (default: 4)
}

const ResenasSection: React.FC<ResenasSectionProps> = ({
  resenas,
  onSelectTab,
  limiteTeasers = 4,
}) => {
  const teasers = resenas.slice(0, limiteTeasers); // Subconjunto para teaser

  // Mostrar skeletons si no hay reseñas
  const showSkeletons = teasers.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Gradiente sutil para elegancia, consistente con otros componentes */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50" />

      <div className="p-4 sm:p-6">
        {/* Título con ícono, elegante y centrado en mobile, homogéneo con otros */}
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FaStar className="text-indigo-600 text-2xl" />
          Reseñas
        </h2>

        {/* Descripción breve, consistente con otros componentes */}
        <p className="text-gray-600 text-sm mb-4">
          Lee lo que dicen nuestros clientes
        </p>

        {/* Híbrido: carrusel en mobile, cuadrícula en desktop/tablet */}
        {showSkeletons ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl bg-gray-200 h-[200px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile: Carrusel horizontal */}
            <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4">
              {teasers.map((resena, index) => (
                <motion.div
                  key={resena.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="snap-start flex-shrink-0 w-[80%] sm:w-[calc(50%-0.5rem)] rounded-xl bg-white shadow-md overflow-hidden"
                  style={{ height: "200px" }} // Alto homogéneo
                >
                  {/* Imagen */}
                  <div className="relative w-full h-[70%]">
                    <Image
                      src={resena.multimedia[0]?.url || "/placeholder-resena.jpg"}
                      alt={resena.titulo || "Reseña"}
                      fill
                      className="object-cover rounded-t-xl transition-transform duration-300 hover:scale-110"
                      sizes="(max-width: 768px) 80vw, 50vw"
                      loading="lazy"
                      quality={70}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Calificación o título */}
                  <div className="p-2 h-[30%] flex items-center justify-center">
                    {resena.calificacion != null ? (
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            size={14}
                            className={i < (resena.calificacion ?? 0) ? "text-yellow-400" : "text-gray-300"}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate text-center">
                        {resena.titulo || "Reseña"}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop/Tablet: Cuadrícula */}
            <div className="hidden md:grid gap-4 grid-cols-3 lg:grid-cols-4">
              {teasers.map((resena, index) => (
                <motion.div
                  key={resena.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="rounded-xl bg-white shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  style={{ height: "200px" }} // Alto homogéneo
                >
                  {/* Imagen */}
                  <div className="relative w-full h-[70%]">
                    <Image
                      src={resena.multimedia[0]?.url || "/placeholder-resena.jpg"}
                      alt={resena.titulo || "Reseña"}
                      fill
                      className="object-cover rounded-t-xl transition-transform duration-300 hover:scale-110"
                      sizes="(max-width: 1200px) 33vw, 25vw"
                      loading="lazy"
                      quality={70}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Calificación o título */}
                  <div className="p-2 h-[30%] flex items-center justify-center">
                    {resena.calificacion != null ? (
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            size={14}
                            className={i < (resena.calificacion ?? 0) ? "text-yellow-400" : "text-gray-300"}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate text-center">
                        {resena.titulo || "Reseña"}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Botón "Ver más" homogéneo con otros componentes */}
        <button
          onClick={onSelectTab}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          aria-label="Ver más reseñas"
        >
          Ver más reseñas
        </button>
      </div>
    </motion.div>
  );
};

export default ResenasSection;