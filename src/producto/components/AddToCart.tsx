"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { CartProduct, Product } from "@/interfaces/product.interface";
import { QuantitySelector } from "./QuantitySelector";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { FaShoppingCart } from "react-icons/fa";
import { BsWhatsapp } from "react-icons/bs";
import { SeccionesFont, titleFont } from "@/config/fonts";
import { InfoEmpresa } from "@/config/config";
import { IoMdClose } from "react-icons/io"; // Icono de cierre para el modal
import { HiOutlineCube } from "react-icons/hi"; // Icono de componente

interface AddToCartProps {
  product: Product;
}


export const AddToCart: React.FC<AddToCartProps> = ({ product }) => {
  const addProductToCart = useCartCatalogoStore((state) => state.addProductToCart);

  const [cantidad, setCantidad] = useState(1);
  const [comentario, setComentario] = useState("");
  
  const [isComponentsModalOpen, setIsComponentsModalOpen] = useState(false); // Estado para modal de componentes

  const handleAddToCart = () => {
    const productToAdd: CartProduct = {
      cartItemId: uuidv4(),
      id: product.id,
      slug: product.slug,
      nombre: product.nombre,
      precio: product.precio,
      cantidad,
      imagen: product.imagenes[0],
      seccionIds: product.seccionIds,
      descripcionCorta: product.descripcionCorta,
      comentario,
    };

    addProductToCart(productToAdd);
    setCantidad(1);
    setComentario("");

   
  };

  const handleQuantityChange = (newCantidad: number) => {
    setCantidad(newCantidad);
  };

  // Crear mensaje de WhatsApp
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estoy interesado en el siguiente producto:\n\n` +
    `*${product.nombre}*\n` +
    `Precio: $${(product.precio * cantidad).toFixed(2)}\n\n` +
    `Puedes ver más detalles aquí:\n` +
    `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`
  );

  const whatsappUrl = `https://wa.me/${InfoEmpresa.telefono}?text=${whatsappMessage}`;

  return (
    <div className="mt-0  flex flex-col items-center gap-6 bg-white p-4 rounded-lg shadow-md">
      {/* Información del producto */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold color-titulo-tarjeta ${SeccionesFont.className}`}>{product.nombre}</h1>
        <p className={`color-descripcion-tarjeta text-md mt-2 ${titleFont.className}`}>{product.descripcion}</p>
      </div>

       {/* Botón para abrir el modal de componentes */}
       <button
        onClick={() => setIsComponentsModalOpen(true)}
        className="mt-0 px-6 py-3 text-white font-semibold bg-gray-900 hover:bg-gray-800 rounded-lg shadow-md transition-all flex items-center gap-2"
      >
        <HiOutlineCube className="text-lg" />
        Especificaciones del Producto
      </button>

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

      {/* Selector de cantidad y precio */}
      <div className="flex items-center gap-4 w-full justify-center">
        <QuantitySelector inicio={cantidad} onQuantityChange={handleQuantityChange} />
        <p className={`text-lg font-semibold color-principal`}>
          Precio: ${product.precio.toFixed(2)}
        </p>
      </div>

      {/* Campo de texto para comentario */}
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Comentario..."
        className="w-full max-w-lg border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#2e2d2e] focus:outline-none"
        rows={2}
      />

      {/* Botones */}
      <div className="flex gap-4">
        <button
          onClick={handleAddToCart}
          className="flex items-center justify-center gap-2 color-boton-agregar texto-boton font-bold py-3 px-6 rounded-lg shadow-md transition-all"
        >
          <FaShoppingCart className="text-lg" />
          Agregar
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all"
        >
          <BsWhatsapp className="text-lg" />
          WhatsApp
        </a>
      </div>

     

      
    </div>
  );
};
