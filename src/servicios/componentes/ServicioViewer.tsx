"use client";

import React, { useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ServicioData } from "../interfaces/servicios.interface";
import Link from "next/link";
import { FollowButton } from "@/feed/componentes/FollowButton";
import { InfoEmpresa as empresa } from "@/config/config";
import { BsWhatsapp } from "react-icons/bs";
import { titulo1 } from "@/config/fonts";
import { FaTimes } from "react-icons/fa";

interface Props {
  servicio: ServicioData;
  version?: 1 | 2;
}

const urlWebProduccion = empresa.linkWebProduccion;

const ServicioViewer: React.FC<Props> = ({ servicio, version = 1 }) => {
  const { titulo, descripcion, precio, currency, multimedia = [], negocioSlug, telefonoNegocio, nombreNegocio, negocioFotoPerfil } = servicio;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el servicio: *${titulo}*. ¿Podemos charlar?\n\nVer más en: ${urlWebProduccion}/perfil/${negocioSlug}`
  );

  const orderedMultimedia = useMemo(() =>
    [...multimedia].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [multimedia]
  );

  const fullDescription = descripcion.join('\n\n');
  const isLongDescription = fullDescription.length > 150;

  // Clases condicionales basadas en la versión
  const containerClasses = version === 1 
    ? "grid grid-cols-1 md:grid-cols-2 md:grid-rows-[auto_auto_1fr_auto] gap-6 p-6 bg-white rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 max-w-4xl mx-auto"
    : "grid grid-cols-1 gap-6 p-6 bg-white rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 max-w-[380px] mx-auto cursor-pointer";

  // Handler para abrir modal en version=2 al clickear la card
  const handleCardClick = () => {
    if (version === 2) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={containerClasses}
        onClick={handleCardClick} // Solo clickable en version=2
      >
        {/* Header: Nombre del negocio + Follow (siempre arriba) */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {negocioFotoPerfil && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={negocioFotoPerfil}
                  alt={`Perfil de ${nombreNegocio}`}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <Link
              href={`/perfil/${negocioSlug || ''}`}
              className={`text-lg font-medium text-gray-800 hover:text-gray-900 transition-colors duration-200 ${titulo1.className}`}
            >
              {nombreNegocio || "Negocio Desconocido"}
            </Link>
          </div>
          <FollowButton followedId={servicio.negocioId} type="USER_TO_BUSINESS" className="text-sm" />
        </div>

        {/* Título (debajo de header en mobile, row 2 en desktop) */}
        <h2 className="text-3xl md:text-3xl text-center font-semibold text-gray-900 leading-tight">
          {titulo}
        </h2>

        {/* Multimedia (debajo de título en mobile, izquierda full-height en desktop) */}
        <div
          className="relative w-full h-[200px] sm:h-[250px] md:h-auto rounded-2xl overflow-hidden cursor-pointer"
          onClick={() => setIsModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Ampliar servicio"
          style={{ aspectRatio: '4 / 3' }}
        >
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
                    <video src={media.url} controls className="w-full h-full object-cover" />
                  ) : (
                    <Image src={media.url} alt={`Imagen ${index + 1}`} fill className="object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
                  )}
                </SwiperSlide>
              ))}
            </Swiper>
          ) : orderedMultimedia.length === 1 ? (
            orderedMultimedia[0].url.endsWith('.mp4') || orderedMultimedia[0].url.endsWith('.mov') ? (
              <video src={orderedMultimedia[0].url} controls className="w-full h-full object-cover" />
            ) : (
              <Image src={orderedMultimedia[0].url} alt="Imagen del servicio" fill className="object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 rounded-2xl">
              No hay multimedia disponible
            </div>
          )}
        </div>

        {/* Descripción (debajo de swiper en mobile, row 3 en desktop) */}
        <div className="text-gray-600 text-base leading-relaxed relative">
          <div className={isLongDescription ? "line-clamp-3" : ""}>
            {descripcion.map((parrafo, index) => (
              <p key={index} className="mb-2">{parrafo}</p>
            ))}
          </div>
          {isLongDescription && (
            <button onClick={() => setIsModalOpen(true)} className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none">
              Ver más
            </button>
          )}
        </div>

        {/* Footer: Precio + WhatsApp (debajo en mobile, row 4 en desktop) */}
        <div className="flex items-center justify-around mt-auto pt-4 border-t border-gray-100">
          {precio && (
            <p className="text-xl font-medium text-gray-900">
              {precio.toLocaleString()} {currency}
            </p>
          )}
          {telefonoNegocio && (
            <motion.a
              href={`https://wa.me/57${telefonoNegocio}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white p-3 rounded-full hover:bg-[#20bd5a] transition-all duration-300 shadow-md"
              whileHover={{ scale: 1.05 }}
              aria-label="Contactar vía WhatsApp"
            >
              <BsWhatsapp className="text-2xl" />
            </motion.a>
          )}
        </div>
      </motion.div>

      {/* Modal (mantenido elegante, con scroll suave y responsive) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 50 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-3xl h-auto max-h-[90vh] overflow-y-auto relative md:w-4/5"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
                aria-label="Cerrar modal"
              >
                <FaTimes size={24} />
              </motion.button>

              <div className="flex flex-col space-y-6">
                {/* Header del negocio */}
                <div className="flex items-center justify-around pb-2 pr-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {negocioFotoPerfil && (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={negocioFotoPerfil}
                          alt={`Perfil de ${nombreNegocio}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <Link
                      href={`/perfil/${negocioSlug || ''}`}
                      className={`text-lg font-medium text-gray-800 hover:text-gray-900 transition-colors duration-200 ${titulo1.className}`}
                    >
                      {nombreNegocio || "Negocio Desconocido"}
                    </Link>
                  </div>
                  <FollowButton
                    followedId={servicio.negocioId}
                    version={2}
                    type="USER_TO_BUSINESS"
                    className="text-sm"
                  />
                </div>

                {/* Título */}
                <h2 className="text-3xl font-semibold text-gray-900 text-center">
                  {titulo}
                </h2>

                {/* Multimedia */}
                <div className="relative w-full h-[40vh] md:h-[400px] rounded-2xl overflow-hidden">
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
                            <video src={media.url} controls className="w-full h-full object-contain" />
                          ) : (
                            <Image
                              src={media.url}
                              alt={`Imagen ${index + 1}`}
                              fill
                              className="object-contain"
                              loading="lazy"
                            />
                          )}
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  ) : orderedMultimedia.length === 1 ? (
                    orderedMultimedia[0].url.endsWith('.mp4') || orderedMultimedia[0].url.endsWith('.mov') ? (
                      <video src={orderedMultimedia[0].url} controls className="w-full h-full object-contain" />
                    ) : (
                      <Image
                        src={orderedMultimedia[0].url}
                        alt="Imagen del servicio"
                        fill
                        className="object-contain"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <p className="text-gray-500 text-center">No hay multimedia</p>
                  )}
                </div>

                {/* Descripción completa */}
                <div className="text-gray-600 text-base leading-relaxed overflow-y-auto max-h-[30vh] md:max-h-none p-2">
                  {descripcion.map((parrafo, index) => (
                    <p key={index} className="mb-4">{parrafo}</p>
                  ))}
                </div>

                {/* Footer con Precio + WhatsApp */}
                <div className="flex flex-col md:flex-row items-center justify-around gap-4 mt-6 pt-4 border-t border-gray-100">
                  {precio && (
                    <p className="text-xl font-medium text-gray-900 text-center md:text-left">
                      {precio.toLocaleString()} {currency}
                    </p>
                  )}
                  {telefonoNegocio && (
                    <Link
                      href={`https://wa.me/57${telefonoNegocio}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-white p-3 rounded-full hover:bg-[#20bd5a] transition-all duration-300 flex items-center gap-2 w-full md:w-auto justify-center shadow-md"
                    >
                      <BsWhatsapp className="text-2xl" /> Contactar
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ServicioViewer;