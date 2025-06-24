"use client";

import Image from "next/image";
import { FaEdit } from "react-icons/fa";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { PacificoFont } from "@/config/fonts";

export const CartCheckout = () => {
  const cartItems = useCartCatalogoStore((state) => state.cart);
  const totalItems = useCartCatalogoStore((state) => state.getTotalItems());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || totalItems === 0) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-500">
          Tu carrito está vacío.
        </p>
        <Link
          href="/productos"
          className="text-red-500 underline hover:text-red-600"
        >
          Regresar a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/carro"
        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 hover:text-red-600 transition-all duration-300 ease-in-out shadow-lg"
      >
        <FaEdit className="mr-2" />
        Editar carrito
      </Link>

      {cartItems.map((product) => (
        <div
          key={product.cartItemId}
          className="flex border rounded-lg shadow-md p-4 items-center space-x-4"
        >
          <Image
            src={product.imagen}
            alt={product.nombre}
            width={100}
            height={100}
            className="rounded-lg"
          />

          <div className="flex-1">
            <h2 className="text-lg font-bold">{product.nombre}</h2>
            {product.comentario && (
              <p className="text-sm mt-2">
                <span className="font-bold">Comentario: </span>
                {product.comentario}
              </p>
            )}
            <p className={`font-bold text-red-600 mt-2 text-xl flex items-center ${PacificoFont.className}`}>
              {product.cantidad} x ${product.precio} = ${product.cantidad * product.precio}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
