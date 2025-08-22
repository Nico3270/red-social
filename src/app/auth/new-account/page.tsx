"use client";

import { useState } from "react";
import { RegisterForm } from "./ui/NewAcoount";
import { motion } from "framer-motion"; // Para animaciones premium
import Image from "next/image";
import { FaUser, FaStore, FaGlobe, FaStar, FaRocket } from "react-icons/fa";

export default function NewAccountPage() {
  const [tipoUsuario, setTipoUsuario] = useState<null | boolean>(null);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Formulario izquierda */}
      {tipoUsuario !== null ? (
        <RegisterForm negocio={tipoUsuario} />
      ) : (
        <div className="md:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-2xl font-bold mb-6 text-center"
          >
            ¿Qué tipo de cuenta deseas crear?
          </motion.h2>
          <button
            onClick={() => setTipoUsuario(false)}
            className="mb-4 w-full max-w-xs py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Cuenta personal
          </button>
          <button
            onClick={() => setTipoUsuario(true)}
            className="w-full max-w-xs py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Cuenta de negocio
          </button>
        </div>
      )}

      {/* Sección derecha: Bienvenida premium */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5 }}
        className="md:w-1/2 hidden md:flex flex-col items-center justify-center bg-white p-8 space-y-8"
      >
        {tipoUsuario === null ? (
          <>
            <h1 className="text-3xl font-light text-center text-gray-800">
              Bienvenido a [Nombre Plataforma]
            </h1>
            <p className="text-lg text-gray-600 text-center max-w-md">
              Fusionamos red social y comercio para conectar personas, negocios y profesionales de forma sencilla y elegante.
            </p>
            <div className="grid grid-cols-2 gap-6 max-w-4xl">
              {/* Card Personal */}
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                className="bg-gray-50 rounded-xl p-6 shadow-sm"
              >
                <FaUser className="text-blue-500 text-4xl mb-4 mx-auto" />
                <h2 className="text-xl font-semibold text-center mb-2">Cuenta Personal</h2>
                <p className="text-sm text-gray-600 text-center">
                  Explora catálogos, sigue negocios, deja reseñas multimedia y conecta con comunidades locales.
                </p>
                <div className="relative w-full h-40 mt-4">
                  <Image src="/images/personal-mockup.png" alt="Perfil Personal" fill className="object-contain" />
                </div>
              </motion.div>

              {/* Card Negocio */}
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                className="bg-gray-50 rounded-xl p-6 shadow-sm"
              >
                <FaStore className="text-green-500 text-4xl mb-4 mx-auto" />
                <h2 className="text-xl font-semibold text-center mb-2">Cuenta de Negocio</h2>
                <p className="text-sm text-gray-600 text-center">
                  Crea tiendas en minutos, publica contenido, gestiona catálogos y monetiza con reseñas y ads.
                </p>
                <div className="relative w-full h-40 mt-4">
                  <Image src="/images/negocio-mockup.png" alt="Perfil Negocio" fill className="object-contain" />
                </div>
              </motion.div>
            </div>
            <div className="flex justify-around mt-6 max-w-md">
              <div className="text-center">
                <FaGlobe className="text-2xl text-gray-700 mx-auto" />
                <p className="text-xs">Conecta localmente</p>
              </div>
              <div className="text-center">
                <FaStar className="text-2xl text-gray-700 mx-auto" />
                <p className="text-xs">Reseñas reales</p>
              </div>
              <div className="text-center">
                <FaRocket className="text-2xl text-gray-700 mx-auto" />
                <p className="text-xs">Crece tu negocio</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-light text-center text-gray-800">
              Crea tu Cuenta {tipoUsuario ? "de Negocio" : "Personal"}
            </h1>
            <p className="text-lg text-gray-600 text-center max-w-md">
              {tipoUsuario 
                ? "Empieza a vender, publica promociones y construye tu comunidad con herramientas premium." 
                : "Descubre ofertas, interactúa y agenda servicios en una plataforma intuitiva."}
            </p>
            <div className="relative w-64 h-64 mt-4">
              <Image 
                src={tipoUsuario ? "/images/negocio-welcome.png" : "/images/personal-welcome.png"} 
                alt="Bienvenida" 
                fill 
                className="object-contain" 
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}