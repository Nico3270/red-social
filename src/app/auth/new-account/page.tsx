"use client";

import { useState } from "react";
import { RegisterForm } from "./ui/NewAcoount";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaUser, FaStore } from "react-icons/fa";
import { HelpTriggerModal } from "@/ui/components/helpModal/HelpTriggerModal";



export default function NewAccountPage() {
  const [tipoUsuario, setTipoUsuario] = useState<null | boolean>(null);
 

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 relative">
        {/* Sección izquierda: Selector o Formulario */}
        {tipoUsuario !== null ? (
          <RegisterForm negocio={tipoUsuario} />
        ) : (
          <div className="md:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 bg-white">
            <div className="relative w-full sm:w-2/3 h-60 sm:h-2/3 mt-2 sm:mt-4 rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/imgs/cuenta-negocio.png"
                alt="Bienvenido a Myckeo"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Sección derecha: Bienvenida */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full md:w-1/2 flex flex-col items-center bg-white p-6 sm:p-8 space-y-6 md:space-y-8"
        >
          {tipoUsuario === null ? (
            <>
              <div className="text-center space-y-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                  Bienvenido a Myckeo
                </h1>
                <p className="text-lg text-gray-600 max-w-lg">
                  Fusionamos red social y comercio para conectar personas, negocios y profesionales de forma sencilla y elegante.
                </p>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-bold text-center text-gray-800"
              >
                ¿Qué tipo de cuenta deseas crear?
              </motion.h2>
              {/* Video de ayuda premium */}
              <HelpTriggerModal
                text="Mira este video de ayuda y crea tu negocio"
                title="Cómo crear tu cuenta de negocio en Myckeo"
                youtubeUrl="https://www.youtube.com/embed/uyb_H_Y9eCw"
                variant="dangerSolid"
                size="lg"
                icon="play"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl px-4">
                {/* Cuenta Personal */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-white to-red-50 rounded-3xl p-6 sm:p-8 border-2 border-red-200 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setTipoUsuario(false)}
                >
                  <FaUser className="text-red-600 text-5xl mb-4 mx-auto group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold text-center text-red-700 mb-3">Cuenta Personal</h3>
                  <p className="text-gray-700 text-center leading-relaxed">
                    Explora catálogos, sigue negocios favoritos, deja reseñas con fotos y videos, y conecta con tu comunidad local.
                  </p>
                  <div className="mt-6 relative h-64 rounded-2xl overflow-hidden border-4 border-red-100">
                    <Image
                      src="/imgs/perfil-usuario.png"
                      alt="Cuenta Personal"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </motion.div>

                {/* Cuenta Negocio */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-6 sm:p-8 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => setTipoUsuario(true)}
                >
                  <FaStore className="text-blue-600 text-5xl mb-4 mx-auto group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold text-center text-blue-700 mb-3">Cuenta de Negocio</h3>
                  <p className="text-gray-700 text-center leading-relaxed">
                    Crea tu tienda en minutos, publica promociones, gestiona productos y recibe reseñas reales de clientes.
                  </p>
                  <div className="mt-6 relative h-64 rounded-2xl overflow-hidden border-4 border-blue-100">
                    <Image
                      src="/imgs/perfil-negocio2.png"
                      alt="Cuenta de Negocio"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </motion.div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-4 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                  Crea tu Cuenta {tipoUsuario ? "de Negocio" : "Personal"}
                </h1>
                <p className="text-lg text-gray-600">
                  {tipoUsuario
                    ? "Crea tu vitrina digital, publica contenido y empieza a vender en minutos."
                    : "Únete a la comunidad, descubre negocios locales y comparte tus experiencias."}
                </p>
              </div>

              <div className="relative w-full max-w-2xl h-80 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
                <Image
                  src={tipoUsuario ? "/imgs/cuenta-negocio.png" : "/imgs/perfil-usuario.png"}
                  alt="Vista previa"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </>
          )}
        </motion.div>


      </div>
    </>
  );
}