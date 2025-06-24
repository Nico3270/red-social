"use client";

import { FaShoppingCart } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { FavoriteProduct } from "@/interfaces/product.interface";
import { useState } from "react";
import { AddFavorites } from "@/seccion/componentes/AddFavorites";
import { Precio } from "@/seccion/componentes/Precio";

interface FavoritesCardProps {
  product: FavoriteProduct;
}

export const FavoritesCard: React.FC<FavoritesCardProps> = ({ product }) => {
  const [displayImage, setDisplayImage] = useState(
    product.images && product.images.length > 0
      ? product.images[0]
      : "/imgs/no-image.webp" // Imagen por defecto
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 relative">
      <Link href={`/producto/${product.slug}`}>
        {/* Imagen del producto */}
        <div className="relative h-56 w-full">
          <Image
            src={displayImage}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="rounded-lg object-cover"
            onMouseEnter={() => setDisplayImage(product.images[1] || product.images[0])}
            onMouseLeave={() => setDisplayImage(product.images[0])}
          />
        </div>
      </Link>

      {/* Botón de favoritos en la esquina superior derecha */}
      <div className="absolute top-2 right-2 z-10">
        <AddFavorites
          id={product.id}
          title={product.title}
          price={product.price}
          description={product.description}
          slug={product.slug}
          images={product.images}
        />
      </div>

      {/* Información del producto */}
      <div className="mt-4">
        <h3 className="text-lg font-bold">{product.title}</h3>
        <p className="text-sm text-gray-600">
          {product.description?.length > 80
            ? `${product.description.substring(0, 80)}...`
            : product.description || "Sin descripción disponible"}
          {product.description?.length > 80 && (
            <Link
              href={`/producto/${product.slug}`}
              className="text-red-500 hover:underline ml-1"
            >
              Ver más
            </Link>
          )}
        </p>
      </div>

      {/* Precio y botón de agregar al carrito */}
      <div className="mt-4 flex justify-between items-center">
        <Precio value={product.price} />
        <Link href={`/producto/${product.slug}`}>
          <button className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center">
            <FaShoppingCart className="mr-2" />
            Agregar
          </button>
        </Link>
      </div>
    </div>
  );
};
