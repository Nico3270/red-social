"use client";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

import { AddressForm } from "@/address/componentes/AddressForm";
import Image from "next/image";
import { InfoEmpresa as empresa } from "@/config/config";
export default function AddressPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagen grande para pantallas grandes */}
        <div className="hidden lg:block">
          <Image
            src= {empresa.imagenesPlaceholder.domicilio}// Cambia esto por el path de la imagen generada
            alt="Entrega a domicilio"
            width={800}
            height={600}
            className="rounded-lg object-cover"
          />
        </div>

        {/* Formulario de dirección */}
        <AddressForm />
      </div>
    </div>
  );
}
