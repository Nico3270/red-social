"use client";

import React from "react";

import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { CartProductCard } from "./CartProductCard";

export const ProductsInCart = () => {
  const cartItems = useCartCatalogoStore((state) => state.cart);

  return (
    <div className="flex flex-col gap-6">
      {cartItems.length > 0 ? (
        cartItems.map((item, index) => (
          <CartProductCard key={index} product={item} />
        ))
      ) : (
        <div className="text-center text-lg text-gray-500">
          No hay productos en el carrito.
        </div>
      )}
    </div>
  );
};
