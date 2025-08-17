


import { auth } from "@/auth.config";
import { ReservasDashboard } from "@/reservas/componentes/ReservasDashboard";
import { redirect } from "next/navigation";


export default async function ReservasPage() {
  const session = await auth();
  
  
  if (!session || !session.user?.negocioId) {
    return <div>Unauthorized</div>;
  }
  const negocioId = session?.user?.negocioId;

  // Si es false (o undefined por seguridad), redirigir a la ruta de creación
  if (!session.user.configReservation) {
    redirect("/dashboard/reservas/crear");
  }

  return (
    <div>
      
      {/* Renderiza el componente de ReservasDashboard pasando el negocioId */}
      <ReservasDashboard negocioId={negocioId} />
    </div>
  );
}