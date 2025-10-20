import { Metadata } from 'next';
import Link from 'next/link';
import React from "react";

export const metadata: Metadata = {
  title: 'Política de Cookies - Myckeo',
  description: 'Información sobre el uso de cookies y tecnologías de almacenamiento local en Myckeo, operado por CÓDEX SOLUTIONS S.A.S.',
  openGraph: {
    title: 'Política de Cookies de Myckeo',
    description: 'Cómo usamos cookies y almacenamiento local para mejorar tu experiencia en Myckeo, operado por CÓDEX SOLUTIONS S.A.S.',
    url: 'https://www.myckeo.com/politica-cookies', // Reemplaza con tu dominio
    type: 'website',
  },
};

export default function PoliticaCookies() {
  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 sm:mt-40">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-12 text-gray-800 transition-all duration-300 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Política de Cookies de Myckeo
        </h1>

        <p className="mb-6 text-gray-700 prose prose-sm sm:prose lg:prose-lg">
          En Myckeo (operado por CÓDEX SOLUTIONS S.A.S.) usamos cookies y tecnologías de almacenamiento local (como localStorage) para mejorar tu experiencia, gestionar tu sesión y ofrecer funcionalidades personalizadas. Esta política explica qué son estas tecnologías, cómo las usamos y cómo puedes controlarlas. Cumplimos con la Ley 1581 de 2012 (Colombia), RGPD (UE) y LGPD (Brasil).
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Última actualización: 20 de octubre de 2025
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          1. ¿Qué son las Cookies y el Almacenamiento Local?
        </h2>
        <p className="text-gray-700 mb-4">
          Las cookies son pequeños archivos que se almacenan en tu dispositivo para recordar preferencias o datos de navegación. El almacenamiento local (localStorage) es una tecnología similar que usamos para guardar datos como tu dirección, productos favoritos o reservas directamente en tu navegador, permitiendo que la información persista entre sesiones sin necesidad de cookies tradicionales.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          2. ¿Qué Tecnologías Usamos?
        </h2>
        <p className="text-gray-700 mb-3">
          En Myckeo, utilizamos principalmente:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <strong>Almacenamiento Local (localStorage):</strong> Guardamos datos como tu dirección, productos favoritos, información de reservas y preferencias de usuario para mantener el estado entre rutas y ofrecer una experiencia fluida.
          </li>
          <li>
            <strong>Cookies Técnicas:</strong> Si implementamos autenticación persistente o analíticas, usamos cookies esenciales para gestionar sesiones (vía NextAuth) o medir el uso anónimo de la plataforma.
          </li>
          <li>
            <strong>Cookies de Terceros (Futuras):</strong> Si integramos herramientas como Google Analytics o publicidad, estas podrían usar cookies para análisis o personalización.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          3. Finalidad de las Tecnologías
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Funcionalidad: Mantener tu sesión activa y recordar datos entre páginas (ej. favoritos, reservas).</li>
          <li>Personalización: Adaptar la experiencia según tus preferencias (ej. idioma, modo oscuro).</li>
          <li>Seguridad: Proteger tu cuenta y prevenir accesos no autorizados.</li>
          <li>Análisis (futuro): Mejorar la plataforma con datos anónimos de uso.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          4. Gestión de Cookies y Almacenamiento Local
        </h2>
        <p className="text-gray-700 mb-4">
          Puedes controlar estas tecnologías:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <strong>Navegador:</strong> Borra cookies y localStorage desde la configuración de tu navegador (ej. Chrome &gt; Privacidad y Seguridad &gt; Borrar datos de navegación).
          </li>
          <li>
            <strong>Consentimiento:</strong> Al usar Myckeo, aceptas el uso de almacenamiento local esencial. Puedes desactivar cookies no esenciales (si las implementamos) en nuestro banner de consentimiento.
          </li>
          <li>
            <strong>Opt-out:</strong> Contacta a <a href="mailto:soporte@myckeo.com" className="text-blue-600 underline" aria-label="Contactar soporte">soporte@myckeo.com</a> para limitar el uso de datos no esenciales.
          </li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          5. Cambios en la Política
        </h2>
        <p className="text-gray-700 mb-4">
          Podemos actualizar esta política. Los cambios se publicarán aquí, con la fecha de actualización. Te recomendamos revisarla periódicamente.
        </p>

        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          6. Contacto
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
            <Link href="/terminos-servicio" className="text-blue-600 hover:underline" aria-label="Términos de Servicio">
              Términos de Servicio
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