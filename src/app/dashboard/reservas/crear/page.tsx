// /dashboard/reservas/crear/page.tsx
'use client'; // Convierte en Client Component para manejar redirección dinámica sin mismatches

import { useSession } from "next-auth/react"; // Hook para sesión en cliente
import { useRouter } from "next/navigation"; // Hook para redirección client-side
import { useEffect } from "react"; // Para ejecutar redirección post-render
import CrearReservasForm from "@/reservas/componentes/CrearReservasForm";

export default function CrearReservasPage() {
  const { data: session, status } = useSession(); // Obtiene sesión en cliente
  const router = useRouter(); // Para redirecciones suaves
   // Protecciones: redirige si no autenticado o sin negocio (fluido y sin bloqueos)
  useEffect(() => {
    if (!session?.user?.id) {
      router.push("/auth/login");
    } else if (!session.user.negocioId) {
      router.push("/dashboard");
    } else if (session.user.configReservation === true) {
      // Redirección condicional: ejecuta post-render para no interrumpir hooks
      router.push("/dashboard/reservas");
    }
  }, [session, router, status]); // Dependencias para re-ejecutar solo cuando cambia sesión/status

  // Si no redirige, renderiza el contenido (responsive y moderno)

  // Manejo de loading inicial (elegante: muestra placeholder mientras carga sesión)
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">Cargando...</div>;
  }

 
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Configura tu Módulo de Reservas</h1>
      <p className="text-gray-600 mb-8">Personaliza los horarios y reglas para que tus clientes puedan reservar fácilmente. Esto generará slots automáticos en tu perfil.</p>
      <CrearReservasForm negocioId={session?.user?.negocioId ?? ""} /> {/* Pasa ID seguro */}
    </div>
  );
}