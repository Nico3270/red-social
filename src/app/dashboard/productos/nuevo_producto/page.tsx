import CreateNewProduct from "@/ui/components/productos/CreateNewProduct";
import { TituloPrincipal } from "@/ui/components/titulos/Titulos";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
export default async function NewProductPage() {
  return (
    <div className="w-full bg-white">
      <TituloPrincipal children="Crear Nuevo Producto" />
      <CreateNewProduct  />
    </div>
  );
}
