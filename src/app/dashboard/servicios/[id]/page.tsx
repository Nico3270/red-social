import { getServiceById } from "@/services/actions/service_actions";
import ModifyServiceWrapper from "@/services/componentes/ModifyServiceWrapper";

import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    id: string;
  }>
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;

  const service = await getServiceById(id);

  if (!service) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-10">Modificar Servicio</h1>
      <ModifyServiceWrapper service={service} />
    </div>
  );
}
