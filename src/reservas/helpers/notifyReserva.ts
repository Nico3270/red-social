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

if (!ADMIN_KEY) throw new Error("Falta MYCKEO_ADMIN_KEY");

const SIN_COMENTARIOS_ADICIONALES = "Sin comentarios adicionales";

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
  orderType?: "DELIVERY" | "ON_SITE";
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
function isProductionLoopback(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]"
  );
}

function getExplicitOrigin(raw: string | undefined): string | null {
  if (!raw || raw !== raw.trim()) return null;

  try {
    const url = new URL(raw);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.search || url.hash) return null;
    if (url.pathname !== "/") return null;
    if (isProductionLoopback(url.hostname)) return null;

    return url.origin;
  } catch {
    return null;
  }
}

function getMyckeoAdminOrigin(): string | null {
  return getExplicitOrigin(process.env.MYCKEO_ADMIN_URL);
}

function getPublicSiteOrigin(): string | null {
  return getExplicitOrigin(process.env.SITE_URL);
}

function templateUsesDashboardLink(template: PlantillaWhatsApp): boolean {
  return (
    template === PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA ||
    template === PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO
  );
}

function templateUsesReservationBookingLink(
  template: PlantillaWhatsApp,
): boolean {
  return template === PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO;
}

function templateRequiresPublicSiteOrigin(
  template: PlantillaWhatsApp,
): boolean {
  return (
    templateUsesDashboardLink(template) ||
    templateUsesReservationBookingLink(template)
  );
}

function normalizeText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidE164(value?: string | null): boolean {
  return /^\+\d{10,15}$/.test(normalizeText(value));
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

function getErrorName(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
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
  const rootError = asRecord(root.error);
  const dataError = asRecord(data?.error);
  const providerError = rootError ?? dataError;

  return {
    kind: "object",
    ok: typeof root.ok === "boolean" ? root.ok : null,
    messageId: extractMessageId(result),
    hasData: !!data,
    messagesCount: messages.length,
    contactsCount: contacts.length,
    errorCode:
      typeof providerError?.code === "string" ||
      typeof providerError?.code === "number"
        ? providerError.code
        : null,
    errorType:
      typeof providerError?.type === "string" ? providerError.type : null,
    httpStatus:
      typeof root.status === "number"
        ? root.status
        : typeof root.statusCode === "number"
          ? root.statusCode
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
  missingFields: string[],
) {
  return `Datos incompletos para la plantilla ${template}: faltan ${missingFields.join(
    ", ",
  )}`;
}

function buildConfigurationError(
  traceId: string,
  template: PlantillaWhatsApp,
  errorMessage: string,
): NotifyResult {
  console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
    template,
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
    messageId: null,
  };
}

async function logWhatsAppEvent(params: {
  adminOrigin: string;
  traceId: string;
  template: PlantillaWhatsApp;
  phone: string;
  free: boolean;
  providerResult: unknown;
  providerAccepted: boolean;
}) {
  const {
    adminOrigin,
    traceId,
    template,
    phone,
    free,
    providerResult,
    providerAccepted,
  } = params;

  try {
    const response = await fetch(new URL("/api/events", adminOrigin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ADMIN_KEY,
      },
      body: JSON.stringify({
        eventType: template,
        phone,
        data: {
          traceId,
          free,
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
      `[notifyReserva][${traceId}] Error registrando evento /api/events`,
      {
        errorName: getErrorName(err),
      },
    );
  }
}

/* ========================================================================
   FUNCIÓN PRINCIPAL
======================================================================== */
export async function notifyReservaConfirmadaCliente(
  props: NotifyReservaConfirmadaClienteProps,
): Promise<NotifyResult> {
  const traceId = createTraceId();
  const adminOrigin = getMyckeoAdminOrigin();

  if (!adminOrigin) {
    return buildConfigurationError(
      traceId,
      props.template,
      "MYCKEO_ADMIN_URL inválida",
    );
  }

  const requiresPublicSiteOrigin = templateRequiresPublicSiteOrigin(
    props.template,
  );
  const publicSiteOrigin = requiresPublicSiteOrigin
    ? getPublicSiteOrigin()
    : null;

  if (requiresPublicSiteOrigin && !publicSiteOrigin) {
    return buildConfigurationError(
      traceId,
      props.template,
      "SITE_URL inválida",
    );
  }

  console.log(`[notifyReserva][${traceId}] Inicio`, {
    template: props.template,
    toMasked: maskPhone(props.to),
  });

  try {
    const {
      to,
      nombre_cliente,
      telefono_cliente,
      orderType,
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

    const direccionNormalizada = normalizeText(direccion);
    const ciudadNormalizada =
      normalizeText(ciudad) ||
      (orderType === "ON_SITE" ? "Consumo en sitio" : "");

    console.log(`[notifyReserva][${traceId}] Plantilla exacta solicitada:`, {
      template,
      templateRaw: String(template),
      isPedidoCreadoUsuarioUsuario:
        template === PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO,
    });

    const descripcionNormalizada = normalizeText(descripcion);
    const templateRequiereDescripcion =
      template === PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE ||
      template === PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO;
    const descripcionParaNotificacion = templateRequiereDescripcion
      ? descripcionNormalizada || SIN_COMENTARIOS_ADICIONALES
      : descripcionNormalizada;
    const telefonoClienteNormalizado = normalizeText(telefono_cliente);

    /* ============================================================
       1. INFO DEL NEGOCIO
    ============================================================ */
    console.log(
      `[notifyReserva][${traceId}] Obteniendo información del negocio...`,
      { negocioId },
    );

    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);

    console.log(`[notifyReserva][${traceId}] Consulta de negocio completada`, {
      found: !!negocioInfo,
    });

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

    const nombre_negocio = normalizeText(negocioInfo.nombreNegocio);
    const slugNegocio = normalizeText(negocioInfo.slugNegocio);

    if (!nombre_negocio || !slugNegocio) {
      const missingBusinessFields = [
        !nombre_negocio ? "nombreNegocio" : null,
        !slugNegocio ? "slugNegocio" : null,
      ].filter((field): field is string => field !== null);
      const errorMessage = `Información real del negocio incompleta: faltan ${missingBusinessFields.join(
        ", ",
      )}`;
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

    const reservas_negocio = templateUsesReservationBookingLink(template)
      ? new URL(
          `/reservas/${encodeURIComponent(slugNegocio)}`,
          publicSiteOrigin!,
        ).toString()
      : "";
    const enlace_reserva = templateUsesDashboardLink(template)
      ? new URL("/dashboard/reservas", publicSiteOrigin!).toString()
      : "";

    /* ============================================================
       2. VALIDAR TELÉFONO
    ============================================================ */
    console.log(`[notifyReserva][${traceId}] Validando teléfono destino`, {
      toMasked: maskPhone(to),
    });

    const normalizedTo = normalizeText(to);

    if (!isValidE164(normalizedTo)) {
      const errorMessage = `Número inválido (E.164 requerido): ${normalizedTo}`;
      console.error(`[notifyReserva][${traceId}] Teléfono destino inválido`, {
        toMasked: maskPhone(normalizedTo),
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
       3. ARMAR VARIABLES PARA LA PLANTILLA
    ============================================================ */
    console.log(
      `[notifyReserva][${traceId}] Construyendo variables para plantilla...`,
      { template },
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
          descripcionParaNotificacion,
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
        if (!isValidE164(telefonoClienteNormalizado))
          missing.push("telefono_cliente");
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
          telefonoClienteNormalizado,
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
        if (!isValidE164(telefonoClienteNormalizado))
          missing.push("telefono_cliente");

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
          telefonoClienteNormalizado,
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
        if (!isValidE164(telefonoClienteNormalizado))
          missing.push("telefono_cliente");
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
          telefonoClienteNormalizado,
          direccion!,
          descripcionParaNotificacion,
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
        if (!direccionNormalizada) missing.push("direccion");
        if (!ciudadNormalizada) missing.push("ciudad");

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
          direccionNormalizada,
          ciudadNormalizada,
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
      variableCount: variables.length,
    });

    if (variables.some((v) => !v || v.trim() === "")) {
      const errorMessage = `Variables vacías o inválidas para plantilla ${template}`;
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
       4. VERIFICAR VENTANA 24H
    ============================================================ */
    console.log(`[notifyReserva][${traceId}] Revisando ventana de 24h...`, {
      phoneMasked: maskPhone(normalizedTo),
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
          phoneMasked: maskPhone(normalizedTo),
        },
      );

      const response = await fetch(
        new URL("/api/whatsapp/window", adminOrigin),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: requestBody,
        },
      );

      windowRawResponse = await response.text();

      console.log(`[notifyReserva][${traceId}] Status HTTP ventana:`, {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok && windowRawResponse.trim().length > 0) {
        try {
          windowJsonResponse = JSON.parse(windowRawResponse) as WindowResponse;
          isWindowOpen = windowJsonResponse.isOpen === true;
          windowCheckOk = true;

          console.log(
            `[notifyReserva][${traceId}] JSON ventana parseado correctamente:`,
            { isOpen: isWindowOpen },
          );
        } catch (parseErr) {
          console.error(
            `[notifyReserva][${traceId}] Error parseando JSON de ventana:`,
            { errorName: getErrorName(parseErr) },
          );
        }
      } else {
        console.error(
          `[notifyReserva][${traceId}] Error HTTP en verificación de ventana`,
          {
            status: response.status,
          },
        );
      }
    } catch (err) {
      console.error(
        `[notifyReserva][${traceId}] Error de red al consultar ventana 24h:`,
        { errorName: getErrorName(err) },
      );
    }

    console.log(`[notifyReserva][${traceId}] Resultado ventana 24h:`, {
      windowCheckOk,
      isWindowOpen,
    });

    /* ============================================================
       5. SI HAY VENTANA → MENSAJE GRATIS
    ============================================================ */
    if (windowCheckOk && isWindowOpen) {
      console.log(
        `[notifyReserva][${traceId}] Ventana ABIERTA → enviando mensaje GRATIS`,
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
        direccion: direccionNormalizada,
        ciudad: ciudadNormalizada,
        descripcion: descripcionParaNotificacion,
      } as TemplateVariables);

      const freeRes = await sendWhatsApp({
        to: normalizedTo,
        text: messageText,
      });

      const freeAccepted = isProviderAccepted(freeRes);
      const freeMessageId = extractMessageId(freeRes);

      console.log(
        `[notifyReserva][${traceId}] Resultado envío GRATIS (summary):`,
        getProviderSummary(freeRes),
      );

      await logWhatsAppEvent({
        adminOrigin,
        traceId,
        template,
        phone: normalizedTo,
        free: true,
        providerResult: freeRes,
        providerAccepted: freeAccepted,
      });

      if (!freeAccepted) {
        const errorMessage =
          "WhatsApp no confirmó la aceptación del mensaje libre.";

        console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
          providerSummary: getProviderSummary(freeRes),
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
          toMasked: maskPhone(normalizedTo),
        },
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
      `[notifyReserva][${traceId}] Ventana CERRADA o fallo en API → enviando PLANTILLA PAGA`,
    );

    const templatePayload = {
      to: normalizedTo,
      templateName: template,
      placeholderNames,
      variables,
      ttl: 1800,
      languageCode,
    };

    console.log(`[notifyReserva][${traceId}] Enviando template`, {
      template,
      languageCode,
      placeholderNames,
      variableCount: variables.length,
      ttl: templatePayload.ttl,
      toMasked: maskPhone(normalizedTo),
    });

    const paidRes = await sendWhatsAppMessage(templatePayload);

    const paidAccepted = isProviderAccepted(paidRes);
    const paidMessageId = extractMessageId(paidRes);

    console.log(
      `[notifyReserva][${traceId}] Resultado PLANTILLA (summary):`,
      getProviderSummary(paidRes),
    );

    await logWhatsAppEvent({
      adminOrigin,
      traceId,
      template,
      phone: normalizedTo,
      free: false,
      providerResult: paidRes,
      providerAccepted: paidAccepted,
    });

    if (!paidAccepted) {
      const errorMessage = `WhatsApp no confirmó la aceptación de la plantilla ${template}.`;

      console.error(`[notifyReserva][${traceId}] ${errorMessage}`, {
        providerSummary: getProviderSummary(paidRes),
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
        toMasked: maskPhone(normalizedTo),
      },
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

    console.error(`[notifyReserva][${traceId}] ERROR general`, {
      errorName: getErrorName(err),
      template: props.template,
    });

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
