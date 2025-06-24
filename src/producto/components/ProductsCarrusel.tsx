"use client";

import {  titleFont, titulosPrincipales } from "@/config/fonts";
import { Product } from "@/interfaces/product.interface";
import { ProductCard } from "@/seccion/componentes/ProductCard";



import React from "react";

interface ProductsCarruselProps {
  products: Product[];
}

export const ProductsCarrusel: React.FC<ProductsCarruselProps> = ({ products }) => {
  return (
    <section className="w-full py-6 bg-gradient-to-b from-[#eef2f3] to-[#d9e6ea] pb-6">
      {/* Título del Carrusel */}
      <div className="text-center mb-4">
        <h2 className={`text-4xl font-extrabold color-titulos  ${titulosPrincipales.className}`}>
          Productos Destacados
        </h2>
        <p className={`color-descripcion-tarjeta text-lg mt-2 p-2 ${titleFont.className}`}>
          Explora una selección de productos recomendados para ti.
        </p>
      </div>

      {/* Carrusel Horizontal */}
      <div className="flex overflow-x-auto space-x-4 px-4 py-2 scrollbar-hide">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-[300px] md:w-[340px] lg:w-[360px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};
