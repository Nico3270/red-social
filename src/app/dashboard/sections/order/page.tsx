// app/dashboard/seccion/order/page.tsx


import { getProductsAndSections } from "@/seccion/actions/getProductsAndSections";
import OrderProductByPriority from "@/seccion/componentes/OrderProductByPriority";

export default async function SectionOrderPage() {
  // Llamamos a la server action para obtener los datos
  const response = await getProductsAndSections();

  // Verificamos si la respuesta fue exitosa
  if (!response.success || !response.data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Ordenar Productos por Sección</h1>
        <p className="text-red-500">
          {response.success || "Error al cargar los datos"}
        </p>
      </div>
    );
  }

  // Pasamos los datos al componente cliente
  const sections = response.data;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ordenar Productos por Sección</h1>
      <OrderProductByPriority sections={sections} />
    </div>
  );
}