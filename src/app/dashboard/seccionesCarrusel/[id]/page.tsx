



import { getSectionCarruselById } from "@/principal/actions/carruselPrincipalActions";
import ModifyCarruselSection from "@/principal/componentes/ModifyCarruselSection";


import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function CarruselSecionsModifyPage({ params }: Props) {
  const { id } = await params;
  const section= await getSectionCarruselById(id)

  if (!section) {
    notFound(); // Redirige a una página 404 si no se encuentra el testimonio
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ModifyCarruselSection section={section} />
    </div>
  );
}




