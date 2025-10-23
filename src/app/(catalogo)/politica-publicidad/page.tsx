import { Metadata } from 'next';
import Link from 'next/link';
import React from "react";

export const metadata: Metadata = {
  title: 'Política de Publicidad - Myckeo',
  description: 'Cómo gestionamos la publicidad en la plataforma Myckeo, operado por CÓDEX SOLUTIONS S.A.S.',
  openGraph: {
    title: 'Política de Publicidad de Myckeo',
    description: 'Reglas y transparencia sobre publicidad en nuestra plataforma, operada por CÓDEX SOLUTIONS S.A.S.',
    url: 'https://www.myckeo.com/politica-publicidad', // Reemplaza con tu dominio
    type: 'website',
  },
};

export default function PoliticaPublicidad() {
  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 sm:mt-40">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-12 text-gray-800 transition-all duration-300 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Política de Publicidad de Myckeo
        </h1>

        <p className="mb-6 text-gray-700 prose prose-sm sm:prose lg:prose-lg">
          En Myckeo (operado por CÓDEX SOLUTIONS S.A.S.), implementaremos publicidad en el futuro para apoyar nuestra sostenibilidad y ofrecer valor a los negocios. Esta política explica cómo gestionaremos los anuncios, garantizando transparencia y cumplimiento con regulaciones como la Ley 1581 de 2012 (Colombia), RGPD y LGPD.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Última actualización: 20 de octubre de 2025
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          1. Tipos de Publicidad
        </h2>
        <p className="text-gray-700 mb-4">
          Planeamos ofrecer:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>Publicaciones Destacadas:</strong> Productos o publicaciones de negocios destacados en feeds.</li>
          <li><strong>Anuncios en Feed:</strong> Promociones basadas en categorías de negocios.</li>
          <li><strong>Publicidad Externa (Futura):</strong> Si integramos plataformas como Google Ads.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          2. Transparencia y Control
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Anuncios estarán claramente etiquetados como &quot;Patrocinado&quot;.</li>
          <li>Los negocios pueden pagar por visibilidad, con métricas transparentes (vistas, clics).</li>
          <li>Los usuarios pueden optar por no ver anuncios personalizados en su perfil.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          3. Datos para Publicidad
        </h2>
        <p className="text-gray-700 mb-4">
          Usaremos datos anónimos (ej. categorías de interés, interacciones) para targeting. No usaremos datos sensibles (edad, género) sin consentimiento explícito.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          4. Prohibiciones
        </h2>
        <p className="text-gray-700 mb-4">
          No permitimos anuncios engañosos, ilegales o que violen nuestros valores.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          5. Cambios en la Política
        </h2>
        <p className="text-gray-700 mb-4">
          Actualizaremos esta política según sea necesario. Los cambios se publicarán aquí.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          6. Contacto
        </h2>
        <p className="text-gray-700">
          Para preguntas, contacta a <Link href="mailto:soporte@myckeo.com" className="text-blue-600 underline">soporte@myckeo.com</Link> <br />. Responsable: CÓDEX SOLUTIONS S.A.S., Bogotá D.C., Colombia, NIT: 901.912.004-1.
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
            <Link href="/terminos-servicio" className="text-blue-600 hover:underline" aria-label="Términos de Servicio">
              Términos de Servicio
            </Link>
          </div>
          <p className="mt-4">Última actualización: 20 de octubre de 2025</p>
        </footer>
      </div>
    </section>
  );
}