"use client";

import { Product } from "@/interfaces/product.interface";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaSearch, FaArrowUp } from "react-icons/fa";

interface ProductsDashboardProps {
  initialData: {
    products: Product[];
  };
  fetchProducts: (page: number) => Promise<{ products: Product[] }>;
}

export const ProductsDashboard = ({ initialData, fetchProducts }: ProductsDashboardProps) => {
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter((product) =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cargar más productos al hacer scroll
  const loadMoreProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;
    const data = await fetchProducts(nextPage);

    if (data.products.length === 0) {
      setHasMore(false);
    } else {
      setProducts((prev) => [...prev, ...data.products]);
      setCurrentPage(nextPage);
    }
    setIsLoading(false);
  }, [currentPage, fetchProducts, isLoading, hasMore]);

  // Detectar el final de la lista con IntersectionObserver
  const lastProductRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreProducts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, loadMoreProducts]
  );

  // Mostrar botón para volver arriba cuando se hace scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Volver al inicio de la lista
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative overflow-x-auto" ref={scrollContainerRef}>
      {/* Filtro de búsqueda */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Lista de Productos</h2>
        <div className="relative w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 pl-10 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <FaSearch className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <table className="min-w-max w-full border-collapse table-auto text-left">
        <thead>
          <tr className="border-b">
            <th className="p-4">Imagen</th>
            <th className="p-4">Título</th>
            <th className="p-4">Precio</th>
            <th className="p-4">Editar</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <tr
                key={product.id}
                className="border-b hover:bg-gray-50"
                ref={index === filteredProducts.length - 1 ? lastProductRef : null}
              >
                <td className="p-4">
                  <Image
                    src={product.imagenes[0] || "/imgs/imagen-prueba.webp"}
                    alt={product.nombre}
                    width={64}
                    height={64}
                    className="rounded-md object-cover"
                  />
                </td>

                <td className="p-4">
                  <Link
                    href={`/dashboard/productos/${product.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    {product.nombre}
                  </Link>
                </td>

                <td className="p-4">${product.precio.toFixed(2)}</td>
                <td className="p-4">
                  <Link
                    href={`/dashboard/productos/${product.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                No se encontraron productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Spinner de carga */}
      {isLoading && (
        <div className="text-center p-4">
          <p className="text-gray-500">Cargando más productos...</p>
        </div>
      )}

      {/* Botón para volver arriba */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-14 right-6 sm:bottom-16 p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-indigo-600"
        >
          <FaArrowUp size={20} />
        </button>
      )}
    </div>
  );
};
