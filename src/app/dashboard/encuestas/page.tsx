


import { auth } from "@/auth.config";
import { getPreguntasAdmin } from "@/encuestas/actions/getPreguntasAdmin";
import { getPreguntasNegocio } from "@/encuestas/actions/getPreguntasNegocio";
import CrearEncuestaNegocio from "@/encuestas/componentes/CrearEncuestaNegocio";

import { redirect } from "next/navigation";


export default async function ReservasPage() {
  const session = await auth();
  
  
  if (!session || !session.user?.negocioId) {
    return <div>Unauthorized</div>;
  }

  const result = await getPreguntasAdmin();
    if (!result.ok || !result.preguntas) {
      return <div className="text-center text-red-500 p-4">Error al cargar preguntas: {result.message}. Intenta refrescar la página.</div>;
    }

  const slugNegocio = session.user.negocioSlug || ""; // Para revalidación
  const preguntas = await getPreguntasNegocio(slugNegocio)

  // console.log({preguntas});

  // Si es false (o undefined por seguridad), redirigir a la ruta de creación
  if (!session.user.configEncuestas || !preguntas.preguntas) {
    redirect("/dashboard/encuestas/crear");
  }

  return (
    <div>
      
      {/* Renderiza el componente de ReservasDashboard pasando el negocioId */}

      <CrearEncuestaNegocio preguntas={result.preguntas} preguntasSeleccionadas={preguntas.preguntas} />
    </div>
  );
}