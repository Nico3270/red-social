"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { CartProduct } from "@/interfaces/product.interface";
import { useCartCatalogoStore } from "@/store/carro/carro-store";

import { FiTrash2 } from "react-icons/fi";
import { Precio } from "@/seccion/componentes/Precio";
import { QuantitySelector } from "@/producto/components/QuantitySelector";

interface CartProductCardProps {
  product: CartProduct;
}

export const CartProductCard: React.FC<CartProductCardProps> = ({ product }) => {
  const {
    updateProductQuantity,
    updateProductComment,
    removeProduct,
  } = useCartCatalogoStore();

  const [total, setTotal] = useState<number>(product.precio * product.cantidad);
  console.log({product});

  useEffect(() => {
    setTotal(product.precio * product.cantidad);
  }, [product.cantidad, product.precio]);

  const handleQuantityChange = (newQuantity: number) => {
    updateProductQuantity(product.cartItemId, newQuantity);
  };

  const handleCommentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateProductComment(product.cartItemId, event.target.value);
  };

  const handleRemove = () => {
    removeProduct(product.cartItemId);
  };

  return (
    <div className="flex flex-col lg:flex-row items-start p-4 border rounded-lg shadow-md bg-white w-full">
      {/* Imagen del producto */}
      <div className="flex-shrink-0 w-full lg:w-48 h-auto lg:h-48 flex items-center justify-center">
        <Image
          src={product.imagen}
          alt={product.nombre}
          width={400}
          height={400}
          className="rounded-lg object-cover w-full lg:w-auto"
        />
      </div>

      {/* Detalles del producto */}
      <div className="flex-grow mt-4 lg:mt-0 lg:ml-4">
        <div className="flex justify-between items-start lg:items-center w-full">
          <h2 className="text-lg lg:text-2xl color-titulo-tarjeta font-bold break-words">
            {product.nombre}
          </h2>
          <button
            className="text-red-500 hover:text-red-700 transition-transform transform hover:scale-110 ml-2 mt-2 lg:mt-0"
            onClick={handleRemove}
          >
            <FiTrash2 className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        {/* Comentario */}
        <textarea
          placeholder="Añade un comentario"
          className="mt-2 p-2 border rounded-lg w-full focus:border-[#f07167] focus:ring-2 focus:ring-[#f07167]"
          value={product.comentario || ""}
          onChange={handleCommentChange}
        />

        {/* Precio y cantidad */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-lg color-titulo-tarjeta font-bold">
            Total: <Precio value={total} />
          </div>
          <QuantitySelector
            inicio={product.cantidad}
            onQuantityChange={handleQuantityChange}
          />
        </div>
      </div>
    </div>
  );
};
