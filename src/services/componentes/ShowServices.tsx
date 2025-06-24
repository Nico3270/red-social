// src/components/ServicesList.tsx
"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import { getServices } from "../actions/service_actions";
import { Service } from "@/interfaces/product.interface";
import { SeccionesFont, titleFont, titulosPrincipales } from "@/config/fonts";

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      const servicios = await getServices();
      setServices(servicios);
    };
    fetchServices();
  }, []);

  return (
    <section className="container mx-auto p-6">
      <h1 className={`text-3xl font-bold text-center mb-10 ${titulosPrincipales.className} color-titulos `}>Nuestros Servicios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <Image
              src={service.imagen}
              alt={service.titulo}
              width={400}
              height={300}
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h2 className={`text-2xl font-semibold ${SeccionesFont.className} color-titulo-tarjeta`}>{service.titulo}</h2>
              <p className={`text-gray-600 mt-2 ${titleFont.className} color-descripcion-tarjeta`}>{service.descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
