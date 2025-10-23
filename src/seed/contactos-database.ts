
// lib/sendEmail.ts
import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";

interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  senderEmail?: string;
  senderName?: string;
}

export async function sendEmail({
  toEmail,
  toName = "",
  subject,
  htmlContent,
  senderEmail = "soporte@myckeo.com",
  senderName = "Soporte Myckeo",
}: SendEmailParams) {
  try {
    // Instancia de la API
    const apiInstance = new TransactionalEmailsApi();

    // Establece la clave API
    apiInstance.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY!
    );

    // Crea el objeto del correo
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: toEmail, name: toName }];
    sendSmtpEmail.sender = { email: senderEmail, name: senderName };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    // Envía el correo
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Correo enviado correctamente:", response);
    return response;
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    throw error;
  }
}

import { PrismaClient, TipoContacto } from "@prisma/client";
import { parse } from "papaparse";
import { readFileSync } from "fs";
import { join } from "path";

// Interfaz para tipar las filas del CSV
interface CsvRow {
  categoria: string;
  razon_social: string;
  nit: string;
  departamento: string;
  municipio: string;
  direccion: string;
  correo: string;
}

// HTML del correo personalizado
const emailTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu presencia digital con Myckeo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
    }
    .header {
      background-color: #1E40AF;
      padding: 24px;
      text-align: center;
    }
    .header img {
      max-width: 180px;
      height: auto;
    }
    .content {
      padding: 32px 24px;
    }
    h1 {
      font-size: 22px;
      margin-bottom: 16px;
      color: #1E40AF;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 16px;
    }
    li {
      margin-bottom: 10px;
    }
    .cta {
      text-align: center;
      margin-top: 30px;
    }
    .cta a {
      display: inline-block;
      background-color: #1E40AF;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      transition: background-color 0.3s ease;
    }
    .cta a:hover {
      background-color: #1B36A0;
    }
    .footer {
      font-size: 12px;
      color: #888;
      text-align: center;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .footer a {
      color: #1E40AF;
      text-decoration: none;
    }
    @media screen and (max-width: 600px) {
      .content {
        padding: 24px 16px;
      }
      h1 {
        font-size: 20px;
      }
      p {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dkwosk8qd/image/upload/v1761104289/Logo_Final_oywvic.png" alt="Logo de Myckeo" />
    </div>
    <div class="content">
      <h1>Hola, {{params.nombre}}</h1>
      <p>
        Queremos darte la bienvenida a Myckeo, una plataforma pensada para emprendimientos locales como el tuyo en {{params.municipio}}, {{params.departamento}}.
      </p>
      <p>
        Si estás buscando una forma sencilla de destacar en Internet y atraer más clientes sin complicaciones técnicas, estás en el lugar correcto.
      </p>
      <p>
        Al crear tu perfil en Myckeo podrás:
      </p>
      <ul>
        <li>Diseñar tu sitio web profesional con catálogo de productos o servicios.</li>
        <li>Recibir pedidos o reservas directamente desde tu perfil.</li>
        <li>Mostrar tus promociones, fotos y testimonios de clientes.</li>
        <li>Conectar tu negocio local con clientes digitales en segundos.</li>
      </ul>
      <p>
        No se trata solo de estar en línea, sino de tener una presencia que transmita confianza, profesionalismo y crecimiento.
      </p>
      <div class="cta">
        <a href="https://myckeo.com" target="_blank">Crear mi perfil ahora</a>
      </div>
    </div>
    <div class="footer">
      <p>¿No deseas recibir más correos? <a href="{{unsubscribe_link}}">Darte de baja</a></p>
      <p>© 2025 Myckeo · soporte@myckeo.com</p>
    </div>
  </div>
</body>
</html>
`;

// Inicializa Prisma
const prisma = new PrismaClient();

// Función autoinvocada para procesar el CSV
(async () => {
  try {
    // Verifica que la API key esté definida
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY no está definida en las variables de entorno.");
    }

    // Lee el archivo cleaned.csv
    const csvPath = join(process.cwd(), "cleaned.csv");
    const csvData = readFileSync(csvPath, "utf-8");

    // Parsea el CSV
    const { data, errors } = parse<CsvRow>(csvData, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      console.error("❌ Errores al parsear CSV:", errors);
      return;
    }

    // Procesa cada contacto
    for (const row of data) {
      const { categoria, razon_social, nit, departamento, municipio, direccion, correo } = row;

      // Verifica si el contacto ya existe
      const existingContact = await prisma.contactos.findFirst({
        where: {
          OR: [{ correo }, { identificacion: nit }],
        },
      });

      if (existingContact) {
        console.log(`⚠️ Contacto con correo ${correo} o NIT ${nit} ya existe. Saltando...`);
        continue;
      }

      // Personaliza el HTML del correo
      const personalizedHtml = emailTemplate
        .replace(/{{params.nombre}}/g, razon_social)
        .replace(/{{params.municipio}}/g, municipio)
        .replace(/{{params.departamento}}/g, departamento);

      // Envía el correo
      let brevoMessageId: string | undefined;
      try {
        const emailResponse = await sendEmail({
          toEmail: correo,
          toName: razon_social,
          subject: "Tu presencia digital con Myckeo",
          htmlContent: personalizedHtml,
        });
        console.log("Respuesta de Brevo:", emailResponse); // Para depuración
 
      } catch {
        console.error(`❌ Error al enviar correo a ${correo}`);
        continue; // Continúa con el siguiente contacto si falla el envío
      }

      // Registra el contacto en la base de datos solo si el correo se envió correctamente
      try {
        await prisma.contactos.create({
          data: {
            nombre: razon_social,
            categoria,
            identificacion: nit,
            departamento,
            municipio,
            direccion,
            correo,
            promocionalEnviado: true,
            brevoMessageId,
            tipoContacto: "LEAD" as TipoContacto,
            estado: "ACTIVO",
          },
        });
        // console.log(`✅ Contacto ${razon_social} (${correo}) registrado correctamente.`);
      } catch (error: unknown) {
        console.error(`❌ Error al registrar contacto ${correo}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // console.log("✅ Proceso de importación completado.");
  } catch (error: unknown) {
    console.error("❌ Error general en importContacts:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();