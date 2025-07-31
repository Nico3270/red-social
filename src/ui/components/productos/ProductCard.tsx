"use client";

import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { descripcionCard, tituloCard } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";
import { AddFavorites } from "./AddFavorites";
import { Precio } from "./Precio";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { initialData, Section } from "@/seed/seed";

interface ProductCardProps {
  product: ProductRedSocial;
}

const urlWebProduccion = empresa.linkWebProduccion;

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [displayImage, setDisplayImage] = useState(product.imagenes[0]);

  // Crear el mensaje para WhatsApp con formato adecuado
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
    `*${product.nombre}*\n` +
    `Precio: $${product.precio.toFixed(2)}\n\n` +
    `Puedes ver más detalles aquí: ${urlWebProduccion}/producto/${product.slug}`
  );
  const productSections = product.sections
    .map((id) => initialData.secciones.find((s) => s.id === id))
    .filter((s): s is Section => !!s);
  const category = initialData.categorias.find((c) => c.id === product.categoriaId);
  const categorySlug = category?.slug || "categoria";
  const sectionSlug = productSections[0]?.slug || "sin-seccion";

  return (
    <div className="relative bg-white border-2 border-gray-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-2 flex flex-col h-[450px] w-full max-w-[380px] mx-auto overflow-hidden">
      {/* Botón de favoritos */}
      <div className="absolute top-3 right-3 z-20">
        <AddFavorites
          id={product.id}
          title={product.nombre}
          price={product.precio}
          description={product.descripcion}
          slug={product.slug}
          images={[product.imagenes[0]]}
        />
      </div>

      {/* Imagen con enlace */}
      <Link href={`/${categorySlug}/${sectionSlug}/${product.slug}`} className="block relative">
        <div className="relative h-64 w-full cursor-pointer rounded-lg overflow-hidden">
          <Image
            src={displayImage}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </Link>

      {/* Información del producto */}
      <div className="mt-2 flex flex-col flex-grow justify-between">
        <div>
          <Link href={`/${categorySlug}/${sectionSlug}/${product.slug}`} className="block">
            <h3
              className={`text-xl font-extrabold text-red-900 ${tituloCard.className} transition duration-300 hover:text-blue-700`}
              style={{ textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.1)" }}
            >
              {product.nombre}
            </h3>
          </Link>

          <p className={`text-lg text-gray-600 ${descripcionCard.className} mt-1 line-clamp-2`}>
            {product.descripcionCorta || "Sin descripción disponible"}
          </p>
        </div>

        {/* Precio, botones y nombre del negocio */}
        <div className="m-1">
          {/* Precio y botones de acciones */}
          <div className="flex justify-between items-center gap-2">
            <Precio value={product.precio} />

            {/* Botón de WhatsApp */}
            <Link
              href={`https://wa.me/57${product.telefonoContacto}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-full hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all duration-300"
            >
              <BsWhatsapp className="text-white text-xl" />
            </Link>
          </div>
          <div className="flex justify-center">
            {product.nombreNegocio && product.slugNegocio && (
              <Link
                href={`/perfil/${product.slugNegocio}`}
                className="mt-1 inline-block mx-auto text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 hover:bg-teal-100 hover:text-teal-900 hover:border-teal-300 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {product.nombreNegocio}
              </Link>
            )}

          </div>
          {/* Nombre del negocio con estilo moderno */}
        </div>
      </div>
    </div>
  );
};