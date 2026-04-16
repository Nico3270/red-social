"use client";

import { BsWhatsapp } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si"; // Para Maps
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { textosFont, titleFont } from "@/config/fonts";
import { BusinessCardData } from "../feed.interfaces";
import { FollowButton } from "./FollowButton";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

interface BusinessCardProps {
  business: BusinessCardData;
}

const isValidUrl = (url?: string) => {
  if (!url || url.trim() === "") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => {
  const DEFAULT_IMAGE = "/imgs/negocio_vacio (1).png";
  const DEFAULT_HOVER_IMAGE = "/imgs/placeholder-negocio-2.png";

  // Normalizar imágenes para evitar strings vacíos
  const hasPortada =
    typeof business.imagenPortada === "string" &&
    business.imagenPortada.trim() !== "";

  const hasPerfil =
    typeof business.imagenPerfil === "string" &&
    business.imagenPerfil.trim() !== "";

  const portadaImage = hasPortada ? business.imagenPortada! : DEFAULT_IMAGE;
  const perfilHoverImage = hasPerfil ? business.imagenPerfil! : DEFAULT_HOVER_IMAGE;

  const [displayImage, setDisplayImage] = useState<string>(portadaImage);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mensaje para WhatsApp (similar a ProductCard, pero para negocio)
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en tu negocio: *${business.nombre}*. ¿Podemos charlar?\n\nVer perfil: /perfil/${business.slug}`
  );

  // Capitalizar la primera categoría si existe
  const primeraCategoria = business.categorias[0]
    ? business.categorias[0].charAt(0).toUpperCase() +
      business.categorias[0].slice(1)
    : "Categoría no disponible";

  // Determinar si mostrar "Ver más" basado en longitud de descripción
  const isLongDescription = (business.descripcion?.length || 0) > 100; // Umbral aproximado para truncado

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white border-2 border-gray-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col h-[480px] w-full max-w-[380px] mx-auto overflow-hidden p-2"
      >
        {/* Header con nombre del negocio y categoría al lado */}
        <div className="flex items-center justify-between px-3 mb-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/perfil/${business.slug}`}
              className={`font-semibold text-red-800 hover:text-blue-700 text-md transition-colors duration-200 ${titleFont.className}`}
            >
              {business.nombre}
            </Link>
            <span className="bg-blue-100 text-blue-800 text-xs ml-4 font-medium px-2.5 py-0.5 rounded-full hover:bg-blue-200 transition">
              {primeraCategoria}
            </span>
          </div>
          <FollowButton
            version={2}
            followedId={business.negocioId || ""}
            type="USER_TO_BUSINESS"
            className="mt-2"
          />
        </div>

        {/* Imagen con enlace (hover para zoom, similar a ProductCard) */}
        <Link href={`/perfil/${business.slug}`} className="block relative">
          <div
            className="relative h-64 w-full cursor-pointer rounded-lg overflow-hidden"
            onMouseEnter={() => setDisplayImage(perfilHoverImage)} // switch a perfil o a crear-negocio2
            onMouseLeave={() => setDisplayImage(portadaImage)} // vuelve a portada o crear-negocio
          >
            <Image
              src={displayImage}
              alt={`Portada de ${business.nombre}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        </Link>

        {/* Información del negocio (descripción truncada con botón "Ver más") */}
        <div className="mt-2 flex flex-col flex-grow justify-between">
          <div>
            <p
              className={`text-lg text-gray-600 ${textosFont.className} mt-1 line-clamp-2`}
            >
              {business.descripcion || "Explora este negocio en tu área."}
            </p>
            {isLongDescription && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none"
              >
                Ver más
              </button>
            )}
          </div>

          {/* Footer con botones de contacto */}
          <div className="m-1">
            <div className="flex justify-around items-center gap-2">
              <p className="text-sm text-gray-500">
                {business.ciudad}, {business.departamento}
              </p>

              <div className="flex gap-4">
                {/* Botón de WhatsApp (si disponible) */}
                {business.telefonoContacto && (
                  <Link
                    href={`https://wa.me/57${business.telefonoContacto}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-full hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all duration-300"
                  >
                    <BsWhatsapp className="text-white text-xl" />
                  </Link>
                )}

                {/* Botón de Google Maps (si disponible) */}
                {business.urlGoogleMaps?.trim() !== "" && (
                  <Link
                    href={business.urlGoogleMaps || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-rose-500 to-rose-600 p-2 rounded-full hover:from-rose-600 hover:to-rose-700 flex items-center justify-center transition-all duration-300"
                  >
                    <SiGooglemaps className="text-white text-xl" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal con AnimatePresence */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-3xl h-auto max-h-[90vh] overflow-y-auto relative grid grid-cols-1 md:grid-cols-2 gap-6"
              style={{ WebkitOverflowScrolling: "touch" }} // Scroll suave en iOS
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-20 flex items-center justify-center  ml-2
             w-10 h-10 rounded-full bg-white shadow-lg 
             hover:shadow-xl hover:bg-gray-100 
             transition-all duration-300 ease-in-out 
             text-gray-600 hover:text-gray-900"
                aria-label="Cerrar modal"
              >
                <FaTimes size={20} />
              </button>

              {/* Imágenes (izquierda en desktop, arriba en mobile) */}
              <div className="relative w-full h-[300px] md:h-full rounded-2xl overflow-hidden">
                <Image
                  src={portadaImage}
                  alt={`Portada de ${business.nombre}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>

              {/* Contenido (derecha en desktop, abajo en mobile) */}
              <div className="flex flex-col space-y-4">
                {/* Header */}
                <div className="flex items-center justify-around pr-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/perfil/${business.slug}`}
                      className={`text-xl font-semibold text-gray-900 hover:text-blue-700 ${titleFont.className}`}
                    >
                      {business.nombre}
                    </Link>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {primeraCategoria}
                    </span>
                  </div>
                  <FollowButton
                    version={2}
                    followedId={business.negocioId || ""}
                    type="USER_TO_BUSINESS"
                  />
                </div>

                {/* Descripción completa */}
                <p
                  className={`text-gray-600 text-base leading-relaxed ${textosFont.className}`}
                >
                  {business.descripcion || "Explora este negocio en tu área."}
                </p>

                {/* Footer con ciudad y botones */}
                <div className="flex flex-col gap-4 mt-auto">
                  <p className="text-sm text-gray-500">
                    {business.ciudad}, {business.departamento}
                  </p>
                  <div className="flex gap-4 justify-center md:justify-start">
                    {business.telefonoContacto && (
                      <Link
                        href={`https://wa.me/57${business.telefonoContacto}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-full hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all duration-300"
                      >
                        <BsWhatsapp className="text-white text-2xl" />
                      </Link>
                    )}
                    {isValidUrl(business.urlGoogleMaps) && (
                      <Link
                        href={business.urlGoogleMaps || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-rose-500 to-rose-600 p-2 rounded-full hover:from-rose-600 hover:to-rose-700 flex items-center justify-center transition-all duration-300"
                      >
                        <SiGooglemaps className="text-white text-xl" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
