import { shippingPolicyForm } from "@/config/config";


export default function ShippingPolicy() {
  const {
    empresa,
    ambitoEnvio,
    costosEnvio,
    tiemposEntrega,
    mensajeria,
    seguimiento,
    politicaAusente,
    cancelaciones,
    condicionesEspeciales,
    devoluciones,
  } = shippingPolicyForm;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 bg-white shadow-lg rounded-md">
      <h1 className="text-3xl font-bold text-center text-[#17494d]">
        Política de Envíos - {empresa.nombre}
      </h1>
      <p className="text-gray-700 text-center">
        Última actualización: {new Date().toLocaleDateString()}
      </p>

      <section>
        <h2 className="text-2xl font-semibold mt-6">1. Información de Contacto</h2>
        <p>
          Para cualquier consulta o aclaración sobre nuestras políticas de envío, puedes comunicarte con nosotros:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>
            <strong>Dirección:</strong> {empresa.direccion}
          </li>
          <li>
            <strong>Teléfono:</strong> {empresa.telefono}
          </li>
          <li>
            <strong>Email:</strong> {empresa.emailContacto}
          </li>
          <li>
            <strong>Sitio web:</strong> <a href={empresa.website} className="text-blue-600 underline">{empresa.website}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">2. Ámbito de Envío</h2>
        <p>
          Realizamos envíos a <strong>{ambitoEnvio.paisesCobertura}</strong>.  
          {ambitoEnvio.internacional ? (
            " También ofrecemos envíos internacionales bajo ciertas condiciones."
          ) : (
            " No realizamos envíos internacionales en este momento."
          )}
        </p>
        {ambitoEnvio.regionesRestringidas && (
          <p className="mt-2">
            Las siguientes zonas pueden estar sujetas a restricciones de envío:{" "}
            <strong>{ambitoEnvio.regionesRestringidas}</strong>.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">3. Costos de Envío</h2>
        <p>
          {costosEnvio.envioGratis ? (
            `Ofrecemos envío gratuito para compras que superen ${costosEnvio.umbralEnvioGratis}.`
          ) : (
            `El costo estándar de envío es de ${costosEnvio.tarifaBase}.`
          )}
        </p>
        {costosEnvio.costosAdicionales && (
          <p className="mt-2">
            Pueden aplicarse costos adicionales en las siguientes condiciones:{" "}
            <strong>{costosEnvio.costosAdicionales}</strong>.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">4. Tiempos de Entrega</h2>
        <ul className="list-disc pl-6">
          <li>Entrega local: {tiemposEntrega.tiempoLocal}.</li>
          <li>Entrega nacional: {tiemposEntrega.tiempoNacional}.</li>
          <li>Entrega urgente: {tiemposEntrega.tiempoUrgente}.</li>
        </ul>
        {tiemposEntrega.entregasUrgentes && (
          <p className="mt-2">
            Ofrecemos entregas urgentes. Contacta con nosotros para más detalles.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">5. Mensajería</h2>
        <p>
          Realizamos envíos a través de {mensajeria.servicioPropio ? "nuestro propio servicio de mensajería" : "empresas aliadas como"}{" "}
          {mensajeria.empresasAliadas}.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">6. Seguimiento de Envíos</h2>
        <p>
          {seguimiento.trackingEnvios
            ? `Puedes hacer seguimiento de tu pedido a través de ${seguimiento.plataformaTracking}.`
            : "Actualmente no ofrecemos seguimiento en tiempo real para los envíos."}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">7. Ausencia en el Momento de la Entrega</h2>
        <p>
          Si no te encuentras en el momento de la entrega, realizaremos hasta{" "}
          <strong>{politicaAusente.reintentosEntrega}</strong> reintentos.{" "}
          {politicaAusente.reprogramacionGratis
            ? "Puedes reprogramar sin costo adicional."
            : `El costo de reenvío es de ${politicaAusente.costoReenvio}.`}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">8. Cancelaciones</h2>
        <p>
          {cancelaciones.cancelacionAntesEnvio
            ? "Puedes cancelar tu pedido antes de que sea enviado."
            : "No aceptamos cancelaciones una vez procesado el pedido."}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">9. Condiciones Especiales</h2>
        <p>{condicionesEspeciales.productosFragiles}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6">10. Devoluciones</h2>
        <p>
          {devoluciones.aceptanDevoluciones
            ? `Aceptamos devoluciones dentro de un plazo de ${devoluciones.plazoDevolucion} por las siguientes razones: ${devoluciones.condicionesDevolucion}.`
            : "No aceptamos devoluciones una vez recibido el producto."}
        </p>
      </section>
    </div>
  );
}
