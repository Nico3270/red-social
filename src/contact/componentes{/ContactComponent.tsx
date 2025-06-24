import { SeccionesFont,  titleFont, titulosPrincipales } from '@/config/fonts';
import { InfoEmpresa as empresa } from '@/config/config';
import React from 'react';
import {
  FaClock,
  FaPhone,
  FaMapMarkerAlt,
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaTiktok,
} from 'react-icons/fa';
import Link from 'next/link';

const ContactComponent = () => {
  return (
    <div className="w-full h-auto flex flex-col relative">
      {/* Imagen de fondo */}
      <div
        className="w-full h-[60vh] bg-cover bg-center relative"
        style={{ backgroundImage: "url('/imgs/tienda_contacto.webp')" }}
      >
        {/* Título de la tienda */}
        {/* <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-white text-4xl md:text-6xl font-bold bg-black bg-opacity-50 px-6 py-3 rounded-lg">
            Detalles, Sorpresas y Regalos
          </h1>
        </div> */}
      </div>

      {/* Contenedor blanco con título principal y tarjetas */}
      <div className="w-full bg-white flex flex-col py-8 px-4 md:px-16 relative z-20 -mt-16">
        {/* Título principal */}
        <div className="mb-8 text-center">
          <h2 className={`text-3xl md:text-4xl font-bold color-titulos  ${titulosPrincipales.className} `}>
            {`¡Somos ${empresa.nombreCompleto}`}
          </h2>
        </div>

        {/* Contenedor de las tarjetas */}
        <div className="flex flex-col md:flex-row justify-center items-start gap-8">
          {/* Card Izquierda */}
          <div className="bg-gray-100 shadow-lg rounded-lg p-8 w-full md:w-3/5 flex flex-col justify-between">
            {/* Horarios y Contacto en una fila */}
            <div className="flex flex-col md:flex-row justify-between mb-6">
              {/* Horarios de apertura */}
              <div className="mb-6 md:mb-0 md:w-1/2">
                <h3 className={`text-xl font-semibold color-secundario mb-4 text-center md:text-center ${SeccionesFont.className}`}>
                  Horarios de apertura
                </h3>
                <div className="flex items-start gap-4">
                  <FaClock className=" text-5xl color-principal" />
                  <div className="flex flex-col">
                    <p>Lunes a viernes: {empresa.horarios.lunes_viernes}</p>
                    <p>Sábados: {empresa.horarios.sabados}</p>
                    <p>Domingos: {empresa.horarios.domingos}</p>
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="md:w-1/2">
                <h3 className={`text-xl font-semibold mb-4 color-secundario text-center md:text-center ${SeccionesFont.className}`}>
                  Contacto
                </h3>
                <div className="flex items-start gap-4">
                  <FaPhone className=" text-5xl  color-principal" />
                  <div className="flex flex-col">
                    <p>Teléfono: 3182293083</p>
                    <p>Correo: detalles@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección y mapa */}
            <div>
              <h3 className={`text-xl font-semibold text-center flex items-center justify-center mb-4 color-titulo-tarjeta ${SeccionesFont.className}`}>
                <FaMapMarkerAlt className={`text-2xl mr-2  color-principal`} /> Dirección de la tienda
              </h3>
              <p className={`text-center font-bold ${titleFont.className}`}>{empresa.direccion}</p>
              <div className="mt-4">
                {/* Google Maps Embed */}
                <iframe
                  src= {empresa.iframeGoogleMaps}
                  className="w-full h-40 rounded-lg border-0"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Card Derecha (Redes Sociales) */}
          <div className="bg-gray-100 shadow-lg rounded-lg p-8 w-full md:w-2/5 flex flex-col items-center">
            <h2 className={`text-xl font-bold mb-4 color-titulo-tarjeta ${SeccionesFont.className}`}>Síguenos en redes</h2>
            <p className="text-center mb-6">
              Conéctate con nosotros en nuestras redes sociales para conocer más sobre nuestras
              promociones.
            </p>
            {/* Grid de redes sociales */}
            <div className="grid grid-cols-2 gap-4 w-full h-60">
              {/* WhatsApp */}

              <div className="bg-green-500 flex justify-center items-center rounded-lg hover:scale-105 transition-transform cursor-pointer">
                <Link href={`https://wa.me/${empresa.telefono}`}>
                  <FaWhatsapp className="text-white text-4xl" />
                </Link>
              </div>
              {/* Instagram */}
              <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 flex justify-center items-center rounded-lg hover:scale-105 transition-transform cursor-pointer">
                <Link href={empresa.urlInstagram}>
                  <FaInstagram className="text-white text-4xl" />
                </Link>
              </div>
              {/* Facebook */}
              <div className="bg-blue-600 flex justify-center items-center rounded-lg hover:scale-105 transition-transform cursor-pointer">
                <Link href={empresa.urlFacebook}>
                  <FaFacebook className="text-white text-4xl" />
                </Link>
              </div>
              {/* TikTok */}
              <div className="bg-black flex justify-center items-center rounded-lg hover:scale-105 transition-transform cursor-pointer">
                <Link href={empresa.urlTiktok}>
                  <FaTiktok className="text-white text-4xl" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactComponent;
