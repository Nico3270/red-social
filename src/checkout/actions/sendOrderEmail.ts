"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
import { InfoEmpresa as empresa } from "@/config/config";

interface SendOrderEmailProps {
  orderDetails: string;
}

export const sendOrderEmail = async ({ orderDetails }: SendOrderEmailProps) => {
  try {
    const response = await resend.emails.send({
      from: `${empresa.nombreCorto}  <${process.env.EMAIL_FROM}>`,  // Remitente del correo
      to: [`${process.env.EMAIL_TO}`],  // Correo del vendedor
      subject: "Nueva Orden Recibida 🚀",
      html: `
        <h1>📦 Nueva Orden Recibida</h1>
        <p>Hola, se ha creado una nueva orden con la siguiente información:</p>
        <pre>${orderDetails}</pre>
        <p>Por favor, revisa los detalles para proceder con el envío.</p>
      `,
    });

    console.log("Correo enviado con éxito:", response);
    return { success: true };
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return { success: false, error: "No se pudo enviar el correo." };
  }
};
