"use client";

import React, { useState, useEffect } from "react";
import type { AvailableProduct } from "@/actions/catalogGroups/getAvailableProducts";
import {
  FaSearch,
  FaPlus,
  FaTrash,
  FaStar,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import { getAvailableProducts } from "@/actions/catalogGroups/getAvailableProducts";
import {
  assignProductToCatalogGroup,
  removeProductFromCatalogGroup,
  reorderCatalogGroupProduct,
  toggleCatalogGroupProductFeatured,
} from "@/actions/catalogGroups/catalogGroupProducts";

interface GroupProduct {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  precio: number;
  order: number;
  isFeatured: boolean;
}

interface ProductAssignmentPanelProps {
  groupId: string;
  groupProducts?: GroupProduct[];
  onProductsUpdated?: () => void;
}

const ProductAssignmentPanel: React.FC<ProductAssignmentPanelProps> = ({
  groupId,
  groupProducts = [],
  onProductsUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<GroupProduct[]>(
    groupProducts
  );
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setAssignedProducts(groupProducts);
  }, [groupProducts]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length === 0) {
      setAvailableProducts([]);
      setShowSearchResults(false);
      return;
    }

    setLoadingSearch(true);
    try {
      const result = await getAvailableProducts(groupId, query, 20, 0);
      if (result.ok && result.products) {
        setAvailableProducts(
          result.products.filter((p) => !p.isAssignedToGroup)
        );
        setShowSearchResults(true);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Error en la búsqueda" });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAssignProduct = async (productId: string) => {
    try {
      const result = await assignProductToCatalogGroup({
        catalogGroupId: groupId,
        productId,
      });

      if (result.ok) {
        setMessage({ type: "success", text: "Producto asignado" });
        setSearchQuery("");
        setAvailableProducts([]);
        setShowSearchResults(false);
        onProductsUpdated?.();

        // Opcional: Recargar productos asignados aquí si tienes acceso a ellos
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Error al asignar producto" });
    }
  };

  const handleRemoveProduct = async (catalogGroupProductId: string) => {
    if (!confirm("¿Quieres remover este producto del grupo?")) return;

    try {
      const result = await removeProductFromCatalogGroup(
        catalogGroupProductId
      );

      if (result.ok) {
        setMessage({ type: "success", text: "Producto removido" });
        setAssignedProducts(
          assignedProducts.filter((p) => p.id !== catalogGroupProductId)
        );
        onProductsUpdated?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Error al remover producto" });
    }
  };

  const handleMoveProduct = async (
    catalogGroupProductId: string,
    direction: "up" | "down"
  ) => {
    const currentIndex = assignedProducts.findIndex(
      (p) => p.id === catalogGroupProductId
    );
    if (currentIndex === -1) return;

    const newIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= assignedProducts.length) return;

    const newOrder = assignedProducts[newIndex].order;

    try {
      const result = await reorderCatalogGroupProduct(
        catalogGroupProductId,
        newOrder
      );

      if (result.ok) {
        const newProducts = [...assignedProducts];
        [newProducts[currentIndex], newProducts[newIndex]] = [
          newProducts[newIndex],
          newProducts[currentIndex],
        ];
        setAssignedProducts(newProducts);
        onProductsUpdated?.();
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Error al reordenar" });
    }
  };

  const handleToggleFeatured = async (
    catalogGroupProductId: string,
    isFeatured: boolean
  ) => {
    try {
      const result = await toggleCatalogGroupProductFeatured(
        catalogGroupProductId,
        !isFeatured
      );

      if (result.ok) {
        setAssignedProducts(
          assignedProducts.map((p) =>
            p.id === catalogGroupProductId
              ? { ...p, isFeatured: !isFeatured }
              : p
          )
        );
        onProductsUpdated?.();
        setMessage({
          type: "success",
          text: `Producto ${!isFeatured ? "destacado" : "sin destacar"}`,
        });
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch {
      setMessage({ type: "error", text: "Error al cambiar destacado" });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Encabezado */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">
          Gestionar Productos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Asigna productos del negocio a este grupo
        </p>
      </div>

      {/* Mensajes */}
      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {loadingSearch ? (
              <div className="p-4 text-center text-gray-600">
                Buscando...
              </div>
            ) : availableProducts.length > 0 ? (
              <div className="divide-y">
                {availableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {product.nombre}
                      </p>
                      <p className="text-xs text-gray-600">
                        ${product.precio.toLocaleString("es-CO")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignProduct(product.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded transition flex-shrink-0"
                    >
                      <FaPlus />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600 text-sm">
                No se encontraron productos disponibles
              </div>
            )}
          </div>
        )}
      </div>

      {/* Productos asignados */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">
          Productos Asignados ({assignedProducts.length})
        </h4>

        {assignedProducts.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-sm">
              No hay productos asignados a este grupo. Busca y asigna uno.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {assignedProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {product.productName}
                  </p>
                  <p className="text-xs text-gray-600">
                    ${product.precio.toLocaleString("es-CO")}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {/* Botón destacar */}
                  <button
                    onClick={() =>
                      handleToggleFeatured(product.id, product.isFeatured)
                    }
                    className={`p-2 rounded transition ${
                      product.isFeatured
                        ? "text-yellow-500 hover:bg-yellow-100"
                        : "text-gray-400 hover:bg-gray-200"
                    }`}
                    title={
                      product.isFeatured
                        ? "Marcar como no destacado"
                        : "Marcar como destacado"
                    }
                  >
                    <FaStar className="text-lg" />
                  </button>

                  {/* Botones mover */}
                  <button
                    onClick={() => handleMoveProduct(product.id, "up")}
                    disabled={index === 0}
                    className={`p-2 rounded transition ${
                      index === 0
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Mover arriba"
                  >
                    <FaArrowUp />
                  </button>

                  <button
                    onClick={() => handleMoveProduct(product.id, "down")}
                    disabled={index === assignedProducts.length - 1}
                    className={`p-2 rounded transition ${
                      index === assignedProducts.length - 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Mover abajo"
                  >
                    <FaArrowDown />
                  </button>

                  {/* Botón remover */}
                  <button
                    onClick={() => handleRemoveProduct(product.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                    title="Remover"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductAssignmentPanel;
