"use server";

import {
  TemplateBuilders,
  TemplateVariables,
} from "@/servicios/whatsapp/buildTemplateMessage";
import { getInfoNegocioWhatsapp } from "../actions/getInfoNegocioWhatsapp";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";
import { sendWhatsAppMessage } from "./sendWhatsAppMessage";
import { sendWhatsApp } from "@/servicios/whatsapp/sender";

/* ========================================================================
   CONFIGURACIÓN
======================================================================== */
const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY ?? "";
const MYCKEO_ADMIN_BASE =
  process.env.MYCKEO_ADMIN_URL ?? "https://myckeo-admin.vercel.app";

if (!ADMIN_KEY) throw new Error("Falta MYCKEO_ADMIN_KEY");

/* ========================================================================
   CONSTANTES
======================================================================== */
const FALLBACK_COMENTARIOS_ADICIONALES = "Sin comentarios adicionales";

/* ========================================================================
   TIPOS DE RETORNO
======================================================================== */
interface NotifyResult {
  ok: boolean;
  free: boolean;
  message: string | null;
  errorMessage: string | null;
  result: unknown;
}

/* ========================================================================
   PROPS
======================================================================== */
interface NotifyReservaConfirmadaClienteProps {
  to: string;
  nombre_cliente?: string;
  telefono_cliente?: string;
  fechaHora?: string;
  fecha_anterior?: string;
  fecha_nueva?: string;
  enlace_cancelar?: string;
  descripcion?: string;
  template: PlantillaWhatsApp;
  negocioId: string;
  datos_pedido?: string;
  valor_compra?: string;
  direccion?: string;
  ciudad?: string;
}

// Interfaz para la respuesta de la ventana de 24h
interface WindowResponse {
  isOpen: boolean;
}

/* ========================================================================
   HELPERS
======================================================================== */
function normalizeText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/* ========================================================================
   FUNCIÓN PRINCIPAL
======================================================================== */
export async function notifyReservaConfirmadaCliente(
  props: NotifyReservaConfirmadaClienteProps
): Promise<NotifyResult> {
  console.log("notifyReservaConfirmadaCliente() llamado con props:", props);

  try {
    const {
      to,
      nombre_cliente,
      telefono_cliente,
      fechaHora,
      fecha_anterior,
      fecha_nueva,
      enlace_cancelar,
      template,
      descripcion,
      negocioId,
      datos_pedido,
      valor_compra,
      direccion,
      ciudad,
    } = props;

    const descripcionNormalizada =
      template === PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO
        ? normalizeText(descripcion) || FALLBACK_COMENTARIOS_ADICIONALES
        : typeof descripcion === "string"
        ? descripcion
        : "";

    /* ============================================================
       1. INFO DEL NEGOCIO
    ============================================================ */
    console.log("Obteniendo información del negocio:", negocioId);

    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);

    console.log("negocioInfo:", negocioInfo);

    if (!negocioInfo) throw new Error("Información del negocio no encontrada");

    const slugNegocio = negocioInfo.slugNegocio;
    const reservas_negocio = `https://myckeo.com/reservas/${slugNegocio}`;
    const nombre_negocio = negocioInfo.nombreNegocio || "Negocio Desconocido";
    const enlace_reserva = "https://myckeo.com/dashboard/reservas";

    /* ============================================================
       2. VALIDAR TELÉFONO
    ============================================================ */
    console.log("Validando teléfono:", to);

    const normalizedTo = normalizeText(to);

    if (!normalizedTo.startsWith("+") || !/^\+\d{10,15}$/.test(normalizedTo)) {
      throw new Error("Número inválido (E.164 requerido)");
    }

    /* ============================================================
       3. ARMAR VARIABLES PARA LA PLANTILLA
    ============================================================ */
    console.log("Construyendo variables para plantilla:", template);

    let variables: string[] = [];
    let placeholderNames: string[] = [];
    let languageCode = "es";

    switch (template) {
      case PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE:
        if (!nombre_cliente || !fechaHora || !enlace_cancelar)
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          fechaHora,
          enlace_cancelar,
          descripcionNormalizada ?? "",
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_hora",
          "enlace_cancelar",
          "descripcion",
        ];
        break;

      case PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA:
        if (!nombre_cliente || !telefono_cliente || !fechaHora)
          throw new Error("Datos incompletos");
        variables = [
          nombre_negocio,
          nombre_cliente,
          telefono_cliente,
          fechaHora,
          enlace_reserva,
        ];
        placeholderNames = [
          "nombre_negocio",
          "nombre_cliente",
          "telefono_cliente",
          "fecha_hora",
          "enlace_reserva",
        ];
        languageCode = "es_CO";
        break;

      case PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO:
        if (!nombre_cliente || !fechaHora) throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          fechaHora,
          reservas_negocio,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_hora",
          "reservas_negocio",
        ];
        break;

      case PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO:
        if (!nombre_cliente || !fechaHora || !telefono_cliente)
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          fechaHora,
          telefono_cliente,
          enlace_reserva,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_hora",
          "telefono_cliente",
          "enlace_reserva",
        ];
        break;

      case PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO:
        if (
          !nombre_cliente ||
          !fecha_anterior ||
          !fecha_nueva ||
          !enlace_cancelar
        )
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          fecha_anterior,
          fecha_nueva,
          enlace_cancelar,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_anterior",
          "fecha_nueva",
          "enlace_cancelar",
        ];
        break;

      case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO:
        if (
          !valor_compra ||
          !datos_pedido ||
          !nombre_cliente ||
          !telefono_cliente ||
          !direccion
        )
          throw new Error("Datos incompletos");
        variables = [
          nombre_negocio,
          datos_pedido,
          valor_compra,
          nombre_cliente,
          telefono_cliente,
          direccion,
          descripcionNormalizada,
        ];
        placeholderNames = [
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
          "nombre_cliente",
          "telefono_cliente",
          "direccion",
          "descripcion",
        ];
        break;

      case PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO:
        if (
          !valor_compra ||
          !datos_pedido ||
          !nombre_cliente ||
          !direccion ||
          !ciudad
        )
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          datos_pedido,
          valor_compra,
          direccion,
          ciudad,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
          "direccion",
          "ciudad",
        ];
        break;

      case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO:
        if (!nombre_cliente || !datos_pedido || !valor_compra || !direccion)
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          datos_pedido,
          valor_compra,
          direccion,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
          "direccion",
        ];
        break;

      case PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO:
        if (!nombre_cliente || !datos_pedido || !valor_compra)
          throw new Error("Datos incompletos");
        variables = [
          nombre_cliente,
          nombre_negocio,
          datos_pedido,
          valor_compra,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
        ];
        break;

      default:
        throw new Error("Plantilla no reconocida");
    }

    console.log("variables:", variables);
    console.log("placeholderNames:", placeholderNames);

    if (variables.some((v) => !v || v.trim() === "")) {
      console.error("Variables inválidas:", variables);
      throw new Error("Variables vacías o inválidas");
    }

    /* ============================================================
       4. VERIFICAR VENTANA 24H
    ============================================================ */
    console.log("Revisando ventana de 24h...");
    console.log("Teléfono destino:", normalizedTo);
    console.log("ADMIN_KEY (últimos 6):", ADMIN_KEY.slice(-6));

    let isWindowOpen = false;
    let windowCheckOk = false;
    let windowRawResponse = "";
    let windowJsonResponse: WindowResponse | null = null;

    try {
      const requestBody = JSON.stringify({ phone: normalizedTo, key: ADMIN_KEY });
      console.log("Enviando POST a /api/whatsapp/window");
      console.log("URL:", `${MYCKEO_ADMIN_BASE}/api/whatsapp/window`);
      console.log("Body:", requestBody);

      const response = await fetch(`${MYCKEO_ADMIN_BASE}/api/whatsapp/window`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
      });

      windowRawResponse = await response.text();

      console.log("Respuesta RAW completa de /api/whatsapp/window:");
      console.log(windowRawResponse);
      console.log("Status HTTP:", response.status, response.statusText);

      if (response.ok && windowRawResponse.trim().length > 0) {
        try {
          windowJsonResponse = JSON.parse(windowRawResponse) as WindowResponse;
          console.log("JSON parseado correctamente:", windowJsonResponse);

          isWindowOpen = windowJsonResponse.isOpen === true;
          windowCheckOk = true;
        } catch (parseErr) {
          console.error(
            "Error parseando JSON de ventana:",
            (parseErr as Error).message
          );
          console.error("Contenido recibido:", windowRawResponse);
        }
      } else {
        console.error("Error HTTP en ventana 24h");
        console.error("Status:", response.status);
        console.error("Body:", windowRawResponse);
      }
    } catch (err) {
      console.error(
        "Error de red al consultar ventana 24h:",
        (err as Error).message
      );
    }

    /* ============================================================
       5. SI HAY VENTANA → MENSAJE GRATIS
    ============================================================ */

    const extras = {
      nombre_cliente,
      telefono_cliente,
      datos_pedido,
      valor_compra,
      direccion,
      ciudad,
      descripcion: descripcionNormalizada,
      fechaHora,
      fecha_anterior,
      fecha_nueva,
      enlace_cancelar,
      nombre_negocio,
      slugNegocio,
    };

    if (windowCheckOk && isWindowOpen) {
      console.log("Ventana ABIERTA → Enviando mensaje GRATIS");

      const builder =
        TemplateBuilders[template as keyof typeof TemplateBuilders];

      if (!builder) {
        throw new Error("No existe builder para la plantilla");
      }

      const messageText = builder({
        nombre_cliente,
        nombre_negocio,
        telefono_cliente,
        fecha_hora: fechaHora,
        fecha_anterior,
        fecha_nueva,
        enlace_cancelar,
        enlace_reserva,
        reservas_negocio,
        datos_pedido,
        valor_compra,
        direccion,
        ciudad,
        descripcion: descripcionNormalizada,
      } as TemplateVariables);

      console.log("Texto generado GRATIS:");
      console.log(messageText);

      const freeRes = await sendWhatsApp({ to: normalizedTo, text: messageText });

      console.log("Resultado envío GRATIS:", freeRes);

      await fetch(`${MYCKEO_ADMIN_BASE}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          eventType: template,
          phone: normalizedTo,
          content: messageText,
          data: {
            free: true,
            placeholders: variables,
            extras,
          },
        }),
      });

      return {
        ok: true,
        free: true,
        message: messageText,
        errorMessage: null,
        result: freeRes,
      };
    }

    /* ============================================================
       6. SIN VENTANA → PLANTILLA PAGA
    ============================================================ */
    console.log("Ventana CERRADA o fallo en API → Enviando PLANTILLA PAGA");

    const paidRes = await sendWhatsAppMessage({
      to: normalizedTo,
      templateName: template,
      placeholderNames,
      variables,
      ttl: 1800,
      languageCode,
    });

    console.log("Resultado PLANTILLA:", paidRes);

    await fetch(`${MYCKEO_ADMIN_BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        eventType: template,
        phone: normalizedTo,
        content: null,
        data: {
          free: false,
          placeholders: variables,
          extras,
        },
      }),
    });

    return {
      ok: true,
      free: false,
      message: null,
      errorMessage: null,
      result: paidRes,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";

    console.error("ERROR en notifyReservaConfirmadaCliente:", msg);
    if (err instanceof Error) console.error("Stack:", err.stack);

    return {
      ok: false,
      free: false,
      message: null,
      errorMessage: msg,
      result: null,
    };
  }
}