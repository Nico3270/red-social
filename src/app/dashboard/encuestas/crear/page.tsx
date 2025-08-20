import { auth } from "@/auth.config";
import { getPreguntasAdmin } from "@/encuestas/actions/getPreguntasAdmin";
import CrearEncuestaNegocio from "@/encuestas/componentes/CrearEncuestaNegocio";
import { unstable_noStore as noStore } from "next/cache"; // Para no-cache en server components

export default async function CrearEncuestasModuloPage() {
  noStore(); // Desactiva cache estático para datos dinámicos (revalida en cada request; ajusta a revalidate: 3600 en metadata si usas export const revalidate = 3600;)

  const session = await auth();
  if (!session || !session.user?.negocioId) {
    return <div className="text-center text-red-500 p-4">No autorizado: Inicia sesión como dueño de negocio.</div>;
  }

  const result = await getPreguntasAdmin();
  if (!result.ok || !result.preguntas) {
    return <div className="text-center text-red-500 p-4">Error al cargar preguntas: {result.message}. Intenta refrescar la página.</div>;
  }

  // Aquí result.preguntas es Pregunta[] garantizado (non-null assertion o guard implícito)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <CrearEncuestaNegocio preguntas={result.preguntas} />
    </div>
  );
}