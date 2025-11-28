import { HelpTriggerModal } from "@/ui/components/helpModal/HelpTriggerModal";
import CreateNewProduct from "@/ui/components/productos/CreateNewProduct";
import { TituloPrincipal } from "@/ui/components/titulos/Titulos";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
export default async function NewProductPage() {
  return (
    <div className="w-full sm:p-6 bg-white flex flex-col items-center justify-center gap-4">
      <TituloPrincipal>
        Crear Nuevo Producto
      </TituloPrincipal>
      <HelpTriggerModal
        text="Mira este video de ayuda y crea tus productos"
        title="Cómo crear tu cuenta de negocio en Myckeo"
        youtubeUrl="https://www.youtube.com/embed/c5CsO8t4aBQ"
        variant="dangerSolid"
        size="lg"
        icon="play"
      />

      <CreateNewProduct />
    </div>
  );
}

