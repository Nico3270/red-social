"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import Image from "next/image";
import Link from "next/link";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./slideshow.css";
import {  titleFont, titulosCarrusel } from "@/config/fonts";

// Interface para las secciones
export interface Section {
  titulo: string;
  descripcion: string;
  imagen: string;
  url: string;
}

interface Props {
  secciones: Section[];
}

export const CarruselSections: React.FC<Props> = ({ secciones }) => {
  return (
    <section className="w-full bg-gradient-to-b from-[#f8f9fa] to-[#e9ecef]" aria-label="Sección destacada de productos">
      
      <Swiper
        spaceBetween={10}
        slidesPerView={1}
        navigation={true}
        pagination={{ clickable: true }}
        loop={true}
        autoplay={{
          delay: 20000, // 20 segundos entre cada slide
          disableOnInteraction: false,
        }}
        modules={[Pagination, Navigation, Autoplay]}
        className="mySwiper"
      >
        {secciones.map((seccion, index) => (
          <SwiperSlide key={index}>
            <article className="relative w-full h-[400px] md:h-[500px] lg:h-[800px]">
              <Link
                href={seccion.url}
                title={`Explora más sobre ${seccion.titulo}`}
                className="group"
              >
                {/* Imagen del producto */}
                <Image
                  src={`${seccion.imagen}`}
                  alt={`Detalles sobre ${seccion.titulo}`}
                  fill
                  className="rounded-lg object-cover"
                />
                {/* Contenedor de texto superpuesto */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-black/50 p-6 text-white">
                  <h3
                    className={`text-2xl font-extrabold color-titulo-carrusel ${titulosCarrusel.className}`}
                  >
                    {seccion.titulo}
                  </h3>
                  <p
                    className={`text-md  font-medium mt-2 drop-shadow-sm color-texto-carrusel ${titleFont.className}`}
                  >
                    {seccion.descripcion}
                  </p>
                </div>
              </Link>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};
