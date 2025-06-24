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
      className={`p-2 rounded-full hover:bg-red-200 transition duration-300 ease-in-out z-20 ${
        isFavorite ? "bg-red-400" : "bg-gray-100"
      }`}
    >
      {isFavorite ? (
        <AiFillHeart className="text-red-600 text-2xl transition duration-300 ease-in-out transform scale-110" />
      ) : (
        <AiOutlineHeart className="text-red-500 text-2xl transition duration-300 ease-in-out" />
      )}
    </button>
  );
};
