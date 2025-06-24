"use client"
import { ProductGrid } from "@/seccion/componentes/ProductGridSeccion";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import Pagination from "@mui/material/Pagination";
import { useEffect, useState } from "react";
import { Product } from "@/interfaces/product.interface";
import { getProductsByPriority } from "@/productos/actions/getProductsByPrioridad";
import { SeccionesFont } from "@/config/fonts";

export default function ProductsPage() {
  const pageSize = 12; // Número de productos por página
  const [page, setPage] = useState(1); // Página actual
  const [products, setProducts] = useState<Product[]>([]); // Estado para los productos
  const [totalPages, setTotalPages] = useState(0); // Estado para el total de páginas

  // Función para cargar productos de la página actual
  const loadProducts = async (currentPage: number) => {
    const { products, total } = await getProductsByPriority({
      page: currentPage,
      pageSize,
    });
    setProducts(products); // Actualizar los productos
    setTotalPages(Math.ceil(total / pageSize)); // Calcular el total de páginas
  };

  useEffect(() => {
    loadProducts(page); // Cargar productos de la página inicial
  }, [page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value); // Actualizar página actual
  };

  return (
    <div
      className="container mx-auto p-4"
      style={{
        paddingBottom: "80px", // Espacio adicional para evitar que la barra inferior cubra la paginación
      }}
    >
      {/* Título dinámico llamativo */}
      <div className="text-center my-8">
        <h1 className={`text-4xl font-bold ${SeccionesFont.className} color-titulos-ProductCard`}>Nuestros Productos</h1>
      </div>

      {/* Productos */}
      <ProductGrid products={products} />

      {/* Paginación */}
      <div className="flex justify-center lg:ml-40 mt-8">
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="secondary"
          siblingCount={0}
          boundaryCount={1}
          className="w-full max-w-xs sm:max-w-md"
        />
      </div>
    </div>
  );
}
