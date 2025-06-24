"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation"; // Hook para manejar navegación en Next.js
import { FaTrashAlt, FaPlus, FaSearch } from "react-icons/fa";
import { updateOrder } from "@/order/actions/updateOrder";

interface Product {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comentario?: string;
}

interface UpdateOrderProps {
  orderId: string;
  existingProducts: Product[];
  catalogProducts: Product[];
}

export const UpdateOrder = ({
  orderId,
  existingProducts,
  catalogProducts,
}: UpdateOrderProps) => {
  const [productsInOrder, setProductsInOrder] = useState<Product[]>(existingProducts);
  const [stageProducts, setStageProducts] = useState<Product[]>([]); // Productos en el stage
  const [removedProductIds, setRemovedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filtrar productos del catálogo
  const filteredCatalog = catalogProducts.filter(
    (product) =>
      product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !productsInOrder.some((p) => p.id === product.id) &&
      !stageProducts.some((p) => p.id === product.id)
  );

  const handleAddToStage = (product: Product) => {
    setStageProducts([...stageProducts, { ...product, cantidad: 1 }]);
  };

  const handleUpdateStageQuantity = (id: string, cantidad: number) => {
    setStageProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cantidad } : p))
    );
  };

  const handleRemoveFromStage = (id: string) => {
    setStageProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemoveFromOrder = (id: string) => {
    setProductsInOrder((prev) => prev.filter((p) => p.id !== id));
    setRemovedProductIds((prev) => [...prev, id]); // Agregar el ID al estado de productos eliminados
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateOrder(orderId, {
        productsInOrder: productsInOrder.map((p) => ({
          id: p.id,
          cantidad: p.cantidad,
        })),
        newProducts: stageProducts.map((p) => ({
          id: p.id,
          cantidad: p.cantidad,
          precio: p.precio,
          comentario: p.comentario || "",
        })),
        removedProductIds, // Enviar los IDs de productos eliminados
      });

      if (result.success) {
        alert("Orden actualizada exitosamente");

        // Actualizar el estado de los productos en la orden
        setProductsInOrder([
          ...productsInOrder.filter(
            (product) => !removedProductIds.includes(product.id)
          ),
          ...stageProducts,
        ]);

        // Limpiar el stage y los productos eliminados
        setStageProducts([]);
        setRemovedProductIds([]);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleBackToOrder = () => {
    router.push(`/dashboard/order/${orderId}`); // Redirigir a la orden
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos en la orden actual */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Productos en la orden</h2>
          {productsInOrder.length > 0 ? (
            productsInOrder.map((product) => (
              <div key={product.id} className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{product.nombre}</p>
                  <p className="text-sm text-gray-500">${product.precio.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={product.cantidad}
                    min="1"
                    onChange={(e) =>
                      handleUpdateStageQuantity(product.id, parseInt(e.target.value, 10))
                    }
                    className="w-16 p-1 border rounded-md"
                  />
                  <button
                    onClick={() => handleRemoveFromOrder(product.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No hay productos en la orden.</p>
          )}
        </div>

        {/* Stage: Productos a agregar */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Productos en Stage</h2>
          {stageProducts.length > 0 ? (
            stageProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{product.nombre}</p>
                  <p className="text-sm text-gray-500">${product.precio.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={product.cantidad}
                    min="1"
                    onChange={(e) =>
                      handleUpdateStageQuantity(product.id, parseInt(e.target.value, 10))
                    }
                    className="w-16 p-1 border rounded-md"
                  />
                  <button
                    onClick={() => handleRemoveFromStage(product.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No hay productos en el stage.</p>
          )}
        </div>

        {/* Agregar nuevos productos */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Agregar nuevos productos</h2>
          <div className="mb-4">
            <div className="flex items-center">
              <FaSearch className="mr-2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {filteredCatalog.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between p-2 border-b"
              >
                <div>
                  <p className="font-medium">{product.nombre}</p>
                  <p className="text-sm text-gray-500">${product.precio.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleAddToStage(product)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                >
                  <FaPlus />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Botones para guardar cambios y regresar a la orden */}
      <div className="text-center mt-6 flex justify-center gap-4 pb-16 sm:pb-4"> {/* Ajuste del padding */}
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-[#a53860] text-white px-6 py-2 rounded-lg hover:bg-[#ffa5ab]"
        >
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button
          onClick={handleBackToOrder}
          className="bg-[#274c77] text-white px-6 py-2 rounded-lg hover:bg-gray-600"
        >
          Regresar a la orden
        </button>
      </div>
    </div>
  );
};
