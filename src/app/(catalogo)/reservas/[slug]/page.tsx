import { getConfigUserReservation, BusinessAvailabilityData } from "@/reservas/actions/getCongifUserReservation"; // Corrige 'getCongif' a 'getConfig' si es typo
import ReservasUserDashboard from "@/reservas/componentes/ReservasUserDashboard";
import { Metadata } from "next";
import { FaExclamationTriangle } from "react-icons/fa";
import { auth } from "@/auth.config"; // 👈 importa tu helper de NextAuth
import Link from "next/link";



// Configuración de cache: ISR para optimizar rendimiento (revalida cada 1 hora)
export const revalidate = 3600;

// SEO Dinámico: Genera metadatos basados en slug para visibilidad premium
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Reservas en ${slug.charAt(0).toUpperCase() + slug.slice(1)} | Plataforma Social-Comercial`,
    description: `Agenda citas y reservas en el negocio ${slug}. Explora horarios disponibles, reseñas y más en nuestra plataforma interactiva para emprendedores y profesionales.`,
    openGraph: {
      title: `Reservas en ${slug}`,
      description: `Configura y gestiona reservas fácilmente para ${slug}.`,
      url: `/reservas/${slug}`,
      type: "website",
      images: ["/og-image-reservas.jpg"], // Ajusta a imagen real para shares sociales
    },
  };
}

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ReservasPage({ params }: Props) {
  // ✅ obtener sesión en servidor
  const session = await auth();
  const { slug } = await params;
  let configReservation: { ok: boolean; config?: BusinessAvailabilityData } | null = null;
  let errorOccurred = false;
   

  try {
    configReservation = await getConfigUserReservation(slug);
    if (!configReservation.ok) {
      errorOccurred = true;
    }
  } catch (error) {
    console.error("Error al obtener configuración de reservas:", error);
    errorOccurred = true;
  }

  if (errorOccurred || !configReservation?.config) {
    // Mensaje de error: Elegante, moderno y premium (centrado, con icono, sombra suave y botón retry)
    return (
      <div className="sm:mt-20 flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center space-y-4 transform transition-all duration-300 hover:shadow-lg">
          <FaExclamationTriangle className="mx-auto text-yellow-500 text-5xl mb-2" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-800">Error al obtener la configuración de reservas</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            No pudimos cargar la información de reservas para este negocio. Por favor, inténtalo nuevamente o contacta al soporte si el problema persiste.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 text-sm font-medium"
            aria-label="Reintentar"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sm:mt-60 flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-4">
          <FaExclamationTriangle className="mx-auto text-red-500 text-5xl mb-2" />
          <h2 className="text-xl font-semibold text-gray-800">
            Debes iniciar sesión
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Para solicitar una reserva en este negocio necesitas estar autenticado.
          </p>
          <Link
            href={`/auth/login?callbackUrl=/reservas/${slug}`}
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 text-sm font-medium"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  // Si éxito, renderiza el dashboard con config (elegante y responsive wrapper)
  return (
    <div className="sm:mt-60 p-4 sm:p-8 bg-gray-50 min-h-screen">
      <ReservasUserDashboard config={configReservation.config}  />
    </div>
  );
}