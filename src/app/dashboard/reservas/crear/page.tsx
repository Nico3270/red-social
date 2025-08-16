// /dashboard/reservas/crear/page.tsx
import { auth } from "@/auth.config"; // Tu auth
import { redirect } from "next/navigation";
import { motion } from "framer-motion";
import CrearReservasForm from "@/reservas/componentes/CrearReservasForm";


export default async function CrearReservasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login"); // Protege ruta

    if (!session.user.negocioId) redirect("/dashboard"); // Asegúrate de que tenga negocio

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
    
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Configura tu Módulo de Reservas</h1>
        <p className="text-gray-600 mb-8">Personaliza los horarios y reglas para que tus clientes puedan reservar fácilmente. Esto generará slots automáticos en tu perfil.</p>
        <CrearReservasForm negocioId={session.user.negocioId} /> {/* Pasa ID del negocio desde session */}
      
    </div>
  );
}