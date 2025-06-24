"use client";

import { useEffect, useState } from "react";
import { getProductsFromDB } from "@/lib/indexedDB";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/indexedDB";


export default function ModifyProductsList() {
    const [products, setProducts] = useState<Product[]>([]);

  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProductsFromDB();
        console.log("📦 Productos obtenidos:", data);
        setProducts(data);
      } catch (error) {
        console.error("❌ Error al obtener productos:", error);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 text-left">Título</th>
            <th className="px-6 py-3 text-left">Precio</th>
          
            <th className="px-6 py-3 text-left">Acción</th>
          </tr>
        </thead>
        <tbody>
          {products.length > 0 ? (
            products.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="px-6 py-4">{product.nombre}</td>
                <td className="px-6 py-4">${(product.precio ?? 0).toFixed(2)}</td>
                
                <td className="px-6 py-4">
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => router.push(`/dashboard/productos/${product.slug}`)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                No hay productos disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
