// components/OrderProductByPriority.tsx
"use client";

import { useState } from "react";
import { updateProductPriorities } from "../actions/updateProductPriorities";

type Product = {
  id: string;
  nombre: string;
  precio: number;
  prioridad: number;
};

type Section = {
  id: string;
  nombre: string;
  slug: string;
  products: Product[];
};

type OrderProductByPriorityProps = {
  sections: Section[];
};

export default function OrderProductByPriority({ sections }: OrderProductByPriorityProps) {
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const handleSectionSelect = (section: Section) => {
    const initializedProducts = section.products.map((product, index) => ({
      ...product,
      prioridad: product.prioridad > 0 ? product.prioridad : index + 1,
    }));
    setSelectedSection(section);
    setProducts(initializedProducts);
  };

  const handlePriorityChange = (productId: string, newPriority: number) => {
    const maxPriority = products.length;
    const clampedPriority = Math.max(1, Math.min(newPriority, maxPriority));

    const updatedProducts = [...products];
    const productIndex = updatedProducts.findIndex((p) => p.id === productId);
    if (productIndex === -1) return;

    const [movedProduct] = updatedProducts.splice(productIndex, 1);
    movedProduct.prioridad = clampedPriority;

    const newIndex = clampedPriority - 1;
    updatedProducts.splice(newIndex, 0, movedProduct);

    const finalProducts = updatedProducts.map((product, index) => ({
      ...product,
      prioridad: index + 1,
    }));

    setProducts(finalProducts);
  };

  const handleSavePriorities = async () => {
    if (!selectedSection) {
      console.log("No section selected");
      return;
    }
  
    const updates = products.map((product) => ({
      productId: product.id,
      sectionId: selectedSection.id,
      prioridad: product.prioridad,
    }));
  
    console.log("Updates being sent:", JSON.stringify(updates, null, 2));
  
    try {
      console.log("Calling updateProductPriorities...");
      const response = await updateProductPriorities(updates);
      console.log("Response from server:", JSON.stringify(response, null, 2));
  
      if (response.success) {
        alert(response.message);
      } else {
        alert(response.error || "Error al guardar las prioridades");
      }
    } catch (clientError) {
      console.error("Client-side error calling updateProductPriorities:", clientError);
      alert("Error en el cliente al actualizar prioridades");
    }
  };

  // Mostrar la lista de secciones si no hay una sección seleccionada
  if (!selectedSection) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-2">Selecciona una sección</h2>
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => handleSectionSelect(section)}
                className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {section.nombre} ({section.products.length} productos)
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Si llegamos aquí, selectedSection no es null
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Productos en {selectedSection.nombre}</h2>
        <button
          onClick={() => setSelectedSection(null)}
          className="text-blue-500 hover:underline"
        >
          Volver a secciones
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Precio</th>
            <th className="p-2 text-left">Prioridad</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b hover:bg-gray-50">
              <td className="p-2">{product.nombre}</td>
              <td className="p-2">${product.precio.toFixed(2)}</td>
              <td className="p-2">
                <input
                  type="number"
                  min="1"
                  max={products.length}
                  value={product.prioridad}
                  onChange={(e) =>
                    handlePriorityChange(product.id, parseInt(e.target.value) || 1)
                  }
                  className="w-16 p-1 border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <button
          onClick={handleSavePriorities}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Actualizar Prioridades
        </button>
      </div>
    </div>
  );
}