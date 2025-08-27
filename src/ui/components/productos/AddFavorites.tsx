"use client";

import { useEffect, useState } from "react";
import { FaHeart } from "react-icons/fa"; // Asumimos que usas este ícono para favoritos
import { FavoriteProduct } from "@/interfaces/product.interface";
import { motion, AnimatePresence } from "framer-motion"; // Opcional para toast
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";

interface AddFavoritesProps {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  images: string[];
  descripcionCorta: string; // Nueva
  sections: string[]; // Nueva
  slugNegocio: string; // Nueva
}

export const AddFavorites: React.FC<AddFavoritesProps> = ({
  id,
  title,
  price,
  description,
  slug,
  images,
  descripcionCorta,
  sections,
  slugNegocio,
}) => {
  const { favorites, addProductFavorites, removeProductFavorites } = useFavoritesCatalogoStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Verificar si ya está en favoritos
  useEffect(() => {
    const exists = favorites.some((item) => item.id === id);
    setIsFavorite(exists);
  }, [favorites, id]);

  const handleToggleFavorite = () => {
    const favoriteProduct: FavoriteProduct = {
      id,
      slug,
      nombre: title, // Mapeo de title a nombre
      precio: price, // Mapeo de price a precio
      descripcion: description, // Mapeo de description a descripcion
      descripcionCorta,
      images,
      sections,
      slugNegocio,
    };

    if (isFavorite) {
      removeProductFavorites(id);
      setShowToast(true); // Muestra toast de removido
    } else {
      addProductFavorites(favoriteProduct);
      setShowToast(true); // Muestra toast de agregado
    }
    setIsFavorite(!isFavorite);
    setTimeout(() => setShowToast(false), 2000); // Oculta toast después de 2s
  };

  return (
    <>
      <button
  onClick={handleToggleFavorite}
  className={`p-2 rounded-full transition-colors duration-300 ease-in-out shadow-sm z-20
    ${
      isFavorite
        ? "bg-red-100 text-red-500 hover:bg-red-200"
        : "bg-white text-gray-500 hover:bg-gray-100"
    }`}
>
  <FaHeart
    className={`text-xl ${
      isFavorite ? "text-red-500" : "text-gray-400"
    }`}
  />
</button>

      {/* Toast simple para feedback */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-sm"
          >
            {isFavorite ? "❤️ Agregado a favoritos" : "💔 Removido de favoritos"}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};