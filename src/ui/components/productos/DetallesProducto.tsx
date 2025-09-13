"use client";

import React, { useState } from "react";
import { BsWhatsapp } from "react-icons/bs";
import { SeccionesFont, titleFont } from "@/config/fonts";
import { InfoEmpresa } from "@/config/config";
import { IoMdClose } from "react-icons/io"; // Icono de cierre para el modal
import { HiOutlineCube } from "react-icons/hi"; // Icono de componente
import Link from "next/link";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import Divider from "../divider/Divider";
import { useSession } from "next-auth/react";
import { FaComment, FaShoppingCart } from "react-icons/fa";
import { ModalPublicaciones } from "@/publicaciones/componentes/ModalPublicaciones";
import { PublicacionTipo } from "@prisma/client";
import { ContextoPublicacion } from "../autoUpload/UsoenForm";
import { TestimonioProductoCrearEditar } from "@/publicaciones/componentes/TestimonioProductoCrearEditar";
import { AddFavorites } from "./AddFavorites";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { motion, AnimatePresence } from "framer-motion";


interface AddToCartProps {
  product: ProductRedSocial;
  telefonoNegocio?: string;
}

interface InformacionPublicacion {
  usuarioId?: string;
  publicacionId?: string;
  productoId: string;
  tipo: PublicacionTipo;
  contexto: ContextoPublicacion;
  nombreProducto: string;
  imagenProducto: string;
  descripcion?: string;
  multimedia?: string[];
}

export const DetallesProducto: React.FC<AddToCartProps> = ({ product, telefonoNegocio }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isComponentsModalOpen, setIsComponentsModalOpen] = useState(false); // Estado para modal de componentes
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false); // Estado para modal de reseña
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);

  // Crear mensaje de WhatsApp
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
    `*${product.nombre}*\n` +
    `Precio: $${(product.precio).toFixed(2)}\n\n` +
    `Puedes ver más detalles aquí:\n` +
    `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`
  );

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

  const whatsappUrl = `https://wa.me/${telefonoNegocio}?text=${whatsappMessage}`;
  const infoCrearPublicacion: InformacionPublicacion = {
    usuarioId: userId,
    productoId: product.id,
    tipo: PublicacionTipo.TESTIMONIO,
    contexto: "producto",
    nombreProducto: product.nombre || "",
    imagenProducto: product.imagenes[0] || ""
  }

  return (
    <div className="sm:mt-10 flex flex-col items-center gap-6 bg-white p-4 mb-10 mb:20 rounded-lg shadow-md">
      {/* Información del producto */}
      <div className="text-center">
        <h1
          className={`text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 text-center leading-snug break-words ${SeccionesFont.className}`}
        >
          {product.nombre}
        </h1>
        <Divider />
        <div className="mt-0">
          <span className="text-sm text-gray-500">Precio:</span>
          <div className="text-4xl font-extrabold text-gray-800 tracking-tight mt-1">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(product.precio)}
          </div>
        </div>
        {/* Botón para abrir el modal de componentes */}
        <div className="flex justify-center py-2">
          <button
            onClick={() => setIsComponentsModalOpen(true)}
            className="mt-0 px-6 py-3 text-white font-semibold bg-gray-900 hover:bg-gray-800 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            <HiOutlineCube className="text-lg" />
            Especificaciones del Producto
          </button>
        </div>
        <p className={`color-descripcion-tarjeta text-md mt-2 ${titleFont.className}`}>{product.descripcion}</p>
      </div>

      {/* Modal de Componentes */}
      {isComponentsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all scale-100">
            <div className="flex justify-between items-center mb-0">
              <h2 className="text-xl font-bold text-gray-800">Componentes del Producto</h2>
              <button onClick={() => setIsComponentsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <IoMdClose className="text-2xl" />
              </button>
            </div>

            <ul className="space-y-3">
              {product.componentes && product.componentes.length > 0 ? (
                product.componentes.map((componente, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 border-b last:border-none">
                    <HiOutlineCube className="text-gray-700 text-xl" />
                    <p className="text-gray-700 font-medium">{componente}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-500">No hay componentes disponibles para este producto.</p>
              )}
            </ul>

            <button
              onClick={() => setIsComponentsModalOpen(false)}
              className="mt-4 w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-4">
        <Link
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all"
        >
          <BsWhatsapp className="text-lg" />
          WhatsApp
        </Link>
        <AddFavorites
          id={product.id}
          title={product.nombre}
          price={product.precio}
          slug={product.slug}
          images={product.imagenes[0] ? [product.imagenes[0]] : []}
          descripcionCorta={product.descripcionCorta}
          description={product.descripcion}
          sections={product.sections}
          slugNegocio={product.slugNegocio || ""}

        />
        {/* Botón de Carrito */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full hover:from-blue-600 hover:to-blue-700 flex items-center justify-center transition-all duration-300"
        >
          <FaShoppingCart className="text-white text-xl" />
        </button>
      </div>

      {/* Nuevo botón para dejar reseña */}
      <div className="w-full flex justify-center mt-0">
        <button
          // onClick={() => setIsReviewModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#274494] hover:bg-[#2c5282] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
          aria-label="Deja una reseña de este producto"
        >
          <FaComment className="text-lg" />
          Deja una reseña de este producto
        </button>
      </div>

      {/* Modal de reseña */}
      {isReviewModalOpen && (
        // <PublicacionModalProducto
        //   userId={session?.user?.id}
        //   productId={product.id}
        //   contexto="producto"
        //   nombreProducto={product.nombre}
        //   urlImagenProducto={product.imagenes[0] || undefined}
        //   onClose={() => setIsReviewModalOpen(false)}
        // />
        <ModalPublicaciones
          onClose={() => setIsReviewModalOpen(false)} // ✅ Esto sí cierra el modal correcto
          userId={userId}
        >
          <TestimonioProductoCrearEditar
            infoPublicacion={
              infoCrearPublicacion
            }


          />
        </ModalPublicaciones>
      )}

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
  );
};