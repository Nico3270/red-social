import { SectionsList } from "@/seccion/componentes/SectionsList";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

export default function SectionsPage() {
  return <SectionsList />;
}
