"use client";

import { useEffect, useState } from "react";
import { FaHeart } from "react-icons/fa";
// import { IoMdClose } from "react-icons/io";
// import { FavoriteProduct } from "@/interfaces/product.interface";
// import { motion, AnimatePresence } from "framer-motion";
// import { createPortal } from "react-dom";
import { useFavoritesCatalogoStore } from "@/store/favoritos/favoritos-store";

interface AddFavoritesProps {
  id: string;
  title: string;
  price: number;
  description: string;
  slug: string;
  images: string[];
  descripcionCorta: string;
  sections: string[];
  slugNegocio: string;
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
  const { favorites, addProductFavorites, removeProductFavorites } =
    useFavoritesCatalogoStore();

  const [isFavorite, setIsFavorite] = useState(false);
  // const [showModal, setShowModal] = useState(false);
  // const [modalMessage, setModalMessage] = useState("");
  // const [isClient, setIsClient] = useState(false);

  // Verificar si ya está en favoritos
  useEffect(() => {
    const exists = favorites.some((item) => item.id === id);
    setIsFavorite(exists);
  }, [favorites, id]);

  // Asegurar que estamos en el cliente para usar portals
  // useEffect(() => {
  //   setIsClient(true);
  // }, []);

  const handleToggleFavorite = () => {
    const favoriteProduct = {
      id,
      slug,
      nombre: title,
      precio: price,
      descripcion: description,
      descripcionCorta,
      images,
      sections,
      slugNegocio,
    };

    if (isFavorite) {
      removeProductFavorites(id);
      // setModalMessage("💔 Removido de favoritos");
    } else {
      addProductFavorites(favoriteProduct);
      // setModalMessage("❤️ Agregado a favoritos");
    }

    // setShowModal(true);
    setIsFavorite(!isFavorite);

    // setTimeout(() => setShowModal(false), 2000);
  };

  // const ModalContent = () => (
  //   <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
  //     <motion.div
  //       initial={{ scale: 0.95, opacity: 0 }}
  //       animate={{ scale: 1, opacity: 1 }}
  //       exit={{ scale: 0.95, opacity: 0 }}
  //       transition={{ duration: 0.2 }}
  //       className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 text-center text-gray-800 relative pointer-events-auto"
  //     >
  //       <button
  //         onClick={() => setShowModal(false)}
  //         className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
  //         aria-label="Cerrar"
  //       >
  //         <IoMdClose className="text-2xl" />
  //       </button>
  //       <p className="text-xl font-medium mb-2">{modalMessage}</p>
  //     </motion.div>
  //   </div>
  // );

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

      {/* Modal centrado sin overlay, renderizado vía portal */}
      {/* <AnimatePresence>
        {isClient && showModal && createPortal(<ModalContent />, document.body)}
      </AnimatePresence> */}
    </>
  );
};