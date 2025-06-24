

import Image from "next/image";
import Link from "next/link";
import { InfoEmpresa as empresa } from "@/config/config";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
export default function NotAuthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 px-6">
      <div className="max-w-md text-center">
        <Image
          src={empresa.imagenesPlaceholder.noAutorizado}
          alt="Not Authorized Illustration"
          width={400}
          height={400}
          className="mb-6"
        />
        <h1 className="text-3xl font-bold mb-4">Oops! Acceso Restringido</h1>
        <p className="text-lg text-gray-600 mb-6">
          Necesitas ser administrador para acceder a esta sección. Sin embargo,
          ¡puedes explorar las diferentes secciones y productos disponibles!
        </p>
        <Link
          href="/"
          className="inline-block bg-[#7E1891] text-white px-6 py-3 rounded-lg font-medium text-lg shadow-md hover:bg-[#E73879] transition-all"
        >
          Ir a la página principal
        </Link>
      </div>
    </div>
  );
}
