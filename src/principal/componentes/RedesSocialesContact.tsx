"use client";

import {  titleFont, titulosPrincipales } from "@/config/fonts";
import React from "react";
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import { InfoEmpresa as empresa } from "@/config/config";

const RedesSocialesContact: React.FC = () => {
  const direccion = empresa.direccion; // Cambia esto por tu dirección
  const googleMapsIframeSrc = empresa.iframeGoogleMaps;
    

  return (
    <section
      className="w-full h-full bg-gradient-to-b from-[#FBFBFB] to-[#FBFBFB] p-2 flex flex-col justify-between items-center text-center rounded-xl shadow-xl"
      aria-label="Contacto y Redes Sociales"
    >
      {/* Título */}
      <div className="text-center mb-4">
        <h2 className={`text-4xl font-extrabold color-titulos  ${titulosPrincipales.className}`}>
          Encuéntranos en
        </h2>
      </div>

      {/* Iconos de redes sociales */}
      <div className="flex justify-center gap-6 mb-2" aria-label="Síguenos en redes sociales">
        <a
          href={`https://wa.me/${empresa.telefono}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Contáctanos por WhatsApp"
          className="bg-[#25D366] text-white p-3 rounded-full hover:scale-110 transition-transform shadow-md"
        >
          <FaWhatsapp className="text-3xl" />
        </a>
        <a
          href={empresa.urlFacebook}
          target="_blank"
          rel="noopener noreferrer"
          title="Visita nuestra página de Facebook"
          className="bg-[#1877F2] text-white p-3 rounded-full hover:scale-110 transition-transform shadow-md"
        >
          <FaFacebookF className="text-3xl" />
        </a>
        <a
          href={empresa.urlInstagram}
          target="_blank"
          rel="noopener noreferrer"
          title="Síguenos en Instagram"
          className="bg-gradient-to-r from-[#E1306C] via-[#F77737] to-[#833AB4] text-white p-3 rounded-full hover:scale-110 transition-transform shadow-md"
        >
          <FaInstagram className="text-3xl" />
        </a>
        <a
          href={empresa.urlTiktok}
          target="_blank"
          rel="noopener noreferrer"
          title="Encuéntranos en TikTok"
          className="bg-[#000000] text-white p-3 rounded-full hover:scale-110 transition-transform shadow-md"
        >
          <FaTiktok className="text-3xl" />
        </a>
      </div>

      {/* Dirección y Google Maps */}
      <div className="flex flex-col items-center gap-1  w-full" aria-label="Nuestra ubicación">
        <p className={`text-xl text-[#2d3748] font-mbold ${titleFont.className} pb-2`}>{direccion}</p>
        {/* Mapa embebido */}
        <iframe
          src={googleMapsIframeSrc}
          className="w-full  rounded-lg border-0 shadow-lg"
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
    </section>
  );
};

export default RedesSocialesContact;
