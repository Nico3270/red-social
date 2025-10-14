"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion} from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { titulosPrincipales } from "@/config/fonts";
import ResenaProductoCard from "./ResenaProductoCard";
import { ResenaProducto } from "../actions/getResenasProductoTestimonio";
import { getMejoresResenasProducto } from "../actions/getMejoresResenasProducto";
import { getPeoresResenasProducto } from "../actions/getPeoresResenasProducto";
import "swiper/css";
import "swiper/css/navigation";
import type { Swiper as SwiperType } from "swiper";

interface Props {
  resenas: ResenaProducto[];
  productSlug: string;
}

const FeedResenasProducto: React.FC<Props> = ({ resenas: initialResenas, productSlug }) => {
  const [resenas, setResenas] = useState<ResenaProducto[]>(initialResenas);
  const [filter, setFilter] = useState<"mejores" | "peores">("mejores");
  const [loading, setLoading] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);


  // Cargar reseñas según el filtro
  useEffect(() => {
    const loadResenas = async () => {
      setLoading(true);
      try {
        const result =
          filter === "mejores"
            ? await getMejoresResenasProducto(productSlug)
            : await getPeoresResenasProducto(productSlug);

        if (result.ok && result.resenas) {
          setResenas(result.resenas);
        } else {
          setResenas([]);
        }
      } catch (error) {
        console.error("Error cargando reseñas:", error);
        setResenas([]);
      } finally {
        setLoading(false);
      }
    };

    loadResenas();
  }, [filter, productSlug]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-screen-xl mx-auto px-4 sm:px-0 py-4 sm:py-6 text-center text-gray-500"
      >
        Cargando reseñas...
      </motion.div>
    );
  }

  if (!resenas || resenas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center text-gray-500"
      >
        No hay reseñas disponibles para este producto.
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-screen-xl mx-auto px-4 sm:px-0 py-4 sm:py-6"
    >
      {/* Botones de filtro */}
      <div className="flex flex-col sm:flex-row justify-around items-center mb-6 gap-4">
        <h2
          className={`text-2xl sm:text-3xl font-bold text-gray-800 ${titulosPrincipales.className}`}
        >
          Reseñas de Clientes
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("mejores")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm ${
              filter === "mejores"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            aria-label="Mostrar mejores reseñas"
          >
            Mejores Reseñas
          </button>
          <button
            onClick={() => setFilter("peores")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm ${
              filter === "peores"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            aria-label="Mostrar peores reseñas"
          >
            Peores Reseñas
          </button>
        </div>
      </div>

      {/* Contenedor del carrusel con espacio para botones */}
      <div className="relative w-full lg:px-6">
        <Swiper
          modules={[Navigation, Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={16}
          slidesPerView={1.2} // 👈 muestra un poquito del siguiente slide
          breakpoints={{
            640: { slidesPerView: 1.2, spaceBetween: 16 },
            768: { slidesPerView: 2, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 24 },
          }}
          navigation={{
            prevEl: ".swiper-button-prev-custom",
            nextEl: ".swiper-button-next-custom",
          }}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="w-full"
        >
          {resenas.map((resena) => (
            <SwiperSlide key={resena.id}>
              <div className="w-full h-fit sm:h-[900px] flex items-center justify-center">
                <ResenaProductoCard
                  publicacion={{
                    id: resena.id,
                    usuario: resena.usuario,
                    negocio: resena.negocio,
                    tipo: "TESTIMONIO",
                    descripcion: resena.descripcion,
                    multimedia: resena.multimedia || [],
                    visibilidad: resena.visibilidad || "PUBLICA",
                    createdAt: resena.createdAt,
                    numLikes: resena.numLikes || 0,
                    numComentarios: resena.numComentarios || 0,
                    numCompartidos: resena.numCompartidos || 0,
                    userReaction: resena.userReaction || null,
                    comments: resena.comments || [],
                    calificacion: resena.calificacion,
                    isAuthenticated: !!resena.userReaction,
                  }}
                />
                
              </div>
             
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Botones de navegación - Solo visibles en pantallas grandes */}
        {resenas.length > 1 && (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="swiper-button-prev-custom hidden lg:flex absolute top-1/2 -translate-y-1/2 -left-2 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg transition-all z-20 items-center justify-center"
              aria-label="Reseñas anteriores"
            >
              <FaArrowLeft className="text-gray-800 text-xl " />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="swiper-button-next-custom hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-2 bg-white hover:bg-gray-50 rounded-full p-3 shadow-lg transition-all z-20 items-center justify-center"
              aria-label="Siguientes reseñas"
            >
              <FaArrowRight className="text-gray-800 text-xl" />
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default FeedResenasProducto;