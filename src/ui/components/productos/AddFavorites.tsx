"use client";

import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";
import React from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";

interface Props {
  id: string;
  slug: string;
  title: string;
  price: number;
  description: string;
  images: string[];
}

export const AddFavorites = (product: Props) => {
  const favorites = useFavoritesCatalogoStore((state) => state.favorites);
  const addProductFavorites = useFavoritesCatalogoStore((state) => state.addProductFavorites);
  const removeProductFavorites = useFavoritesCatalogoStore((state) => state.removeProductFavorites);

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  const toggleFavorite = () => {
    if (isFavorite) {
      removeProductFavorites(product.id);
    } else {
      addProductFavorites(product);
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      className={`p-2 rounded-full shadow-md transition duration-300 ease-in-out relative group
        ${isFavorite 
          ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" 
          : "bg-white hover:bg-gray-100 border border-gray-200"
        }`}
    >
      {isFavorite ? (
        <AiFillHeart className="text-white text-xl transition-transform duration-300 ease-in-out transform group-hover:scale-125 group-hover:rotate-6 drop-shadow" />
      ) : (
        <AiOutlineHeart className="text-red-500 text-xl transition-transform duration-300 ease-in-out transform group-hover:scale-110" />
      )}

      {/* Glow cuando está en favoritos */}
      {isFavorite && (
        <span className="absolute inset-0 rounded-full bg-red-400 opacity-40 blur-xl animate-pulse"></span>
      )}
    </button>
  );
};
