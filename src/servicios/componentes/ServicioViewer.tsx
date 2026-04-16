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
import { FaTimes } from "react-icons/fa";
import { Precio } from "@/ui/components/productos/Precio";
import { titleFont } from "@/config/fonts";

interface Props {
  servicio: ServicioData;
  version?: 1 | 2;
}

const urlWebProduccion = empresa.linkWebProduccion;

// Hook personalizado para obtener dimensiones de medios (copiado de SocialMediaCarousel)
const useMediaDimensions = (url: string, tipo: "IMAGEN" | "VIDEO") => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  React.useEffect(() => {
    if (!url) {
      setAspectRatio(1); // Fallback si no hay URL
      return;
    }

    const loadDimensions = async () => {
      try {
        if (tipo === "IMAGEN") {
          const img = new window.Image();
          img.src = url;
          await new Promise((resolve, reject) => {
            img.onload = () => {
              setAspectRatio(img.naturalWidth / img.naturalHeight || 1);
              resolve(null);
            };
            img.onerror = () => {
              setAspectRatio(1); // Fallback: proporción cuadrada
              reject(new Error("Error cargando imagen"));
            };
          });
        } else if (tipo === "VIDEO") {
          const video = document.createElement("video");
          video.src = url + "#t=0.1";
          video.muted = true;
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
              setAspectRatio(video.videoWidth / video.videoHeight || 9 / 16);
              resolve(null);
            };
            video.onerror = () => {
              setAspectRatio(9 / 16); // Fallback: proporción vertical típica
              reject(new Error("Error cargando video"));
            };
          });
          video.remove();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error cargando dimensiones:", error);
        }
        setAspectRatio(tipo === "VIDEO" ? 9 / 16 : 1); // Fallback según tipo
      }
    };

    loadDimensions();
    return () => {
      setAspectRatio(null);
    };
  }, [url, tipo]);

  return aspectRatio;
};

// Componente wrapper para cada slide (similar a MediaSlide en SocialMediaCarousel)
const MediaSlide: React.FC<{ 
  media: ServicioData["multimedia"][0]; 
  index: number; 
  multimediaLength: number; 
}> = ({ media, index, multimediaLength }) => {
  const aspectRatio = useMediaDimensions(media.url, media.tipo as "IMAGEN" | "VIDEO");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-h-[500px] mx-auto"
      style={{ aspectRatio: aspectRatio || 1 }}
    >
      {media.tipo === "VIDEO" ? (
        <video
          src={media.url}
          controls
          preload="metadata"
          playsInline
          muted={false}
          className="w-full h-full object-contain rounded-xl"
          aria-label={`Video ${index + 1} de ${multimediaLength} en carrusel`}
        />
      ) : (
        <Image
          src={media.url}
          alt={`Imagen ${index + 1} de carrusel`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover rounded-xl"
          loading="lazy"
        />
      )}
    </motion.div>
  );
};

const ServicioViewer: React.FC<Props> = ({ servicio, version = 1 }) => {
  const { titulo, descripcion, precio,  multimedia = [], negocioSlug, telefonoNegocio, nombreNegocio, negocioFotoPerfil } = servicio;
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
  const maxDescriptionLength = 100; // Usado para truncar en v2

  // Truncar descripción en v2
  // const truncatedDescription = version === 2 && isLongDescription
  //   ? fullDescription.slice(0, maxDescriptionLength) + '...'
  //   : fullDescription;

  // Clases condicionales basadas en la versión
  const containerClasses =
    version === 1
      ? "grid grid-cols-1 md:grid-cols-2 md:grid-rows-[auto_auto_1fr_auto] gap-6 p-6 bg-white rounded-3xl shadow-md hover:shadow-lg transition-shadow duration-300 max-w-4xl mx-auto"
      : "max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden mb-6";

  // Handler para abrir modal en version=2 al clickear la card (excepto en elementos interactivos)
  const handleCardClick = (e: React.MouseEvent) => {
    if (version === 2 && !(e.target as HTMLElement).closest('button, a, video')) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={containerClasses}
        onClick={handleCardClick} // Solo clickable en version=2, pero evita bubbling en botones/links
      >
        {/* Header: Nombre del negocio + Follow (alineado con SocialMediaCarousel en v2) */}
        <div className={version === 1 ? "flex items-center justify-between pb-2 border-b border-gray-100" : "flex items-center p-4 border-b border-gray-100"}>
          <div className="flex items-center gap-3"> {/* Ajustado mr-3 para alinear */}
            {negocioFotoPerfil && (
              <div className="relative w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src={negocioFotoPerfil}
                  alt={`Perfil de ${nombreNegocio}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <Link
                href={`/perfil/${negocioSlug || ''}`}
                className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer ${titleFont.className}`}
              >
                {nombreNegocio || "Negocio Desconocido"}
              </Link>
              {/* Espacio para timestamp/icon si se agrega en futuro, pero vacío por ahora para mantener estructura */}
              <div className="flex items-center text-sm text-gray-500">
                {/* Placeholder vacío */}
              </div>
            </div>
          </div>
          <FollowButton followedId={servicio.negocioId} version={2} type="USER_TO_BUSINESS" className="ml-auto text-sm" />
        </div>

        {/* Título (elegante, con padding similar a descripción en SocialMediaCarousel) */}
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-2xl font-semibold text-gray-900 leading-tight text-center md:text-left">
            {titulo}
          </h2>
        </div>

        {/* Descripción (alineada con estilo de SocialMediaCarousel: padding, overflow, "Ver más") */}
        <div className="px-4 pt-0 pb-4 text-[18px] text-gray-800 leading-snug">
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden relative
              ${isLongDescription ? "max-h-[4.8em] md:max-h-[19.2em]" : ""}`}
          >
            {descripcion.map((parrafo, index) => (
              <p key={index} className="whitespace-pre-wrap break-words text-md mb-2">
                {version === 2 ? parrafo.slice(0, maxDescriptionLength) + (parrafo.length > maxDescriptionLength ? '...' : '') : parrafo}
              </p>
            ))}
            {isLongDescription && (
              <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
          {isLongDescription && (
            <button onClick={() => setIsModalOpen(true)} className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm focus:outline-none">
              Ver más
            </button>
          )}
        </div>

        {/* Multimedia (alineado con SocialMediaCarousel: dinámico, max-h-[500px], rounded-xl) */}
        <div className="relative w-full">
          <Swiper
            spaceBetween={10}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            modules={[Pagination, Navigation]}
            className="mySwiper"
          >
            {orderedMultimedia.length > 0 ? (
              orderedMultimedia.map((media, index) => (
                <SwiperSlide key={index}>
                  <MediaSlide 
                    media={media} 
                    index={index} 
                    multimediaLength={orderedMultimedia.length} 
                  />
                </SwiperSlide>
              ))
            ) : (
              <SwiperSlide>
                <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-200 rounded-xl">
                  <p className="text-gray-500">No hay multimedia disponible</p>
                </div>
              </SwiperSlide>
            )}
          </Swiper>
        </div>

        {/* Footer: Precio + WhatsApp (con padding similar a interacciones en SocialMediaCarousel) */}
        <div className="px-4 py-4 flex items-center justify-between border-t border-gray-100">
          {precio && (
            <Precio value={precio}  />
          )}
          {telefonoNegocio && (
            <motion.a
              href={`https://wa.me/57${telefonoNegocio}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white px-4 py-2 rounded-full hover:bg-[#20bd5a] transition-all duration-300 shadow-md flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              aria-label="Contactar vía WhatsApp"
            >
              <BsWhatsapp className="text-2xl" />
              <span className="font-medium">Informes</span>
            </motion.a>
          )}
        </div>
      </motion.div>

      {/* Modal (mantenido, con ajustes menores para consistencia: padding, rounded) */}
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
                {/* Header del negocio (alineado con v2 header) */}
                <div className="flex items-center p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {negocioFotoPerfil && (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={negocioFotoPerfil}
                          alt={`Perfil de ${nombreNegocio}`}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <Link
                        href={`/perfil/${negocioSlug || ''}`}
                        className={`font-semibold text-red-800 hover:text-blue-600 transition-colors duration-200 cursor-pointer ${titleFont.className}`}
                      >
                        {nombreNegocio || "Negocio Desconocido"}
                      </Link>
                      <div className="flex items-center text-sm text-gray-500">
                        {/* Placeholder vacío */}
                      </div>
                    </div>
                  </div>
                  <FollowButton
                    followedId={servicio.negocioId}
                    version={2}
                    type="USER_TO_BUSINESS"
                    className="ml-auto text-sm"
                  />
                </div>

                {/* Título */}
                <h2 className="text-2xl font-semibold text-gray-900 leading-tight text-center">
                  {titulo}
                </h2>

                {/* Multimedia */}
                <div className="relative w-full">
                  <Swiper
                    spaceBetween={10}
                    slidesPerView={1}
                    navigation
                    pagination={{ clickable: true }}
                    modules={[Pagination, Navigation]}
                    className="mySwiper"
                  >
                    {orderedMultimedia.length > 0 ? (
                      orderedMultimedia.map((media, index) => (
                        <SwiperSlide key={index}>
                          <MediaSlide 
                            media={media} 
                            index={index} 
                            multimediaLength={orderedMultimedia.length} 
                          />
                        </SwiperSlide>
                      ))
                    ) : (
                      <SwiperSlide>
                        <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-200 rounded-xl">
                          <p className="text-gray-500">No hay multimedia disponible</p>
                        </div>
                      </SwiperSlide>
                    )}
                  </Swiper>
                </div>

                {/* Descripción completa (sin clamp, con padding) */}
                <div className="px-4 pt-2 pb-4 text-[18px] text-gray-800 leading-snug overflow-y-auto max-h-[30vh] md:max-h-none">
                  {descripcion.map((parrafo, index) => (
                    <p key={index} className="whitespace-pre-wrap break-words text-md mb-4">
                      {parrafo}
                    </p>
                  ))}
                </div>

                {/* Footer con Precio + WhatsApp */}
                <div className="px-4 py-4 flex items-center justify-between border-t border-gray-100">
                  {precio && (
                    <Precio value={precio}  />
                  )}
                  {telefonoNegocio && (
                    <Link
                      href={`https://wa.me/57${telefonoNegocio}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-white px-4 py-2 rounded-full hover:bg-[#20bd5a] transition-all duration-300 flex items-center gap-2 shadow-md"
                    >
                      <BsWhatsapp className="text-2xl" />
                      <span className="font-medium">Informes</span>
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
