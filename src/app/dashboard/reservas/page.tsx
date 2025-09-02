'use client'; // Esto hace que sea un client component

import { useSession } from 'next-auth/react'; // Si usas NextAuth; ajusta si es otro provider
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ReservasDashboard } from '@/reservas/componentes/ReservasDashboard';

export default function ReservasPage() {
  const { data: session, status } = useSession(); // Obtiene la sesión en el cliente
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Espera a que la sesión cargue

    if (!session?.user?.negocioId) {
      router.replace('/unauthorized'); // Usa replace para redirección limpia
      return;
    }

    if (!session?.user?.configReservation) {
      router.replace('/dashboard/reservas/crear');
      return;
    }
  }, [session, status, router]); // Dependencias para re-ejecutar si cambia la sesión

  // Muestra un loader mientras carga la sesión (opcional, para mejor UX)
  if (status === 'loading' || !session) {
    return <div>Cargando...</div>;
  }

  // Solo renderiza si pasa las validaciones (ya manejadas en useEffect)
  return (
    <div>
      <ReservasDashboard negocioId={session.user!.negocioId!} />

    </div>
  );
}