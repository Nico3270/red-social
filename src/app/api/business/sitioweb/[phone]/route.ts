// app/api/business/sitioweb/[phone]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Validar API Key
   ============================================================ */
function validateApiKey(req: Request) {
  const headerKey = req.headers.get("x-api-key");
  return headerKey && headerKey === ADMIN_KEY;
}

/* ============================================================
   Normalizar teléfono
   ============================================================ */
function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

/* ============================================================
   GET → Obtener sitio web del negocio
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json(
        { error: "Unauthorized: invalid API key." },
        { status: 401 }
      );
    }

    const { phone } = await context.params;
    if (!phone) {
      return NextResponse.json(
        { error: "Falta el teléfono del negocio." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    // Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        sitioWeb: true,
      },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        businessId: negocio.id,
        nombre: negocio.nombre,
        sitioWeb: negocio.sitioWeb || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/sitioweb/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el sitio web del negocio." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar sitio web del negocio
   Body esperado:
   {
     "sitioWeb": "https://ejemplo.com"
   }
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json(
        { error: "Unauthorized: invalid API key." },
        { status: 401 }
      );
    }

    const { phone } = await context.params;
    if (!phone) {
      return NextResponse.json(
        { error: "Falta el teléfono del negocio." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const body = await req.json().catch(() => null);

    if (!body || typeof body.sitioWeb !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'sitioWeb' de tipo string." },
        { status: 400 }
      );
    }

    const nuevoSitio = body.sitioWeb.trim();

    if (nuevoSitio.length < 4) {
      return NextResponse.json(
        { error: "El sitio web enviado es demasiado corto o inválido." },
        { status: 400 }
      );
    }

    // Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
      },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    // Actualizar sitio web
    const actualizado = await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        sitioWeb: nuevoSitio,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        sitioWeb: true,
      },
    });

    return NextResponse.json(
      {
        message: "Sitio web actualizado correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/sitioweb/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el sitio web." },
      { status: 500 }
    );
  }
}
