"use client";

import { BsWhatsapp } from "react-icons/bs";
import { SiGooglemaps } from "react-icons/si"; // Para Maps
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { descripcionCard, titulo1, tituloCard } from "@/config/fonts";
import { BusinessCardData } from "../feed.interfaces";
import { FollowButton } from "./FollowButton";
import { motion } from "framer-motion";

interface BusinessCardProps {
  business: BusinessCardData;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => {
  const [displayImage, setDisplayImage] = useState(business.imagenPortada || business.imagenPerfil || "/placeholder-business.jpg");

  // Mensaje para WhatsApp (similar a ProductCard, pero para negocio)
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en tu negocio: *${business.nombre}*. ¿Podemos charlar?\n\nVer perfil: /perfil/${business.slug}`
  );

  return (
    <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.3 }}
    className="relative bg-white border-2 border-gray-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col h-[480px] w-full max-w-[380px] mx-auto overflow-hidden p-2"
  >
      
      {/* Header con nombre del negocio */}
      <div className="flex items-center justify-around px-3 mb-3">
        <Link
          href={`/perfil/${business.slug}`}
          className={`font-semibold text-gray-800 hover:text-blue-700 text-md transition-colors duration-200 ${titulo1.className}`}
        >
          {business.nombre}
        </Link>
        <FollowButton followedId={ business.negocioId || ""} type="USER_TO_BUSINESS" className="mt-2" />
      </div>

      {/* Imagen con enlace (hover para zoom, similar a ProductCard) */}
      <Link href={`/perfil/${business.slug}`} className="block relative">
        <div 
          className="relative h-64 w-full cursor-pointer rounded-lg overflow-hidden"
          onMouseEnter={() => setDisplayImage(business.imagenPerfil || displayImage)} // Switch a perfil en hover si disponible
          onMouseLeave={() => setDisplayImage(business.imagenPortada || business.imagenPerfil || "/placeholder-business.jpg")}
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

      {/* Información del negocio */}
      <div className="mt-2 flex flex-col flex-grow justify-between">
        <div>
          <Link href={`/perfil/${business.slug}`} className="block">
            <h3
              className={`text-lg font-extrabold text-gray-800 ${tituloCard.className} transition duration-300 hover:text-blue-700`}
              style={{ textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.1)" }}
            >
              {business.nombre}
            </h3>
          </Link>

          <p className={`text-lg text-gray-600 ${descripcionCard.className} mt-1 line-clamp-2`}>
            {business.descripcion || "Explora este negocio en tu área."}
          </p>

          {/* Badges para categorías y secciones (chips elegantes) */}
          <div className="mt-2 flex flex-wrap gap-2">
            {business.categorias.slice(0, 3).map((cat, idx) => ( // Limitar a 3 para elegancia
              <span key={idx} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full hover:bg-blue-200 transition">
                {cat}
              </span>
            ))}
            {business.secciones.slice(0, 3).map((sec, idx) => (
              <span key={idx} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full hover:bg-green-200 transition">
                {sec}
              </span>
            ))}
          </div>
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
              {business.urlGoogleMaps && (
                <Link
                  href={business.urlGoogleMaps}
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
  );
};