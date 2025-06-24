"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaEdit } from "react-icons/fa";
import { InfoEmpresa as empresa } from "@/config/config";
// Interfaz para las tarjetas
export interface Tarjet {
  id: string;
  imagen: string;
  titulo: string;
  descripcion: string;
}

interface ListTarjetsProps {
  tarjetas: Tarjet[];
}

const ListTarjets: React.FC<ListTarjetsProps> = ({ tarjetas }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
        <thead className="bg-[#D91656] text-white">
          <tr>
            <th className="p-3 text-left">Imagen</th>
            <th className="p-3 text-left">Título</th>
            <th className="p-3 text-left">Descripción</th>
            <th className="p-3 text-center">Editar</th>
          </tr>
        </thead>
        <tbody>
          {tarjetas.map((tarjeta) => (
            <tr
              key={tarjeta.id}
              className="border-t hover:bg-gray-50 transition duration-150"
            >
              {/* Columna Imagen */}
              <td className="p-3">
                <div className="w-20 h-20 relative rounded-md overflow-hidden border border-gray-300">
                  <Image
                    src={tarjeta.imagen || empresa.imagenesPlaceholder.notfound}
                    alt={tarjeta.titulo}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
              </td>

              {/* Columna Titulo */}
              <td className="p-3">
                <Link
                  href={`/dashboard/quienesSomos/${tarjeta.id}`}
                  className="text-[#D91656] font-semibold hover:underline"
                >
                  {tarjeta.titulo}
                </Link>
              </td>

              {/* Columna Descripción */}
              <td className="p-3 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                {tarjeta.descripcion}
              </td>

              {/* Columna Editar */}
              <td className="p-3 text-center">
                <Link href={`/dashboard/quienesSomos/${tarjeta.id}`}>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full"
                    title="Editar Tarjeta"
                  >
                    <FaEdit />
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tarjetas.length === 0 && (
        <div className="text-center text-gray-500 py-6">
          No hay tarjetas disponibles.
        </div>
      )}
    </div>
  );
};

export default ListTarjets;
