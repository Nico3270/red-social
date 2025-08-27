"use client";

import { FaShoppingCart } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import { FavoriteProduct } from "@/interfaces/product.interface"; // Asegúrate de que apunte a la interfaz actualizada
import { useState } from "react";
import { AddFavorites } from "@/ui/components/productos/AddFavorites";
import { Precio } from "@/ui/components/productos/Precio";
import { motion, AnimatePresence } from "framer-motion"; // Nueva import para animaciones
import { useCartCatalogoStore } from "@/store/carro/carro-store"; // Nueva import para el store

interface FavoritesCardProps {
  product: FavoriteProduct;
}

export const FavoritesCard: React.FC<FavoritesCardProps> = ({ product }) => {
  const [displayImage, setDisplayImage] = useState(
    product.images && product.images.length > 0
      ? product.images[0]
      : "/imgs/no-image.webp"
  );
  const [isModalOpen, setIsModalOpen] = useState(false); // Nuevo: Para controlar el modal
  const [quantity, setQuantity] = useState(1); // Nuevo: Para la cantidad
  const [showSuccess, setShowSuccess] = useState(false); // Nuevo: Para el toast de éxito

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart); // Nuevo: Hook del store

  const handleAddToCart = () => {
    if (!product.slugNegocio) {
      console.error("No se encontró el slug del negocio");
      return;
    }

    const cartProduct = {
      cartItemId: `${product.id}-${Date.now()}`, // ID único
      id: product.id,
      slug: product.slug,
      nombre: product.nombre, // Usa el nombre renombrado (o product.title si no lo cambiaste)
      precio: product.precio, // Usa el precio renombrado (o product.price)
      cantidad: quantity,
      imagen: product.images[0],
      seccionIds: product.sections,
      descripcionCorta: product.descripcionCorta,
    };

    addProductToCart(product.slugNegocio, cartProduct);
    setIsModalOpen(false);
    setShowSuccess(true);
    setQuantity(1); // Resetear cantidad
    setTimeout(() => setShowSuccess(false), 3000); // Ocultar toast después de 3s
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 relative">
      <Link href={`/producto/${product.slug}`}>
        {/* Imagen del producto */}
        <div className="relative h-56 w-full">
          <Image
            src={displayImage}
            alt={product.nombre} // Actualizado a 'nombre'
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="rounded-lg object-cover"
            onMouseEnter={() => setDisplayImage(product.images[1] || product.images[0])}
            onMouseLeave={() => setDisplayImage(product.images[0])}
          />
        </div>
      </Link>

      {/* Botón de favoritos */}
      <div className="absolute top-2 right-2 z-10">
        <AddFavorites
          id={product.id}
          title={product.nombre} // Actualizado (o usa product.title si no renombraste)
          price={product.precio} // Actualizado
          description={product.descripcion} // Actualizado
          slug={product.slug}
          images={product.images}
          descripcionCorta={product.descripcionCorta}
          sections={product.sections}
          slugNegocio={product.slugNegocio}
        />
      </div>

      {/* Información del producto */}
      <div className="mt-4">
        <h3 className="text-lg font-bold">{product.nombre}</h3> {/* Actualizado */}
        <p className="text-sm text-gray-600">
          {product.descripcion?.length > 80
            ? `${product.descripcion.substring(0, 80)}...`
            : product.descripcion || "Sin descripción disponible"} {/* Actualizado */}
          {product.descripcion?.length > 80 && (
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
        <Precio value={product.precio} /> {/* Actualizado */}
        <button // Cambiado de Link a button para abrir modal
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center"
        >
          <FaShoppingCart className="mr-2" />
          Agregar
        </button>
      </div>

      {/* Mini Modal de Confirmación (copiado y adaptado de ProductCard) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full relative border-2 border-gray-200 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h5 className="text-lg font-semibold text-center mb-3 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-700 drop-shadow-sm">
                Agregar al carrito
              </h5>
              <div className="text-center mb-6">
                <p className="text-2xl font-bold text-gray-900">{product.nombre}</p>
                <p className="text-lg font-semibold text-gray-700 mt-1">
                  ${new Intl.NumberFormat("es-CO").format(product.precio)}
                </p>
              </div>
              <div className="flex items-center justify-center mb-8">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="bg-gray-600 hover:bg-gray-200 hover:text-gray-800 text-gray-100 font-bold px-4 py-2 rounded-l-full transition-colors duration-200 shadow-sm"
                >
                  –
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border-t border-b border-gray-200 py-2 font-semibold text-gray-900 focus:outline-none text-lg"
                  min="1"
                />
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="bg-gray-600 hover:bg-gray-200 hover:text-gray-800 text-gray-100 font-bold px-4 py-2 rounded-r-full transition-colors duration-200 shadow-sm"
                >
                  +
                </button>
              </div>
              <div className="flex justify-between gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-red-600 hover:text-gray-100 border-gray-500 border text-gray-700 font-medium py-3 rounded-full transition-all duration-200 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-gray-800 hover:bg-green-600 hover:text-gray-100 border-gray-500 border text-gray-100 font-medium py-3 rounded-full transition-all duration-200 shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mensaje de confirmación (Toast, copiado de ProductCard) */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div className="bg-white/90 backdrop-blur-md text-green-600 px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)] text-center text-lg font-semibold border-2 border-green-600">
              ✅ ¡Producto agregado al carrito!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};