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
const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY!;
const MYCKEO_ADMIN_BASE =
  process.env.MYCKEO_ADMIN_URL ?? "https://myckeo.com/api";

if (!ADMIN_KEY) throw new Error("Falta MYCKEO_ADMIN_KEY");

/* ========================================================================
   TIPOS DE RETORNO
======================================================================== */
interface NotifyResult {
  ok: boolean;
  free: boolean;           // true = mensaje gratis
  message: string | null;  // texto enviado (gratis)
  errorMessage: string | null;
  result: unknown;         // respuesta raw de WhatsApp
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
   FUNCIÓN PRINCIPAL
======================================================================== */
export async function notifyReservaConfirmadaCliente(
  props: NotifyReservaConfirmadaClienteProps
): Promise<NotifyResult> {
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
    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);
    if (!negocioInfo) throw new Error("Información del negocio no encontrada");

    const slugNegocio = negocioInfo.slugNegocio;
    const reservas_negocio = `https://myckeo.com/reservas/${slugNegocio}`;
    const nombre_negocio = negocioInfo.nombreNegocio || "Negocio Desconocido";
    const enlace_reserva = "https://myckeo.com/dashboard/reservas";

    /* ============================================================
       2. VALIDAR TELÉFONO (E.164)
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
          descripcion || "",
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
        variables = [nombre_cliente, nombre_negocio, fechaHora, reservas_negocio];
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

    if (variables.some((v) => !v || v.trim() === ""))
      throw new Error("Variables vacías o inválidas");

    /* ============================================================
       4. VERIFICAR VENTANA 24H
    ============================================================ */
    const windowRes: { isOpen?: boolean } = await fetch(
      `${MYCKEO_ADMIN_BASE}/whatsapp/window`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          key: ADMIN_KEY,
        },
        body: JSON.stringify({ phone: to }),
      }
    ).then((r) => r.json());

    const isWindowOpen = windowRes.isOpen === true;

    /* ============================================================
       5. SI HAY VENTANA → MENSAJE GRATIS
    ============================================================ */
    if (isWindowOpen) {
      const builder = TemplateBuilders[template];
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

      await fetch(`${MYCKEO_ADMIN_BASE}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ADMIN_KEY,
        },
        body: JSON.stringify({
          eventType: template,
          phone: to,
          content: messageText,
          data: { free: true },
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
    const paidRes = await sendWhatsAppMessage({
      to,
      templateName: template,
      placeholderNames,
      variables,
      ttl: 1800,
      languageCode,
    });

    await fetch(`${MYCKEO_ADMIN_BASE}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        eventType: template,
        phone: to,
        content: null,
        data: { free: false, placeholders: variables },
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

    return {
      ok: false,
      free: false,
      message: null,
      errorMessage: msg,
      result: null,
    };
  }
}
