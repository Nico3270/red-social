"use server";

import {
  TemplateBuilders,
  TemplateVariables,
} from "@/servicios/whatsapp/buildTemplateMessage";
import { sendWhatsApp } from "@/servicios/whatsapp/sender";
import { PlantillaWhatsApp } from "./interfaces/interfaces.whatsapp";
import { getInfoNegocioWhatsapp } from "./actions/getInfoNegocioWhatsapp";
import { sendWhatsAppMessage } from "./helpers/sendWhatsAppMessage";

/* ========================================================================
   CONFIGURACIÓN
======================================================================== */
const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY!;
const MYCKEO_ADMIN_BASE =
  process.env.MYCKEO_ADMIN_URL ?? "https://myckeo-admin.vercel.app";

if (!ADMIN_KEY) throw new Error("Falta MYCKEO_ADMIN_KEY");

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

/* ========================================================================
   RESPUESTA DE LA API /api/whatsapp/window
======================================================================== */
interface WhatsAppWindowResponse {
  isOpen: boolean;
  lastUserMessageAt: string | null;
  windowSecondsLeft: number;
  reason: "OPEN" | "CLOSED" | "PERSON_NOT_FOUND" | "NO_CONVERSATION" | "NO_USER_MESSAGES";
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

    /* ============================================================
       1. INFO DEL NEGOCIO
    ============================================================ */
    console.log("Obteniendo información del negocio:", negocioId);

    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);

    if (!negocioInfo) throw new Error("Información del negocio no encontrada");

    const slugNegocio = negocioInfo.slugNegocio;
    const nombre_negocio = negocioInfo.nombreNegocio || "Negocio Desconocido";

    const reservas_negocio = `https://myckeo.com/reservas/${slugNegocio}`;
    const enlace_reserva = "https://myckeo.com/dashboard/reservas";

    /* ============================================================
       2. VALIDAR TELÉFONO
    ============================================================ */
    if (!to.startsWith("+") || !/^\+\d{10,15}$/.test(to)) {
      throw new Error("Número inválido (E.164 requerido)");
    }

    /* ============================================================
       3. ARMAR VARIABLES PARA LA PLANTILLA
    ============================================================ */
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
          descripcion ?? "",
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
          !descripcion ||
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
          descripcion,
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

    if (variables.some((v) => !v || v.trim() === "")) {
      throw new Error("Variables vacías o inválidas");
    }

    /* ============================================================
       4. VERIFICAR VENTANA 24H
    ============================================================ */
    let is24hWindowOpen = false;
    let windowCheckOk = false;
    let window24hResponse: WhatsAppWindowResponse | null = null;

    try {
      const response = await fetch(`${MYCKEO_ADMIN_BASE}/api/whatsapp/window`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone: to, key: ADMIN_KEY }),
      });

      const raw = await response.text();

      if (response.ok && raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as WhatsAppWindowResponse;
          window24hResponse = parsed;
          is24hWindowOpen = parsed.isOpen === true;
          windowCheckOk = true;

          console.log("Ventana 24h activa:", {
            abierta: is24hWindowOpen,
            motivo: parsed.reason,
            segundos_restantes: parsed.windowSecondsLeft,
          });
        } catch (parseError) {
          console.error("Error parseando respuesta de ventana 24h:", parseError);
        }
      } else {
        console.warn("Respuesta no OK de ventana 24h:", response.status, raw);
      }
    } catch (networkError) {
      console.error("Error de red al verificar ventana 24h:", networkError);
    }

    /* ============================================================
       5. SI HAY VENTANA: MENSAJE GRATIS
    ============================================================ */
    const extras = {
      nombre_cliente,
      telefono_cliente,
      datos_pedido,
      valor_compra,
      direccion,
      ciudad,
      descripcion,
      fechaHora,
      fecha_anterior,
      fecha_nueva,
      enlace_cancelar,
      nombre_negocio,
      slugNegocio,
    };

    if (windowCheckOk && is24hWindowOpen) {
      const builder =
        TemplateBuilders[template as keyof typeof TemplateBuilders];

      if (!builder) {
        throw new Error("No existe builder para la plantilla seleccionada");
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
        descripcion,
      } as TemplateVariables);

      const freeRes = await sendWhatsApp({ to, text: messageText });

      await fetch(`${MYCKEO_ADMIN_BASE}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          eventType: template,
          phone: to,
          content: messageText,
          data: {
            free: true,
            placeholders: variables,
            extras,
            window24h: window24hResponse, // ← nombre correcto
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
       6. SIN VENTANA: PLANTILLA PAGA
    ============================================================ */
    const paidRes = await sendWhatsAppMessage({
      to,
      templateName: template,
      placeholderNames,
      variables,
      ttl: 1800,
      languageCode,
    });

    await fetch(`${MYCKEO_ADMIN_BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        eventType: template,
        phone: to,
        content: null,
        data: {
          free: false,
          placeholders: variables,
          extras,
          window24h: window24hResponse, // ← nombre correcto
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

    return {
      ok: false,
      free: false,
      message: null,
      errorMessage: msg,
      result: null,
    };
  }
}