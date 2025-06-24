import { termsAndConditionsForm } from "@/config/config";

export default function TermsAndConditions() {
  const {
    empresa,
    ambitoAplicacion,
    comprasPagos,
    enviosEntregas,
    cancelacionesDevoluciones,
    garantias,
    responsabilidadCliente,
    propiedadIntelectual,
    seguridadPrivacidad,
    modificacionesTerminos,
    extras,
  } = termsAndConditionsForm;

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-center">Términos y Condiciones</h1>
      <p className="text-center mt-4">
        Bienvenido a {empresa.nombreLegal}. Al utilizar nuestros servicios,
        aceptas los términos y condiciones aquí descritos. 
        Si tienes alguna pregunta, puedes contactarnos en{" "}
        <a href={`mailto:${empresa.emailContacto}`} className="text-blue-600 underline">
          {empresa.emailContacto}
        </a>.
      </p>

      {/* Sección de Aceptación */}
      <h2 className="text-xl font-semibold mt-8">1. Aceptación de Términos</h2>
      <p>
        Al acceder a {empresa.website}, aceptas cumplir con estos términos y condiciones. Si no estás de acuerdo con alguna parte
        de estos términos, no deberías utilizar nuestro sitio.
      </p>

      {/* Ámbito de Aplicación */}
      <h2 className="text-xl font-semibold mt-8">2. Ámbito de Aplicación</h2>
      <p>
        Ofrecemos {ambitoAplicacion.tipoProductos}. 
        {ambitoAplicacion.productosDigitales
          ? " También ofrecemos productos digitales."
          : " No ofrecemos productos digitales en este momento."}
        <br />
        Restricciones: {ambitoAplicacion.restriccionesEdad || "Sin restricciones específicas."}
      </p>

      {/* Compras y Pagos */}
      <h2 className="text-xl font-semibold mt-8">3. Compras y Pagos</h2>
      <p>
        Aceptamos pagos a través de {comprasPagos.metodosPago}, utilizando la plataforma {comprasPagos.plataformaPagos}.
        {comprasPagos.compraSinCuenta
          ? " Puedes realizar compras sin necesidad de crear una cuenta."
          : " Es necesario registrarse para realizar una compra."}
        <br />
        Las notificaciones de compra se enviarán por {comprasPagos.notificacionCompra}.
      </p>

      {/* Envíos y Entregas */}
      <h2 className="text-xl font-semibold mt-8">4. Envíos y Entregas</h2>
      <p>
        El tiempo de entrega es de {enviosEntregas.tiempoEntrega}. Utilizamos {enviosEntregas.servicioMensajeria} para nuestras entregas.
        <br />
        {enviosEntregas.ausenteEntrega}.
        El costo de envío es: {enviosEntregas.costoEnvio}.
      </p>

      {/* Cancelaciones y Devoluciones */}
      <h2 className="text-xl font-semibold mt-8">5. Cancelaciones y Devoluciones</h2>
      {cancelacionesDevoluciones.aceptaCancelaciones ? (
        <p>
          Aceptamos cancelaciones bajo las siguientes condiciones:{" "}
          {cancelacionesDevoluciones.devolucionCondiciones}. 
          Plazo para devoluciones: {cancelacionesDevoluciones.plazoDevolucion}. 
          El cliente deberá asumir el costo de envío: {cancelacionesDevoluciones.costoDevolucion}.
        </p>
      ) : (
        <p>No aceptamos cancelaciones o devoluciones en este momento.</p>
      )}

      {/* Garantías */}
      <h2 className="text-xl font-semibold mt-8">6. Garantías</h2>
      {garantias.garantiaProductos ? (
        <p>
          Ofrecemos garantía de {garantias.tiempoGarantia}. La garantía cubre {garantias.coberturaGarantia}. 
          No cubre {garantias.garantiasExcluidas}.
        </p>
      ) : (
        <p>No ofrecemos garantía para nuestros productos.</p>
      )}

      {/* Responsabilidad del Cliente */}
      <h2 className="text-xl font-semibold mt-8">7. Responsabilidad del Cliente</h2>
      <p>
        {responsabilidadCliente.verificacionDatos}. {responsabilidadCliente.advertencias}.
      </p>

      {/* Propiedad Intelectual */}
      <h2 className="text-xl font-semibold mt-8">8. Propiedad Intelectual</h2>
      {propiedadIntelectual.derechosAutor ? (
        <p>
          Todo el contenido está protegido por derechos de autor. Está {propiedadIntelectual.usoContenido}.
        </p>
      ) : (
        <p>No reclamamos derechos de autor sobre el contenido generado por usuarios.</p>
      )}

      {/* Seguridad y Privacidad */}
      <h2 className="text-xl font-semibold mt-8">9. Seguridad y Privacidad</h2>
      <p>
        Implementamos {seguridadPrivacidad.medidasSeguridad} para proteger tus datos. 
        Recopilamos: {seguridadPrivacidad.datosRecopilados}. 
        Estos datos se usan para {seguridadPrivacidad.usoDatos}.
        {seguridadPrivacidad.comparteDatos
          ? " Podemos compartir tus datos con terceros autorizados."
          : " No compartimos tus datos con terceros."}
      </p>

      {/* Modificaciones */}
      <h2 className="text-xl font-semibold mt-8">10. Modificaciones de Términos</h2>
      <p>
        Actualizamos nuestros términos cada {modificacionesTerminos.actualizacionesFrecuentes}. 
        {modificacionesTerminos.notificacionCambios}.
      </p>

      {/* Extras */}
      {extras.programaLealtad && (
        <h2 className="text-xl font-semibold mt-8">11. Programa de Lealtad</h2>
      )}
      {extras.programaLealtad && (
        <p>
          Participa en nuestro programa de lealtad. No hay límite de compra:{" "}
          {extras.maxProductosPorCliente}.
        </p>
      )}
      <p className="text-sm text-gray-500 mt-10 text-center">
        Última actualización: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
