import { getSectionById } from "@/seccion/actions/getSectionById";
import { UpdateSection } from "@/seccion/componentes/UpdateSection";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
interface Props {
  params: Promise<{
    id: string;
  }>
}

export default async function SectionIdPage({ params }: Props) {
  const { id } = await params;

  const section = await getSectionById(id);

  // Asegura que iconName no sea null
  const sanitizedSection = {
    ...section,
    iconName: section.iconName ?? "", // Asigna un string vacío si iconName es null
  };

  return (
    <div>
      <UpdateSection section={sanitizedSection} />
    </div>
  );
}
