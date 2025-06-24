"use client";

import React, { useEffect, useState } from "react";

import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import Link from "next/link";
import Image from "next/image";
import { FavoritesCard } from "./FavoritesCard";

export const FavoritesGrid = () => {
  const [isMounted, setIsMounted] = useState(false); // Flag para controlar el montaje
  const products = useFavoritesCatalogoStore((state) => state.favorites);
  const totalFavorites = useFavoritesCatalogoStore((state) => state.getTotalItems());

  useEffect(() => {
    setIsMounted(true); // Cambia a true después del montaje
  }, []);

  // Evita renderizar contenido hasta que el cliente esté montado
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {totalFavorites === 0 ? (
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-4">
            No tienes productos en tus favoritos
          </p>
          <Image
            src="/imgs/no_favorites.webp"
            alt="No hay favoritos"
            width={300}
            height={300}
            className="mx-auto mb-6"
          />
          <Link href="/productos">
            <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
              Explorar Productos
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4">
          {products.map((product) => (
            <FavoritesCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
};
