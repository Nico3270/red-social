// lib/email.ts
import * as Brevo from '@getbrevo/brevo';


interface BrevoSendSmtpEmail {
  to: Array<{ email: string; name?: string }>;
  sender: { email: string; name?: string };
  subject: string;
  htmlContent: string;
}

interface BrevoSendTransacEmailRaw {
  body?: { messageId?: string };
  response?: { statusCode?: number; body?: string };
}

interface BrevoSendTransacEmailResponse {
  messageId: string;
  statusCode?: number;
}

interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  senderEmail?: string;
  senderName?: string;
}

function extractMessageId(raw: BrevoSendTransacEmailRaw): string | null {
  if (raw.body?.messageId) return raw.body.messageId;
  if (typeof raw.response?.body === "string") {
    try {
      const parsed = JSON.parse(raw.response.body);
      return typeof parsed.messageId === "string" ? parsed.messageId : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function sendEmail({
  toEmail,
  toName = "",
  subject,
  htmlContent,
  senderEmail = "soporte@myckeo.com",
  senderName = "Myckeo Oficial",
}: SendEmailParams): Promise<BrevoSendTransacEmailResponse> {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
  );

  const sendSmtpEmail: BrevoSendSmtpEmail = {
    to: [{ email: toEmail, name: toName }],
    sender: { email: senderEmail, name: senderName },
    subject,
    htmlContent,
  };

  try {
    const rawResponse = (await apiInstance.sendTransacEmail(
      sendSmtpEmail
    )) as BrevoSendTransacEmailRaw;

    const messageId = extractMessageId(rawResponse);
    if (!messageId) {
      console.error("Respuesta inesperada de Brevo:", rawResponse);
      throw new Error("Respuesta inválida de Brevo: falta messageId");
    }

    const response: BrevoSendTransacEmailResponse = {
      messageId,
      statusCode: rawResponse.response?.statusCode,
    };

    // console.log("Correo enviado correctamente:", {
    //   to: toEmail,
    //   messageId,
    //   status: response.statusCode,
    // });

    return response;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido al enviar correo";

    console.error("Error al enviar correo con Brevo:", errorMessage);
    throw new Error(`Fallo al enviar correo: ${errorMessage}`);
  }
}