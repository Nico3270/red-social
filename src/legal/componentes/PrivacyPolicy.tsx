import { privacyPolicyForm as form } from "@/config/config";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-4xl font-bold text-center mb-8">
        Política de Privacidad
      </h1>

      {/* 1. Introducción */}
      <p className="mb-8">
        En <strong>{form.empresa.nombre}</strong>, nos comprometemos a proteger tu privacidad y cumplir con la normativa vigente.
        Esta política explica cómo recopilamos, usamos y protegemos tu información personal.
      </p>

      {/* 2. Información Recopilada */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">1. Información Recopilada</h2>
        <p><strong>Datos Personales:</strong> {form.informacionRecopilada.datosPersonales}</p>
        <p><strong>Datos de Navegación:</strong> {form.informacionRecopilada.datosNavegacion}</p>
        {form.informacionRecopilada.cookies ? (
          <p>Utilizamos cookies para mejorar la experiencia de usuario y recopilar datos estadísticos.</p>
        ) : (
          <p>No utilizamos cookies en nuestro sitio web.</p>
        )}
        <p><strong>Servicios de Terceros:</strong> {form.informacionRecopilada.serviciosTerceros}</p>
      </section>

      {/* 3. Uso de la Información */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">2. Uso de la Información</h2>
        <p>{form.usoInformacion.propositos}</p>
        {form.usoInformacion.marketing && (
          <p>La información se puede usar para fines de marketing directo y envío de promociones.</p>
        )}
        {form.usoInformacion.publicidadTerceros ? (
          <p>Tu información puede ser compartida con terceros con fines publicitarios.</p>
        ) : (
          <p>No compartimos tu información con terceros para fines publicitarios.</p>
        )}
      </section>

      {/* 4. Seguridad */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">3. Seguridad de la Información</h2>
        <p><strong>Medidas de Seguridad:</strong> {form.seguridad.medidas}</p>
        <p><strong>Almacenamiento de Datos:</strong> {form.seguridad.almacenamiento}</p>
        <p><strong>Retención de Datos:</strong> {form.seguridad.retencion}</p>
      </section>

      {/* 5. Derechos del Usuario */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">4. Derechos del Usuario</h2>
        <ul className="list-disc pl-6">
          {form.derechosUsuario.acceso && <li>Derecho a acceder a tus datos personales.</li>}
          {form.derechosUsuario.rectificacion && <li>Derecho a corregir o modificar tus datos personales.</li>}
          {form.derechosUsuario.eliminacion && <li>Derecho a solicitar la eliminación de tus datos.</li>}
          {!form.derechosUsuario.portabilidad && (
            <li>No se permite la portabilidad de datos a otras plataformas.</li>
          )}
        </ul>
      </section>

      {/* 6. Uso de Cookies */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">5. Uso de Cookies</h2>
        {form.cookies.usoCookies ? (
          <p>{form.cookies.tipoCookies}. {form.cookies.desactivacion}</p>
        ) : (
          <p>No utilizamos cookies en nuestro sitio web.</p>
        )}
      </section>

      {/* 7. Modificaciones */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">6. Modificaciones de la Política</h2>
        <p>Esta política se actualiza {form.cambiosPolitica.actualizaciones}. Los cambios serán notificados por {form.cambiosPolitica.notificacion}.</p>
      </section>

    
      {/* 8. Contacto */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold">8. Contacto</h2>
        <p>Para cualquier pregunta o solicitud sobre esta política, puedes contactarnos a través de:</p>
        <ul className="list-disc pl-6">
          <li>Email: {form.empresa.emailContacto}</li>
          <li>Teléfono: {form.empresa.telefono}</li>
          <li>Dirección: {form.empresa.direccion}</li>
        </ul>
      </section>

      <p className="text-sm text-gray-500 mt-10 text-center">
        Última actualización: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
