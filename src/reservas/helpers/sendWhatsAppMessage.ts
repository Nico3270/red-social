"use server";


import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";



interface SendWhatsAppMessageProps {
  to: string; // Número de WhatsApp del destinatario (ej. '573123456789')
  templateName: PlantillaWhatsApp; // Nombre de la plantilla en Meta (ej. 'reserva_confirmada_cliente')
  variables: string[]; // Array de variables para los placeholders (ej. ['Juan', 'Café Delicioso', '20-08-2025 15:00', 'https://link.com/cancelar'])
  placeholderNames?: string[];
  languageCode?: string; // Código de idioma (default: 'es_ES')
  ttl?: number; // Período de validez en segundos (opcional, default: 10 min estándar)
}

export async function sendWhatsAppMessage({
  to,
  templateName,
  variables,
  placeholderNames,
  languageCode,  // Genérico para español; o 'es_CO' si tu audiencia es Colombia
  ttl = 600,
}: SendWhatsAppMessageProps) {
 
  

  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  const API_VERSION = 'v23.0'; // Versión actual; verifica en docs de Meta si cambia

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("Configuración de WhatsApp no encontrada en variables de entorno");
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const parameters = variables.map((varValue, index) => {
    const param = { type: 'text', text: varValue };
    if (placeholderNames && placeholderNames[index]) {
      return { ...param, parameter_name: placeholderNames[index] };  // Agrega parameter_name para nombrados
    }
    return param;  // Formato simple para numéricos
  });

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || "es"},
      components: [
        {
          type: 'body',
          parameters,
        },
      ],
    },
    ttl,
  };

  try {
    // console.log('Body enviado a WhatsApp API:', JSON.stringify(body, null, 2)); // Log formateado elegante
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();

      console.error('Error detallado de WhatsApp API:', errorData); // Log más detallado para depuración
      throw new Error(`Error en WhatsApp API: ${errorData.error?.message || 'Desconocido'}`);
    }

    const data = await response.json();
    // console.log('Notificación enviada exitosamente:', data); // Log de éxito para monitoreo
    return { ok: true, data };
  } catch (error) {
    console.error('Error enviando mensaje WhatsApp:', error);
    return { ok: false, message: (error as Error).message };
  }
}