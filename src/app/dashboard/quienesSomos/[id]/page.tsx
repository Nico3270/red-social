

import { getTarjetById } from "@/secondary/actions/quienesSomos";
import ModifyTarjet from "@/secondary/componentes/ModifyTarjetQuiesSomos";

import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuienesSomosPage({ params }: Props) {
  const { id } = await params;
  const tarjeta = await getTarjetById(id);

  if (!tarjeta) {
    notFound(); // Redirige a una página 404 si no se encuentra el testimonio
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ModifyTarjet tarjet={tarjeta} />
    </div>
  );
}




