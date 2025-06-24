"use client";

import { Product } from "@/interfaces/product.interface";
import { ProductCard } from "@/seccion/componentes/ProductCard";
import { useRef } from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

interface ProductCarouselProps {
  category: string; // Nombre de la categoría a mostrar
  products: Product[]; // Lista de productos
}

export default function ProductCarousel({ category, products }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -900, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 900, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-0 px-0 relative">
      {/* Título de la categoría */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-2 border-l-4 border-red-500 pl-2">{category}</h2>
      
      {/* Contenedor con scroll horizontal */}
      <div className="relative">
        <button onClick={scrollLeft} className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white text-red-800 hover:bg-red-600 hover:text-white  shadow-md rounded-full p-2 hidden lg:block">
          <MdKeyboardArrowLeft size={24} />
        </button>
        <div ref={scrollRef} className="overflow-x-auto scrollbar-hide flex space-x-4 p-2 snap-x scroll-smooth w-full">
          {products.map((product) => (
            <div key={product.id} className="inline-block w-[300px] flex-shrink-0 snap-center overflow-hidden">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        <button onClick={scrollRight} className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white text-red-800 hover:bg-red-600 hover:text-white shadow-md rounded-full p-2 hidden lg:block">
          <MdKeyboardArrowRight size={24} />
        </button>
      </div>
    </div>
  );
}
