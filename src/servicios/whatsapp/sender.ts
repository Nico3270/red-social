// src/services/whatsapp/sender.ts

/**
 * =====================================================================
 * WHATSAPP FREE TEXT SENDER — Myckeo AI 2025
 * ---------------------------------------------------------------------
 * Envia mensajes de texto GRATIS a WhatsApp Cloud API cuando la ventana
 * de 24 horas está abierta.
 *
 * Este método NO maneja plantillas.
 * Solo envía mensajes tipo "text".
 * =====================================================================
 */

interface WhatsAppSendParams {
  to: string;
  text: string;
  signal?: AbortSignal;
}

export async function sendWhatsApp({ to, text, signal }: WhatsAppSendParams) {
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
    text: {
      body: text,
    },
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

    const data = await response.json();

    console.log("📡 WhatsApp response (HTTP", response.status + "):");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("❌ WhatsApp rechazó el mensaje gratis");
      return { success: false, status: response.status, error: data.error };
    }

    const msg = data.messages?.[0];

    if (!msg?.id) {
      console.error("⚠️ WhatsApp aceptó pero no devolvió ID");
      return { success: false, error: "No message ID returned" };
    }

    console.log("✅ WhatsApp mensaje GRATIS enviado → wamid:", msg.id);

    return {
      success: true,
      wamid: msg.id,
      data,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn("⏳ Timeout enviando mensaje WhatsApp (gratis)");
      return { success: false, error: "timeout" };
    }

    console.error("💥 Error crítico enviando mensaje WhatsApp:", err);
    return { success: false, error: err.message };
  }
}
