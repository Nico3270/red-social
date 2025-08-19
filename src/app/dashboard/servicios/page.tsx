import { auth } from "@/auth.config";
import ListaServiciosNegocio from "@/servicios/componentes/ListaServiciosNegocio";
import Link from "next/link";

export default async function CrearServicioPage() {
    const session = await auth();
    if (!session || !session.user.negocioId) {
        // Si no hay sesión, redirigir al usuario a la página de inicio de sesión   
        return (
            <div className="sm:mt-40 flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Debes iniciar sesión
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Para acceder a esta página necesitas estar autenticado.
                    </p>
                    <Link
                        href='/auth/login?callbackUrl=/dashboard/servicio'
                        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 text-sm font-medium"
                        aria-label="Iniciar sesión"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        );}
    const negocioId = session.user.negocioId;

   
  return (
    <div className="max-w-7xl ">
        {/* Título */}
      <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight text-center md:text-center mb-4">
        Lista de servicios
      </h1>

      {/* Botón elegante */}
      <div className="flex justify-center md:justify-center mb-4">
        <Link
          href="/dashboard/servicios/crear"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white font-medium shadow-md hover:shadow-xl hover:scale-105 transform transition-all duration-300 ease-out"
        >
          Crear servicio
        </Link>
      </div>
      <ListaServiciosNegocio  />
    </div>
  );
}