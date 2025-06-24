import { getSections } from "@/productos/actions/getSections";
import CreateNewProduct from "@/productos/components/CreateNewProduct";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
export default async function NewProductPage() {
  const allSections = await getSections();

  

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Crear Nuevo Producto</h1>
      <CreateNewProduct allSections={allSections} />
    </div>
  );
}
