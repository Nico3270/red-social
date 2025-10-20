import { Metadata } from 'next';
import Link from 'next/link';
import React from "react";

export const metadata: Metadata = {
  title: 'Términos de Servicio - Myckeo',
  description: 'Reglas y condiciones para usar la plataforma Myckeo, operado por CÓDEX SOLUTIONS S.A.S.',
  openGraph: {
    title: 'Términos de Servicio de Myckeo',
    description: 'Condiciones de uso para nuestra plataforma social-comercial, operada por CÓDEX SOLUTIONS S.A.S.',
    url: 'https://www.myckeo.com/terminos-servicio', // Reemplaza con tu dominio
    type: 'website',
  },
};

export default function TerminosServicio() {
  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 sm:mt-40">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-12 text-gray-800 transition-all duration-300 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Términos de Servicio de Myckeo
        </h1>

        <p className="mb-6 text-gray-700 prose prose-sm sm:prose lg:prose-lg">
          Bienvenido a Myckeo (operado por CÓDEX SOLUTIONS S.A.S.). Estos Términos de Servicio regulan el uso de nuestra plataforma social-comercial. Al registrarte o usar nuestros servicios, aceptas estas condiciones. Si no estás de acuerdo, no uses la plataforma.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Última actualización: 20 de octubre de 2025
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          1. Uso de la Plataforma
        </h2>
        <p className="text-gray-700 mb-4">
          Myckeo permite crear perfiles de negocio, publicar productos, reseñas y contenido social. Debes:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Ser mayor de 18 años.</li>
          <li>Proporcionar información veraz y actualizada.</li>
          <li>No publicar contenido ilegal, ofensivo o engañoso.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          2. Responsabilidades del Usuario
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Eres responsable de la seguridad de tu cuenta y contraseña.</li>
          <li>No uses la plataforma para fines ilegales o no autorizados.</li>
          <li>No interfieras con la funcionalidad de la plataforma (ej. ataques DDoS).</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          3. Propiedad Intelectual
        </h2>
        <p className="text-gray-700 mb-4">
          El contenido que publicas (productos, reseñas, publicaciones) sigue siendo tuyo, pero otorgas a Myckeo (operado por CÓDEX SOLUTIONS S.A.S.) una licencia no exclusiva para mostrarlo en la plataforma. CÓDEX SOLUTIONS S.A.S. posee los derechos sobre su software y diseño.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          4. Terminación de Cuentas
        </h2>
        <p className="text-gray-700 mb-4">
          Podemos suspender o eliminar cuentas por violaciones de estos términos, como contenido inapropiado o fraudes.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          5. Limitación de Responsabilidad
        </h2>
        <p className="text-gray-700 mb-4">
          Myckeo (operado por CÓDEX SOLUTIONS S.A.S.) no se responsabiliza por daños indirectos o pérdidas derivadas del uso de la plataforma. Los servicios se ofrecen &quot;tal cual&quot;.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          6. Cambios en los Términos
        </h2>
        <p className="text-gray-700 mb-4">
          Podemos actualizar estos términos. Los cambios se publicarán aquí, y te notificaremos si son significativos.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          7. Contacto
        </h2>
        <p className="text-gray-700">
          Para preguntas, contacta a <a href="mailto:soporte@myckeo.com" className="text-blue-600 underline" aria-label="Contactar soporte">soporte@myckeo.com</a>. Responsable: CÓDEX SOLUTIONS S.A.S., Bogotá D.C., Colombia, NIT: 901.912.004-1.
        </p>

        <footer className="mt-12 border-t pt-6 text-center text-sm text-gray-500">
          <p>Enlaces relacionados:</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Link href="/politica-privacidad" className="text-blue-600 hover:underline" aria-label="Política de Privacidad">
              Política de Privacidad
            </Link>
            <Link href="/politica-cookies" className="text-blue-600 hover:underline" aria-label="Política de Cookies">
              Política de Cookies
            </Link>
            <Link href="/politica-publicidad" className="text-blue-600 hover:underline" aria-label="Política de Publicidad">
              Política de Publicidad
            </Link>
          </div>
          <p className="mt-4">Última actualización: 20 de octubre de 2025</p>
        </footer>
      </div>
    </section>
  );
}