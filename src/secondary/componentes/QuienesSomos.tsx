"use client";

import { InfoEmpresa } from "@/config/config";
import {  tituloCard, titulosCarrusel, titulosPrincipales } from "@/config/fonts";
import Image from "next/image";
import React from "react";

// Interfaz actualizada para la tarjeta
export interface Tarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;  // Nueva propiedad para la URL de la imagen
}

interface Props {
  tarjetas: Tarjeta[];
}

const QuienesSomos: React.FC<Props> = ({ tarjetas }) => {
  return (
    <section className="w-full bg-white py-6 px-6">
      {/* Encabezado */}
      <div className="text-center mb-8">
        <h2 className={`text-2xl font-extrabold color-titulos ${titulosPrincipales.className}`}>
          {`Conoce mas de ${InfoEmpresa.nombreCompleto}`}
        </h2>
      </div>

      {/* Carrusel de Tarjetas */}
      <div className="flex overflow-x-auto gap-6 px-4">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.id}
            className="flex flex-col items-center text-center bg-white shadow-md rounded-xl p-4 hover:shadow-lg transition-shadow min-w-[300px] md:min-w-[300px] h-[450px] mb-24 sm:mb-0"
          >
            {/* Imagen */}
            <div className="relative w-40 h-40 mb-4">
              <Image
                src={tarjeta.imagen}
                alt={tarjeta.titulo}
                layout="fill"
                className="object-cover rounded-full"
              />
            </div>

            {/* Título */}
            <h3
              className={`text-lg font-extrabold color-titulo-tarjeta ${tituloCard.className} transition duration-300`}
              style={{
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2)", // Sombra sutil
              }}
            >
              {tarjeta.titulo}
            </h3>

            {/* Descripción */}
            <p className={`text-sm font-bold color-descripcion-tarjeta mt-2 ${titulosCarrusel.className}`}>
              {tarjeta.descripcion}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default QuienesSomos;
