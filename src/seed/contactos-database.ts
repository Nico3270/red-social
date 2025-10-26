// lib/sendEmail.ts
import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";

interface SendEmailParams {
  toEmail: string;
  toName?: string;
  params?: Record<string, string | number | boolean>;
  templateId: number;
  senderEmail?: string;
  senderName?: string;
}

export async function sendEmail({
  toEmail,
  toName = "",
  params = {},
  templateId,
  senderEmail = "soporte@myckeo.com",
  senderName = "Myckeo Oficial",
}: SendEmailParams) {
  try {
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!);

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: toEmail, name: toName }];
    sendSmtpEmail.sender = { email: senderEmail, name: senderName };
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.params = params;

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Correo enviado correctamente:", response);
    return response;
  } catch (error) {
    // console.error("❌ Error al enviar correo:", error);
    throw error;
  }
}

import { PrismaClient, TipoContacto } from "@prisma/client";
import { parse } from "papaparse";
import { readFileSync } from "fs";
import { join } from "path";

// Función auxiliar para capitalizar solo la primera letra
const toTitleCase = (str: string): string => {
  if (!str || typeof str !== "string") return "";
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
};

interface CsvRow {
  categoria: string;
  razon_social: string;
  nit: string;
  departamento: string;
  municipio: string;
  direccion: string;
  correo: string;
}

const prisma = new PrismaClient();

(async () => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY no está definida en las variables de entorno.");
    }

    const csvPath = join(process.cwd(), "cleaned.csv");
    const csvData = readFileSync(csvPath, "utf-8");

    const { data, errors } = parse<CsvRow>(csvData, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      // console.error("❌ Errores al parsear CSV:", errors);
      return;
    }

    for (const row of data) {
      const { categoria, razon_social: rawRazonSocial, nit, departamento: rawDepartamento, municipio, direccion, correo } = row;

      // Normalizar campos: solo primera letra en mayúscula
      const razon_social = toTitleCase(rawRazonSocial);
      const departamento = toTitleCase(rawDepartamento);

      const existingContact = await prisma.contactos.findFirst({
        where: {
          OR: [{ correo }, { identificacion: nit }],
        },
      });

      if (existingContact) {
        console.log(`⚠️ Contacto con correo ${correo} o NIT ${nit} ya existe. Saltando...`);
        continue;
      }

      try {
        // console.log({ correo, razon_social, departamento });
        await sendEmail({
          toEmail: correo,
          toName: razon_social,
          templateId: 2,
          params: {
            nombre: razon_social,
            municipio: toTitleCase(municipio), // Opcional: también normalizar municipio
            departamento,
          },
        });
        // console.log("Respuesta de Brevo:", emailResponse);
      } catch {
        // console.error(`❌ Error al enviar correo a ${correo}`);
        continue;
      }

      try {
        await prisma.contactos.create({
          data: {
            nombre: razon_social,
            categoria,
            identificacion: nit,
            departamento,
            municipio: toTitleCase(municipio), // Consistencia opcional
            direccion,
            correo,
            promocionalEnviado: true,
            tipoContacto: "LEAD" as TipoContacto,
            estado: "ACTIVO",
          },
        });
      } catch (error: unknown) {
        console.error(`❌ Error al registrar contacto ${correo}:`, error instanceof Error ? error.message : String(error));
        
      }
    }
  } catch (error: unknown) {
    console.error("❌ Error general en importContacts:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    console.log("Proceso finalizado con exito");
    await prisma.$disconnect();
  }
})();