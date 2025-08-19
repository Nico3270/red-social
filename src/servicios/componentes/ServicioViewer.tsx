"use client";

import React, { useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import Image from "next/image";
import { motion } from "framer-motion";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ServicioData } from "../interfaces/servicios.interface";


// Hook personalizado para obtener dimensiones de medios (reutilizado de referencia)
const useMediaDimensions = (url: string, tipo: "IMAGEN" | "VIDEO") => {
  // Implementación similar a la referencia, omitida por brevedad; asume retorna aspectRatio
  return 1; // Placeholder; copia la lógica completa si needed
};

interface Props {
  servicio: ServicioData;
}

const ServicioViewer: React.FC<Props> = ({ servicio }) => {
  const { titulo, descripcion, precio, currency, multimedia = [] } = servicio;

  // Memo para multimedia ordenada
  const orderedMultimedia = useMemo(() => 
    [...multimedia].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
  [multimedia]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white rounded-3xl shadow-lg max-w-4xl mx-auto"
    >
      {/* Izquierda: Multimedia (carrusel o single) */}
      <div className="relative w-full h-[400px] md:h-auto rounded-2xl overflow-hidden shadow-md">
        {orderedMultimedia.length > 1 ? (
          <Swiper
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            modules={[Pagination, Navigation]}
            className="w-full h-full"
          >
            {orderedMultimedia.map((media, index) => (
              <SwiperSlide key={index}>
                {media.url.endsWith('.mp4') || media.url.endsWith('.mov') ? (
                  <video
                    src={media.url}
                    controls
                    className="w-full h-full object-cover"
                    aria-label={`Video ${index + 1} del servicio`}
                  />
                ) : (
                  <Image
                    src={media.url}
                    alt={`Imagen ${index + 1} del servicio ${titulo}`}
                    fill
                    className="object-cover"
                    loading="lazy"
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        ) : orderedMultimedia.length === 1 ? (
          orderedMultimedia[0].url.endsWith('.mp4') || orderedMultimedia[0].url.endsWith('.mov') ? (
            <video
              src={orderedMultimedia[0].url}
              controls
              className="w-full h-full object-cover"
              aria-label="Video del servicio"
            />
          ) : (
            <Image
              src={orderedMultimedia[0].url}
              alt={`Imagen del servicio ${titulo}`}
              fill
              className="object-cover"
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
            No hay multimedia disponible
          </div>
        )}
      </div>

      {/* Derecha: Contenido */}
      <div className="flex flex-col justify-center space-y-4">
        {/* Título */}
        <h2 className="text-2xl font-semibold text-gray-900">{titulo}</h2>

        {/* Descripción */}
        <div className="text-gray-700 space-y-2">
          {descripcion.map((parrafo, index) => (
            <p key={index}>{parrafo}</p>
          ))}
        </div>

        {/* Precio */}
        {precio && (
          <p className="text-lg font-medium text-gray-900">
            {precio.toLocaleString()} {currency}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default ServicioViewer;