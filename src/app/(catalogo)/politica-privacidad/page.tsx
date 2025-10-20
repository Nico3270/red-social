import { Metadata } from "next";
import React from "react";
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad - Myckeo',
  description: 'Detalles sobre cómo recopilamos, usamos y protegemos tus datos en Myckeo, operado por CÓDEX SOLUTIONS S.A.S.',
  openGraph: {
    title: 'Política de Privacidad de Myckeo',
    description: 'Compromiso con la privacidad en nuestra plataforma social-comercial, operada por CÓDEX SOLUTIONS S.A.S.',
    url: 'https://www.myckeo.com/politica-privacidad', // Reemplaza con tu dominio real
    type: 'website',
  },
};

export default function PoliticaPrivacidad() {
  return (
    <section className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 sm:mt-40">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-8 md:p-12 text-gray-800 transition-all duration-300 overflow-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Política de Privacidad de Myckeo
        </h1>

        <p className="mb-6 text-gray-700 prose prose-sm sm:prose lg:prose-lg">
          En Myckeo (operado por CÓDEX SOLUTIONS S.A.S.) valoramos y respetamos tu privacidad. Esta Política explica
          cómo recopilamos, usamos, almacenamos y protegemos tu información
          personal al usar nuestra plataforma. Cumplimos con la Ley 1581 de 2012
          (Colombia), el Reglamento General de Protección de Datos (RGPD) de la
          Unión Europea y la Ley General de Protección de Datos (LGPD) de Brasil.
        </p>

        {/* 1. Información que recopilamos */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          1. Información que recopilamos
        </h2>
        <p className="text-gray-700 mb-3">
          Recopilamos la información necesaria para ofrecerte nuestros servicios:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Datos de registro: nombre, apellido, nombre de usuario, correo electrónico y contraseña.</li>
          <li>Información de perfil: ubicación, descripción, imagen de perfil y productos publicados.</li>
          <li>Datos de interacción: comentarios, mensajes, reseñas y actividad dentro de la plataforma.</li>
          <li>Información técnica: dirección IP, navegador, sistema operativo, país, dispositivo y datos de sesión.</li>
          <li>Cookies y tecnologías similares para mejorar tu experiencia de navegación.</li>
        </ul>

        {/* 2. Finalidad del tratamiento */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          2. Finalidad del tratamiento de los datos
        </h2>
        <p className="text-gray-700 mb-4">
          Utilizamos tus datos personales para los siguientes fines:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Gestionar tu cuenta y permitirte usar las funciones de Myckeo.</li>
          <li>Permitir la publicación, visualización y venta de productos.</li>
          <li>Mejorar la experiencia de usuario mediante análisis y optimización.</li>
          <li>Enviar notificaciones, actualizaciones o información relevante de tu cuenta.</li>
          <li>Garantizar la seguridad, prevenir fraudes y cumplir con obligaciones legales.</li>
        </ul>

        {/* 3. Base legal del tratamiento */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          3. Base legal del tratamiento
        </h2>
        <p className="text-gray-700 mb-4">
          Tratamos tus datos personales con base en las siguientes legitimaciones:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Tu consentimiento explícito al registrarte o usar la Plataforma.</li>
          <li>La necesidad contractual para prestarte nuestros servicios.</li>
          <li>Intereses legítimos de Myckeo, como mejorar la experiencia o prevenir fraudes.</li>
          <li>El cumplimiento de obligaciones legales aplicables.</li>
        </ul>

        {/* 4. Política de cookies */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          4. Uso de cookies y tecnologías similares
        </h2>
        <p className="text-gray-700 mb-4">
          Myckeo utiliza cookies para mejorar tu experiencia. Estas pueden incluir:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <strong>Cookies técnicas:</strong> necesarias para el funcionamiento del sitio.
          </li>
          <li>
            <strong>Cookies de análisis:</strong> nos ayudan a entender cómo navegas y mejorar nuestros servicios.
          </li>
          <li>
            <strong>Cookies de preferencias:</strong> guardan tus ajustes, como idioma o modo oscuro.
          </li>
        </ul>
        <p className="text-gray-700 mt-2">
          Puedes configurar o eliminar las cookies desde la configuración de tu navegador. 
          Más información en nuestra <Link href="/politica-cookies" className="text-blue-600 underline">Política de Cookies</Link>.
        </p>

        {/* 5. Transferencias internacionales */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          5. Transferencias internacionales de datos
        </h2>
        <p className="text-gray-700 mb-4">
          Algunos datos pueden ser procesados por proveedores ubicados fuera de tu país, 
          como Cloudinary (EE. UU.), Google o Vercel. Garantizamos que estas transferencias 
          se realizan bajo mecanismos legales adecuados, como cláusulas contractuales tipo o 
          acuerdos de nivel de protección equivalente.
        </p>

        {/* 6. Plazo de conservación */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          6. Plazo de conservación de los datos
        </h2>
        <p className="text-gray-700 mb-4">
          Conservamos tus datos personales mientras mantengas activa tu cuenta o según 
          sea necesario para cumplir las finalidades descritas. Puedes solicitar la 
          eliminación de tus datos en cualquier momento.
        </p>

        {/* 7. Derechos del usuario */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          7. Derechos del usuario
        </h2>
        <p className="text-gray-700 mb-3">
          Tienes derecho a:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Acceder, rectificar o eliminar tus datos personales.</li>
          <li>Oponerte o limitar el tratamiento de tus datos.</li>
          <li>Solicitar la portabilidad de tus datos a otro servicio.</li>
          <li>Retirar tu consentimiento en cualquier momento.</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Puedes ejercer estos derechos escribiendo a{" "}
          <a href="mailto:soporte@myckeo.com" className="text-blue-600 underline">
            soporte@myckeo.com
          </a>.
        </p>

        {/* 8. Seguridad de la información */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          8. Seguridad de la información
        </h2>
        <p className="text-gray-700 mb-4">
          Implementamos medidas técnicas y organizativas adecuadas para proteger tu información, 
          incluyendo cifrado de contraseñas, conexiones seguras (HTTPS) y servidores protegidos. 
          Sin embargo, ningún sistema es completamente infalible, por lo que no podemos garantizar 
          seguridad absoluta.
        </p>

        {/* 9. Responsable del tratamiento */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          9. Responsable del tratamiento
        </h2>
        <p className="text-gray-700 mb-4">
          Responsable: <strong>CÓDEX SOLUTIONS S.A.S.</strong> <br />
          NIT: 901.912.004-1 <br />
          Email: <a href="mailto:soporte@myckeo.com" className="text-blue-600 underline">myckeo.web@gmail.com</a> <br />
          Teléfono: 3182293083 <br />
          Dirección: Cl 71 No. 55 42, Bogotá D.C., Colombia
        </p>

        {/* 10. Actualizaciones */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          10. Cambios en esta Política
        </h2>
        <p className="text-gray-700 mb-4">
          Nos reservamos el derecho de modificar esta Política de Privacidad en cualquier momento. 
          Cualquier cambio será publicado en esta misma página con su fecha de actualización. 
          Te recomendamos revisarla periódicamente.
        </p>

        {/* 11. Aceptación */}
        <h2 className="text-2xl font-semibold mb-3 mt-8 text-gray-900">
          11. Aceptación
        </h2>
        <p className="text-gray-700">
          Al registrarte o utilizar nuestros servicios, confirmas que has leído, comprendido 
          y aceptas esta Política de Privacidad.
        </p>

        <footer className="mt-12 border-t pt-6 text-center text-sm text-gray-500">
          <p>Enlaces relacionados:</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Link href="/terminos-servicio" className="text-blue-600 hover:underline" aria-label="Términos de Servicio">
              Términos de Servicio
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