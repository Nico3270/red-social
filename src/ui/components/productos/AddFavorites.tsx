"use client";

import { useEffect, useState } from "react";
import { FaHeart } from "react-icons/fa"; // Asumimos que usas este ícono para favoritos
import { IoMdClose } from "react-icons/io"; // Icono de cierre para el modal
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

      {/* Toast centrado como modal overlay para mejor visibilidad */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50" // Overlay semi-transparente para enfoque
            onClick={() => setShowToast(false)} // Cierra al clic en backdrop
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 text-center text-gray-800 relative" // Texto oscuro para visibilidad
              onClick={(e) => e.stopPropagation()} // Evita cierre al clic dentro
            >
              <button
                onClick={() => setShowToast(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Cerrar"
              >
                <IoMdClose className="text-2xl" />
              </button>
              <p className="text-xl font-medium mb-2">
                {isFavorite ? "❤️ Agregado a favoritos" : "💔 Removido de favoritos"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};