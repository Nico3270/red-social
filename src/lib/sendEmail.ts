// lib/sendEmail.ts
import Brevo from "@getbrevo/brevo";

/**
 * Envía un correo usando la API transaccional de Brevo
 * @param toEmail - Correo del destinatario
 * @param toName - Nombre del destinatario (opcional)
 * @param subject - Asunto del correo
 * @param htmlContent - Contenido HTML del correo
 * @param senderEmail - (opcional) correo del remitente, por defecto soporte@myckeo.com
 * @param senderName - (opcional) nombre del remitente, por defecto Soporte Myckeo
 */
export async function sendEmail({
  toEmail,
  toName = "",
  subject,
  htmlContent,
  senderEmail = "soporte@myckeo.com",
  senderName = "Soporte Myckeo",
}: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  senderEmail?: string;
  senderName?: string;
}) {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

  const sendSmtpEmail = {
    to: [{ email: toEmail, name: toName }],
    sender: { email: senderEmail, name: senderName },
    subject,
    htmlContent,
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Correo enviado correctamente:", response);
    return response;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    throw error;
  }
}
