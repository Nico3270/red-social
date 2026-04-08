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
   TIPOS
======================================================================== */
interface NotifyResult {
  ok: boolean;
  free: boolean;
  message: string | null;
  errorMessage: string | null;
  result: unknown;

  // Campos extra útiles para logs/debug y server actions
  traceId?: string;
  status?:
    | "free_sent"
    | "free_failed"
    | "template_sent"
    | "template_failed"
    | "validation_error"
    | "exception";
  providerAccepted?: boolean;
  templateName?: string;
  phone?: string;
  messageId?: string | null;
}

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

interface WindowResponse {
  isOpen: boolean;
  lastUserMessageAt?: string;
  windowSecondsLeft?: number;
  reason?: string;
}

/* ========================================================================
   HELPERS
======================================================================== */
function normalizeText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function createTraceId() {
  return `notify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function maskPhone(phone?: string | null) {
  const raw = normalizeText(phone);
  if (!raw) return "unknown";
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "unknown";
  if (digits.length <= 4) return `***${digits}`;
  return `***${digits.slice(-4)}`;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractMessageId(result: unknown): string | null {
  const root = asRecord(result);
  if (!root) return null;

  const rootMessageId =
    typeof root.messageId === "string" ? root.messageId : null;
  if (rootMessageId) return rootMessageId;

  const data = asRecord(root.data);
  if (!data) return null;

  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (messages.length === 0) return null;

  const firstMessage = asRecord(messages[0]);
  if (!firstMessage) return null;

  return typeof firstMessage.id === "string" ? firstMessage.id : null;
}

function getProviderSummary(result: unknown) {
  const root = asRecord(result);
  if (!root) {
    return {
      kind: typeof result,
      ok: false,
      messageId: null,
      hasData: false,
      messagesCount: 0,
      contactsCount: 0,
      error: null as string | null,
    };
  }

  const data = asRecord(root.data);
  const messages = Array.isArray(data?.messages) ? data.messages : [];
  const contacts = Array.isArray(data?.contacts) ? data.contacts : [];

  return {
    kind: "object",
    ok: typeof root.ok === "boolean" ? root.ok : null,
    messageId: extractMessageId(result),
    hasData: !!data,
    messagesCount: messages.length,
    contactsCount: contacts.length,
    error:
      typeof root.errorMessage === "string"
        ? root.errorMessage
        : typeof root.error === "string"
        ? root.error
        : typeof root.message === "string" && root.ok === false
        ? root.message
        : null,
  };
}

function isProviderAccepted(result: unknown): boolean {
  const root = asRecord(result);
  if (!root) return false;

  const okFlag = typeof root.ok === "boolean" ? root.ok : null;
  const data = asRecord(root.data);
  const messages = Array.isArray(data?.messages) ? data.messages : [];

  if (okFlag === false) return false;
  if (messages.length > 0) return true;
  if (okFlag === true && data) return true;
  if (okFlag === true) return true;

  return false;
}

function buildValidationErrorMessage(
  template: PlantillaWhatsApp,
  missingFields: string[]
) {
  return `Datos incompletos para la plantilla ${template}: faltan ${missingFields.join(
    ", "
  )}`;
}

async function logWhatsAppEvent(params: {
  traceId: string;
  template: PlantillaWhatsApp;
  phone: string;
  content: string | null;
  free: boolean;
  placeholders: string[];
  extras: Record<string, unknown>;
  providerResult: unknown;
  providerAccepted: boolean;
}) {
  const {
    traceId,
    template,
    phone,
    content,
    free,
    placeholders,
    extras,
    providerResult,
    providerAccepted,
  } = params;

  try {
    const response = await fetch(`${MYCKEO_ADMIN_BASE}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        eventType: template,
        phone,
        content,
        data: {
          traceId,
          free,
          placeholders,
          extras,
          providerAccepted,
          providerSummary: getProviderSummary(providerResult),
        },
      }),
    });

    console.log(`[notifyReserva][${traceId}] Evento /api/events registrado`, {
      status: response.status,
      ok: response.ok,
    });
  } catch (err) {
    console.error(
      `[notifyReserva][${traceId}] Error registrando evento /api/events:`,
      err
    );
  }
}

/* ========================================================================
   FUNCIÓN PRINCIPAL
======================================================================== */
export async function notifyReservaConfirmadaCliente(
  props: NotifyReservaConfirmadaClienteProps
): Promise<NotifyResult> {
  const traceId = createTraceId();

  console.log(`[notifyReserva][${traceId}] Inicio`);
  console.log(`[notifyReserva][${traceId}] Props recibidas:`, {
    ...props,
    toMasked: maskPhone(props.to),
    telefono_cliente_masked: maskPhone(props.telefono_cliente),
  });

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

    console.log(`[notifyReserva][${traceId}] Plantilla exacta solicitada:`, {
      template,
      templateRaw: String(template),
      isPedidoCreadoUsuarioUsuario:
        template === PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
    });

    const descripcionNormalizada =
      template === PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO
        ? normalizeText(descripcion) || FALLBACK_COMENTARIOS_ADICIONALES
        : typeof descripcion === "string"
        ? descripcion
        : "";

    /* ============================================================
       1. INFO DEL NEGOCIO
    ============================================================ */
    console.log(
      `[notifyReserva][${traceId}] Obteniendo información del negocio...`,
      { negocioId }
    );

    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);

    console.log(`[notifyReserva][${traceId}] negocioInfo:`, negocioInfo);

    if (!negocioInfo) {
      const errorMessage = "Información del negocio no encontrada";
      console.error(`[notifyReserva][${traceId}] ${errorMessage}`);

      return {
        ok: false,
        free: false,
        message: null,
        errorMessage,
        result: null,
        traceId,
        status: "validation_error",
        providerAccepted: false,
        templateName: template,
        phone: to,
        messageId: null,
      };
    }

    const slugNegocio = negocioInfo.slugNegocio;
    const reservas_negocio = `https://myckeo.com/reservas/${slugNegocio}`;
    const nombre_negocio = negocioInfo.nombreNegocio || "Negocio Desconocido";
    const enlace_reserva = "https://myckeo.com/dashboard/reservas";

    /* ============================================================
       2. VALIDAR TELÉFONO
    ============================================================ */
    console.log(`[notifyReserva][${traceId}] Validando teléfono destino...`, {
      to,
      toMasked: maskPhone(to),
    });

    const normalizedTo = normalizeText(to);

    if (!normalizedTo.startsWith("+") || !/^\+\d{10,15}$/.test(normalizedTo)) {
      const errorMessage = `Número inválido (E.164 requerido): ${normalizedTo}`;
      console.error(`[notifyReserva][${traceId}] ${errorMessage}`);

      return {
        ok: false,
        free: false,
        message: null,
        errorMessage,
        result: null,
        traceId,
        status: "validation_error",
        providerAccepted: false,
        templateName: template,
        phone: normalizedTo,
        messageId: null,
      };
    }

    /* ============================================================
       3. ARMAR VARIABLES PARA LA PLANTILLA
    ============================================================ */
    console.log(
      `[notifyReserva][${traceId}] Construyendo variables para plantilla...`,
      { template }
    );

    let variables: string[] = [];
    let placeholderNames: string[] = [];
    let languageCode = "es";

    switch (template) {
      case PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!fechaHora) missing.push("fechaHora");
        if (!enlace_cancelar) missing.push("enlace_cancelar");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          fechaHora!,
          enlace_cancelar!,
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
      }

      case PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!telefono_cliente) missing.push("telefono_cliente");
        if (!fechaHora) missing.push("fechaHora");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_negocio,
          nombre_cliente!,
          telefono_cliente!,
          fechaHora!,
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
      }

      case PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!fechaHora) missing.push("fechaHora");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          fechaHora!,
          reservas_negocio,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_hora",
          "reservas_negocio",
        ];
        break;
      }

      case PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!fechaHora) missing.push("fechaHora");
        if (!telefono_cliente) missing.push("telefono_cliente");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          fechaHora!,
          telefono_cliente!,
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
      }

      case PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!fecha_anterior) missing.push("fecha_anterior");
        if (!fecha_nueva) missing.push("fecha_nueva");
        if (!enlace_cancelar) missing.push("enlace_cancelar");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          fecha_anterior!,
          fecha_nueva!,
          enlace_cancelar!,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "fecha_anterior",
          "fecha_nueva",
          "enlace_cancelar",
        ];
        break;
      }

      case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO: {
        const missing: string[] = [];
        if (!valor_compra) missing.push("valor_compra");
        if (!datos_pedido) missing.push("datos_pedido");
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!telefono_cliente) missing.push("telefono_cliente");
        if (!direccion) missing.push("direccion");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_negocio,
          datos_pedido!,
          valor_compra!,
          nombre_cliente!,
          telefono_cliente!,
          direccion!,
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
      }

      case PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO: {
        const missing: string[] = [];
        if (!valor_compra) missing.push("valor_compra");
        if (!datos_pedido) missing.push("datos_pedido");
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!direccion) missing.push("direccion");
        if (!ciudad) missing.push("ciudad");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        // Importante: NO cambiamos el nombre de la plantilla.
        variables = [
          nombre_cliente!,
          nombre_negocio,
          datos_pedido!,
          valor_compra!,
          direccion!,
          ciudad!,
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
      }

      case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!datos_pedido) missing.push("datos_pedido");
        if (!valor_compra) missing.push("valor_compra");
        if (!direccion) missing.push("direccion");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          datos_pedido!,
          valor_compra!,
          direccion!,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
          "direccion",
        ];
        break;
      }

      case PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO: {
        const missing: string[] = [];
        if (!nombre_cliente) missing.push("nombre_cliente");
        if (!datos_pedido) missing.push("datos_pedido");
        if (!valor_compra) missing.push("valor_compra");

        if (missing.length > 0) {
          const errorMessage = buildValidationErrorMessage(template, missing);
          console.error(`[notifyReserva][${traceId}] ${errorMessage}`);
          return {
            ok: false,
            free: false,
            message: null,
            errorMessage,
            result: null,
            traceId,
            status: "validation_error",
            providerAccepted: false,
            templateName: template,
            phone: normalizedTo,
            messageId: null,
          };
        }

        variables = [
          nombre_cliente!,
          nombre_negocio,
          datos_pedido!,
          valor_compra!,
        ];
        placeholderNames = [
          "nombre_cliente",
          "nombre_negocio",
          "datos_pedido",
          "valor_compra",
        ];
        break;
      }

      default: {
        const errorMessage = `Plantilla no reconocida: ${String(template)}`;
        console.error(`[notifyReserva][${traceId}] ${errorMessage}`);

        return {
          ok: false,
          free: false,
          message: null,
          errorMessage,
          result: null,
          traceId,
          status: "validation_error",
          providerAccepted: false,
          templateName: template,
          phone: normalizedTo,
          messageId: null,
        };
      }
    }

    console.log(`[notifyReserva][${traceId}] Variables construidas OK`, {
      template,
      languageCode,
      placeholderNames,
      variables,
    });

    if (variables.some((v) => !v || v.trim() === "")) {
      const errorMessage = `Variables vacías o inválidas para plantilla ${template}`;
      console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
        variables,
      });

      return {
        ok: false,
        free: false,
        message: null,
        errorMessage,
        result: null,
        traceId,
        status: "validation_error",
        providerAccepted: false,
        templateName: template,
        phone: normalizedTo,
        messageId: null,
      };
    }

    /* ============================================================
       4. VERIFICAR VENTANA 24H
    ============================================================ */
    console.log(`[notifyReserva][${traceId}] Revisando ventana de 24h...`, {
      phone: normalizedTo,
      phoneMasked: maskPhone(normalizedTo),
      adminKeyLast6: ADMIN_KEY.slice(-6),
    });

    let isWindowOpen = false;
    let windowCheckOk = false;
    let windowRawResponse = "";
    let windowJsonResponse: WindowResponse | null = null;

    try {
      const requestBody = JSON.stringify({
        phone: normalizedTo,
        key: ADMIN_KEY,
      });

      console.log(
        `[notifyReserva][${traceId}] Enviando POST a /api/whatsapp/window`,
        {
          url: `${MYCKEO_ADMIN_BASE}/api/whatsapp/window`,
          bodyPreview: {
            phone: normalizedTo,
            keyLast6: ADMIN_KEY.slice(-6),
          },
        }
      );

      const response = await fetch(`${MYCKEO_ADMIN_BASE}/api/whatsapp/window`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
      });

      windowRawResponse = await response.text();

      console.log(
        `[notifyReserva][${traceId}] Respuesta RAW /api/whatsapp/window:`
      );
      console.log(windowRawResponse);
      console.log(`[notifyReserva][${traceId}] Status HTTP ventana:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (response.ok && windowRawResponse.trim().length > 0) {
        try {
          windowJsonResponse = JSON.parse(windowRawResponse) as WindowResponse;
          isWindowOpen = windowJsonResponse.isOpen === true;
          windowCheckOk = true;

          console.log(
            `[notifyReserva][${traceId}] JSON ventana parseado correctamente:`,
            windowJsonResponse
          );
        } catch (parseErr) {
          console.error(
            `[notifyReserva][${traceId}] Error parseando JSON de ventana:`,
            parseErr
          );
          console.error(
            `[notifyReserva][${traceId}] Contenido recibido:`,
            windowRawResponse
          );
        }
      } else {
        console.error(
          `[notifyReserva][${traceId}] Error HTTP en verificación de ventana`,
          {
            status: response.status,
            body: windowRawResponse,
          }
        );
      }
    } catch (err) {
      console.error(
        `[notifyReserva][${traceId}] Error de red al consultar ventana 24h:`,
        err
      );
    }

    console.log(`[notifyReserva][${traceId}] Resultado ventana 24h:`, {
      windowCheckOk,
      isWindowOpen,
      windowJsonResponse,
    });

    /* ============================================================
       EXTRAS PARA EVENTOS
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
      template,
      languageCode,
    };

    /* ============================================================
       5. SI HAY VENTANA → MENSAJE GRATIS
    ============================================================ */
    if (windowCheckOk && isWindowOpen) {
      console.log(
        `[notifyReserva][${traceId}] Ventana ABIERTA → enviando mensaje GRATIS`
      );

      const builder =
        TemplateBuilders[template as keyof typeof TemplateBuilders];

      if (!builder) {
        const errorMessage = `No existe builder para la plantilla ${template}`;
        console.error(`[notifyReserva][${traceId}] ${errorMessage}`);

        return {
          ok: false,
          free: true,
          message: null,
          errorMessage,
          result: null,
          traceId,
          status: "validation_error",
          providerAccepted: false,
          templateName: template,
          phone: normalizedTo,
          messageId: null,
        };
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

      console.log(`[notifyReserva][${traceId}] Texto generado GRATIS:`);
      console.log(messageText);

      const freeRes = await sendWhatsApp({
        to: normalizedTo,
        text: messageText,
      });

      const freeAccepted = isProviderAccepted(freeRes);
      const freeMessageId = extractMessageId(freeRes);

      console.log(
        `[notifyReserva][${traceId}] Resultado envío GRATIS (raw):`,
        freeRes
      );
      console.log(
        `[notifyReserva][${traceId}] Resultado envío GRATIS (summary):`,
        getProviderSummary(freeRes)
      );

      await logWhatsAppEvent({
        traceId,
        template,
        phone: normalizedTo,
        content: messageText,
        free: true,
        placeholders: variables,
        extras,
        providerResult: freeRes,
        providerAccepted: freeAccepted,
      });

      if (!freeAccepted) {
        const errorMessage =
          "WhatsApp no confirmó la aceptación del mensaje libre.";

        console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
          providerSummary: getProviderSummary(freeRes),
          providerRaw: safeStringify(freeRes),
        });

        return {
          ok: false,
          free: true,
          message: null,
          errorMessage,
          result: freeRes,
          traceId,
          status: "free_failed",
          providerAccepted: false,
          templateName: template,
          phone: normalizedTo,
          messageId: freeMessageId,
        };
      }

      console.log(
        `[notifyReserva][${traceId}] Mensaje GRATIS aceptado por el provider`,
        {
          messageId: freeMessageId,
          to: normalizedTo,
          toMasked: maskPhone(normalizedTo),
        }
      );

      return {
        ok: true,
        free: true,
        message: messageText,
        errorMessage: null,
        result: freeRes,
        traceId,
        status: "free_sent",
        providerAccepted: true,
        templateName: template,
        phone: normalizedTo,
        messageId: freeMessageId,
      };
    }

    /* ============================================================
       6. SIN VENTANA → PLANTILLA PAGA
    ============================================================ */
    console.log(
      `[notifyReserva][${traceId}] Ventana CERRADA o fallo en API → enviando PLANTILLA PAGA`
    );

    const templatePayload = {
      to: normalizedTo,
      templateName: template,
      placeholderNames,
      variables,
      ttl: 1800,
      languageCode,
    };

    console.log(
      `[notifyReserva][${traceId}] Payload sendWhatsAppMessage:`,
      templatePayload
    );

    const paidRes = await sendWhatsAppMessage(templatePayload);

    const paidAccepted = isProviderAccepted(paidRes);
    const paidMessageId = extractMessageId(paidRes);

    console.log(
      `[notifyReserva][${traceId}] Resultado PLANTILLA (raw):`,
      paidRes
    );
    console.log(
      `[notifyReserva][${traceId}] Resultado PLANTILLA (summary):`,
      getProviderSummary(paidRes)
    );

    await logWhatsAppEvent({
      traceId,
      template,
      phone: normalizedTo,
      content: null,
      free: false,
      placeholders: variables,
      extras,
      providerResult: paidRes,
      providerAccepted: paidAccepted,
    });

    if (!paidAccepted) {
      const errorMessage = `WhatsApp no confirmó la aceptación de la plantilla ${template}.`;

      console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
        providerSummary: getProviderSummary(paidRes),
        providerRaw: safeStringify(paidRes),
      });

      return {
        ok: false,
        free: false,
        message: null,
        errorMessage,
        result: paidRes,
        traceId,
        status: "template_failed",
        providerAccepted: false,
        templateName: template,
        phone: normalizedTo,
        messageId: paidMessageId,
      };
    }

    console.log(
      `[notifyReserva][${traceId}] Plantilla aceptada por el provider`,
      {
        template,
        languageCode,
        messageId: paidMessageId,
        to: normalizedTo,
        toMasked: maskPhone(normalizedTo),
      }
    );

    return {
      ok: true,
      free: false,
      message: null,
      errorMessage: null,
      result: paidRes,
      traceId,
      status: "template_sent",
      providerAccepted: true,
      templateName: template,
      phone: normalizedTo,
      messageId: paidMessageId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";

    console.error(`[notifyReserva][${traceId}] ERROR general:`, msg);
    if (err instanceof Error) {
      console.error(`[notifyReserva][${traceId}] Stack:`, err.stack);
    } else {
      console.error(`[notifyReserva][${traceId}] Error raw:`, err);
    }

    return {
      ok: false,
      free: false,
      message: null,
      errorMessage: msg,
      result: null,
      traceId,
      status: "exception",
      providerAccepted: false,
      templateName: props.template,
      phone: props.to,
      messageId: null,
    };
  }
}