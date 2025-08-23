"use client";

import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { descripcionCard, titulo1, tituloCard } from "@/config/fonts";
import { InfoEmpresa as empresa } from "@/config/config";
import { AddFavorites } from "./AddFavorites";
import { Precio } from "./Precio";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { initialData, Section } from "@/seed/seed";
import { motion, AnimatePresence } from "framer-motion";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import Divider from "../divider/Divider";


interface ProductCardProps {
  product: ProductRedSocial;
}

const urlWebProduccion = empresa.linkWebProduccion;

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [displayImage, setDisplayImage] = useState(product.imagenes[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);

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

  const handleAddToCart = () => {
    if (!product.slugNegocio) {
      console.error("No se encontró el slug del negocio");
      return;
    }

    const cartProduct = {
      cartItemId: `${product.id}-${Date.now()}`, // ID único para el ítem en el carrito
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      precio: product.precio,
      cantidad: quantity,
      imagen: product.imagenes[0],
      seccionIds: product.sections,
      descripcionCorta: product.descripcionCorta,
    };

    addProductToCart(product.slugNegocio, cartProduct);
    setIsModalOpen(false);
    setShowSuccess(true);
    setQuantity(1); // Resetear cantidad
    setTimeout(() => setShowSuccess(false), 3000); // Ocultar mensaje después de 3 segundos
  };

  return (
    <div className="relative bg-white border-2 border-gray-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300  flex flex-col h-[480px] w-full max-w-[380px] mx-auto overflow-hidden p-2">

      {/* Header con nombre del negocio */}
      {/* Header con nombre del negocio estilo premium */}
      <div className="flex items-center justify-between px-3 mb-3">
        {product.nombreNegocio && product.slugNegocio && (
          <Link
            href={`/perfil/${product.slugNegocio}`}
            className={`font-semibold text-gray-800 hover:text-blue-700  text-md transition-colors duration-200 ${titulo1.className}`}

          >
            {product.nombreNegocio}
          </Link>
        )}

        {/* Botón de favoritos premium */}
        <div className="z-20">
          <AddFavorites
            id={product.id}
            title={product.nombre}
            price={product.precio}
            description={product.descripcion}
            slug={product.slug}
            images={[product.imagenes[0]]}

          />
        </div>
      </div>


      {/* Imagen con enlace */}
      <Link href={`/${categorySlug}/${sectionSlug}/${product.slug}`} className="block relative">
        <div className="relative h-64 w-full cursor-pointer rounded-lg overflow-hidden"
        onMouseEnter={() => {
    if (product.imagenes.length > 1) {
      setDisplayImage(product.imagenes[1]); // cambia a la segunda imagen
    }
  }}
  onMouseLeave={() => {
    setDisplayImage(product.imagenes[0]); // vuelve a la primera imagen
  }}>
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
              className={`text-lg font-extrabold text-gray-800 ${tituloCard.className} transition duration-300 hover:text-blue-700`}
              style={{ textShadow: "0.5px 0.5px 1px rgba(0, 0, 0, 0.1)" }}
            >
              {product.nombre}
            </h3>
          </Link>

          <p className={`text-lg text-gray-600 ${descripcionCard.className} mt-1 line-clamp-2`}>
            {product.descripcionCorta || "Sin descripción disponible"}
          </p>
        </div>

        {/* Precio y botones */}
        <div className="m-1">
          <div className="flex justify-around items-center gap-2">
            <Precio value={product.precio} />

            <div className="flex gap-4">
              {/* Botón de WhatsApp */}
              <Link
                href={`https://wa.me/57${product.telefonoContacto}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-full hover:from-green-600 hover:to-green-700 flex items-center justify-center transition-all duration-300"
              >
                <BsWhatsapp className="text-white text-xl" />
              </Link>

              {/* Botón de Carrito */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full hover:from-blue-600 hover:to-blue-700 flex items-center justify-center transition-all duration-300"
              >
                <FaShoppingCart className="text-white text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Mini Modal de Confirmación */}
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
                className="bg-white rounded-3xl p-8 max-w-sm w-full relative 
            border-2 border-gray-200 
            shadow-[0_4px_30px_rgba(0,0,0,0.1)]"

                onClick={(e) => e.stopPropagation()}
              >
                {/* Encabezado secundario */}
                <h5 className="text-lg font-semibold text-center mb-3 
               tracking-wider text-transparent bg-clip-text 
               bg-gradient-to-r from-gray-700 to-gray-700 
               drop-shadow-sm">
                  Agregar al carrito
                </h5>


                {/* Producto */}
                <div className="text-center mb-6">
                  <p className="text-2xl font-bold text-gray-00">{product.nombre}</p>
                  <p className="text-lg font-semibold text-gray-700 mt-1">
                    ${new Intl.NumberFormat("es-CO").format(product.precio)}
                  </p>
                </div>

                {/* Selector de cantidad */}
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
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
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

                {/* Botones */}
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



        {/* Mensaje de confirmación (Toast moderno) */}
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
    </div>

  );
};