


import { auth } from "@/auth.config";
import { ReservasDashboard } from "@/reservas/componentes/ReservasDashboard";
import { redirect } from "next/navigation";


export default async function ReservasPage() {
  const session = await auth();
  
  
  if (!session || !session.user?.negocioId) {
    return <div>Unauthorized</div>;
  }
 

  // Si es false (o undefined por seguridad), redirigir a la ruta de creación
  if (!session.user.configEncuestas) {
    redirect("/dashboard/encuestas/crear");
  }

  return (
    <div>
      
      {/* Renderiza el componente de ReservasDashboard pasando el negocioId */}
      <p>Página donde se mostrarán los resultados de las encuestas</p>
    </div>
  );
}