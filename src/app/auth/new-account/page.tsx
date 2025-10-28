"use client";

import { useState } from "react";
import { RegisterForm } from "./ui/NewAcoount";
import { motion } from "framer-motion"; // Para animaciones premium
import Image from "next/image";
import { FaUser, FaStore, } from "react-icons/fa";

export default function NewAccountPage() {
  const [tipoUsuario, setTipoUsuario] = useState<null | boolean>(null);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Sección izquierda: Selector inicial o Formulario */}
      {tipoUsuario !== null ? (
        <RegisterForm negocio={tipoUsuario} />
      ) : (
        <div className="md:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 bg-white">

          <div className="relative w-full sm:w-2/3 h-60 sm:h-2/3 mt-2 sm:mt-4 rounded-2xl overflow-hidden">
            <Image
              src="/imgs/cuenta-negocio.png"
              alt="Perfil Negocio"
              fill
              className="object-cover"
            />
          </div>

          {/* Botones opcionales solo en móviles pequeños, pero los quito para priorizar tarjetas y evitar duplicados */}
        </div>
      )}

      {/* Sección derecha: Bienvenida premium - Ahora visible en todas las pantallas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white p-4 sm:p-8 space-y-6 md:space-y-8"
      >
        {tipoUsuario === null ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800">
              Bienvenido
            </h1>
            <p className="text-base sm:text-lg text-gray-600 text-center max-w-md">
              Fusionamos red social y comercio para conectar personas, negocios y profesionales de forma sencilla y elegante.
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold mb-6 text-center text-gray-800"
            >
              ¿Qué tipo de cuenta deseas crear?
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl">
              {/* Card Personal - Clicable y responsive */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                onClick={() => setTipoUsuario(false)}
              >
                <FaUser className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4 mx-auto" />
                <h2 className="text-lg sm:text-xl font-semibold text-center text-red-700 mb-2">Cuenta de Usuario</h2>
                <p className="text-xs sm:text-sm text-gray-900 text-center">
                  Explora catálogos, sigue negocios, deja reseñas multimedia y conecta con comunidades locales.
                </p>
                <div className="relative w-full h-64 sm:h-80 mt-2 sm:mt-4 rounded-2xl overflow-hidden">
                  <Image src="/imgs/perfil-usuario.png" alt="Perfil Personal" fill className="object-contain"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px" />
                </div>
              </motion.div>

              {/* Card Negocio - Clicable y responsive */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                onClick={() => setTipoUsuario(true)}
              >
                <FaStore className="text-blue-600 text-3xl sm:text-4xl mb-3 sm:mb-4 mx-auto" />
                <h2 className="text-lg sm:text-xl font-semibold text-center text-red-700 mb-2">Cuenta de Negocio</h2>
                <p className="text-xs sm:text-sm text-gray-900 text-center">
                  Crea tiendas en minutos, publica contenido, gestiona catálogos y monetiza con reseñas y ads.
                </p>
                <div className="relative w-full h-64 sm:h-80 mt-2 sm:mt-4 rounded-2xl overflow-hidden">
                  <Image
  src="/imgs/perfil-negocio2.png"
  alt="Perfil Negocio"
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
/>
                </div>
              </motion.div>
            </div>

          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800">
              Crea tu Cuenta {tipoUsuario ? "de Negocio" : "Personal"}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 text-center max-w-md">
              {tipoUsuario
                ? "Empieza a vender, publica promociones y construye tu comunidad con herramientas premium."
                : "Descubre ofertas, interactúa y agenda servicios en una plataforma intuitiva."}
            </p>

            <div className="relative w-full sm:w-3/4 h-72 sm:h-96 mt-4 rounded-2xl overflow-hidden justify-start">
              <Image
  src="/imgs/cuenta-negocio.png"
  alt="Perfil Negocio"
  fill
  className="object-contain"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
/>
            </div>


          </>
        )}
      </motion.div>
    </div>
  );
}