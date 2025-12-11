// app/api/business/fotoportada/[phone]/route.ts

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
   GET → Obtener foto de portada del negocio
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validación de API KEY
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

    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        fotoPortada: true,
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
        fotoPortada: negocio.fotoPortada || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/fotoportada/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la foto de portada." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar foto de portada
   Body esperado:
   {
     "fotoPortada": "https://res.cloudinary.com/...jpg"
   }
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validación de API KEY
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

    if (!body || typeof body.fotoPortada !== "string") {
      return NextResponse.json(
        { error: "Debes enviar 'fotoPortada' como string (URL)." },
        { status: 400 }
      );
    }

    const nuevaFoto = body.fotoPortada.trim();

    if (!nuevaFoto.startsWith("http")) {
      return NextResponse.json(
        { error: "La URL enviada no es válida." },
        { status: 400 }
      );
    }

    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: { id: true, nombre: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    const actualizado = await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        fotoPortada: nuevaFoto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        fotoPortada: true,
      },
    });

    return NextResponse.json(
      {
        message: "Foto de portada actualizada correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/fotoportada/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la foto de portada." },
      { status: 500 }
    );
  }
}
