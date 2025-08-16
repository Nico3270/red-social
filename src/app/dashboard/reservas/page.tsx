


import { auth } from "@/auth.config";
import { ReservasDashboard } from "@/reservas/componentes/ReservasDashboard";


export default async function ReservasPage() {
  const session = await auth();
  
  
  if (!session || !session.user?.negocioId) {
    return <div>Unauthorized</div>;
  }
  const negocioId = session?.user?.negocioId;
  return (
    <div>
      
      {/* Renderiza el componente de ReservasDashboard pasando el negocioId */}
      <ReservasDashboard negocioId={negocioId} />
    </div>
  );
}