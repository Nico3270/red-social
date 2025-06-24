"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {  SeccionesFont, titleFont, titulosPrincipales } from "@/config/fonts";

// Interfaz para los datos del carrusel
export interface Testimonial {
  imagen: string; // URL de la imagen
  titulo: string; // Título del testimonio (ej. nombre)
  descripcion: string; // Descripción o frase motivadora
}

interface Props {
  testimonios: Testimonial[];
}

const Testimonials: React.FC<Props> = ({ testimonios }) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef] p-1 rounded-lg shadow-lg">
      {/* Encabezado */}
      <div className="text-center mb-4">
        <h2 className={`text-4xl font-extrabold color-titulos ${titulosPrincipales.className}`}>Nuestros clientes</h2> 
      </div>
      <Swiper
        spaceBetween={20}
        slidesPerView={1}
        navigation={true}
        pagination={{ clickable: true }}
        loop={true}
        autoplay={{
          delay: 7000,
          disableOnInteraction: false,
        }}
        modules={[Pagination, Navigation, Autoplay]}
        className="mySwiper"
      >
        {testimonios.map((testimonio, index) => (
          <SwiperSlide key={index}>
            <div className="flex flex-col items-center text-center gap-4">
              {/* Imagen de la persona */}
              <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shadow-md">
                <Image
                  src={testimonio.imagen}
                  alt={testimonio.titulo}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Título y descripción */}
              <div className="w-full">
                <h3 className={`text-xl md:text-2xl font-bold color-titulo-tarjeta ${SeccionesFont.className}`}>
                  {testimonio.titulo}
                </h3>
                <p className={`text-sm md:text-base color-descripcion-tarjeta mt-2 mb-8 ${titleFont.className}`}>
                  {testimonio.descripcion}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Testimonials;
