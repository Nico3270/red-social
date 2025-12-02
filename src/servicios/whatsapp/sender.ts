/**
 * =====================================================================
 * WHATSAPP FREE TEXT SENDER — Myckeo AI 2025
 * ---------------------------------------------------------------------
 * Envía mensajes de texto GRATIS a WhatsApp Cloud API cuando la ventana
 * de 24 horas está abierta.
 *
 * Este método solo envía mensajes "text" (NO plantillas).
 * =====================================================================
 */

interface WhatsAppSendParams {
  to: string;
  text: string;
  signal?: AbortSignal;
}

/**
 * Tipos de respuesta de WhatsApp Cloud API
 */
interface WhatsAppAPIError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

interface WhatsAppAPIMessage {
  id: string;
  message_status?: string;
}

interface WhatsAppAPIResponse {
  messaging_product?: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: WhatsAppAPIMessage[];
  error?: WhatsAppAPIError;
}

/**
 * Respuesta para nuestra función
 */
interface WhatsAppSendResult {
  success: boolean;
  wamid?: string;
  data?: WhatsAppAPIResponse;
  error?: string | WhatsAppAPIError;
  status?: number;
}

export async function sendWhatsApp({
  to,
  text,
  signal,
}: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_ID = process.env.PHONE_NUMBER_ID;

  if (!TOKEN || !PHONE_ID) {
    console.error("❌ WhatsApp Sender: faltan WHATSAPP_TOKEN o PHONE_NUMBER_ID");
    return { success: false, error: "Missing WhatsApp credentials" };
  }

  const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;

  console.log("📤 Enviando mensaje GRATIS por WhatsApp...");
  console.log(" → To:", to);
  console.log(" → Preview:", text.slice(0, 120) + (text.length > 120 ? "..." : ""));
  console.log(" → PhoneID:", PHONE_ID);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    const data = (await response.json()) as WhatsAppAPIResponse;

    console.log("📡 WhatsApp response (HTTP " + response.status + "):");
    console.log(JSON.stringify(data, null, 2));

    /** ❌ Error HTTP */
    if (!response.ok) {
      console.error("❌ WhatsApp rechazó el mensaje gratis");
      return {
        success: false,
        status: response.status,
        error: data.error ?? "Unknown error",
      };
    }

    /** WhatsApp aceptó pero no devolvió ID */
    const msg = data.messages?.[0];
    if (!msg?.id) {
      console.error("⚠️ WhatsApp aceptó pero no devolvió ID");
      return { success: false, error: "No message ID returned", data };
    }

    console.log("✅ WhatsApp mensaje GRATIS enviado → wamid:", msg.id);

    return {
      success: true,
      wamid: msg.id,
      data,
    };
  } catch (err) {
    /** Manejo estricto del tipo error */
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.warn("⏳ Timeout enviando mensaje WhatsApp (gratis)");
        return { success: false, error: "timeout" };
      }

      console.error("💥 Error crítico enviando mensaje WhatsApp:", err);
      return { success: false, error: err.message };
    }

    console.error("💥 Error desconocido enviando WhatsApp:", err);
    return { success: false, error: "Unknown error" };
  }
}
