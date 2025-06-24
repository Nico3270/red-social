"use client";

import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/interfaces/product.interface";
import { useState } from "react";
import { Precio } from "./Precio";
import { AddFavorites } from "./AddFavorites";
import { descripcionCard, tituloCard } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";

interface ProductCardProps {
  product: Product;
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

  return (
    <div className="relative bg-white border border-gray-300 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 overflow-hidden">
      
      {/* Botón de favoritos */}
      <div className="absolute top-2 right-2 z-20">
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
      <Link href={`/producto/${product.slug}`} className="block">
        <div className="relative h-56 w-full cursor-pointer rounded-xl overflow-hidden">
          <Image
            src={displayImage}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
            onMouseEnter={() => setDisplayImage(product.imagenes[0])}
            onMouseLeave={() => setDisplayImage(product.imagenes[1] || product.imagenes[0])}
          />
        </div>
      </Link>

      {/* Información del producto */}
      <div className="mt-4">
        <Link href={`/producto/${product.slug}`} className="block">
          <h3
            className={`text-lg font-extrabold color-titulo-tarjeta ${tituloCard.className} transition duration-300 cursor-pointer`}
            style={{ textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2)" }}
          >
            {product.nombre}
          </h3>
        </Link>

        <p className={`text-lg color-descripcion-tarjeta ${descripcionCard.className}`}>
          {product.descripcionCorta && product.descripcionCorta.length > 80
            ? `${product.descripcionCorta.substring(0, 80)}...`
            : product.descripcionCorta || "Sin descripción disponible"}{" "}
          {product.descripcionCorta && product.descripcionCorta.length > 80 && (
            <Link href={`/producto/${product.slug}`} className="text-red-500 hover:underline ml-1">
              Ver más
            </Link>
          )}
        </p>
      </div>

      {/* Precio y botones de acciones */}
      <div className="mt-4 flex justify-between items-center gap-2">
        <Precio value={product.precio} />

        {/* Botón de agregar al carrito */}
        <Link href={`/producto/${product.slug}`}>
          <button className="color-boton-agregar texto-boton px-4 py-2 rounded-full flex items-center">
            <FaShoppingCart className="mr-2" />
            Agregar
          </button>
        </Link>

        {/* Botón de WhatsApp */}
        <a
          href={`https://wa.me/57${empresa.telefono}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 p-2 rounded-full hover:bg-green-600 flex items-center justify-center"
        >
          <BsWhatsapp className="text-white text-xl" />
        </a>
      </div>
    </div>
  );
};
