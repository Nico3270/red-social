// app/api/business/description/[phone]/route.ts

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
   GET → Obtener la descripción del negocio por teléfono
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validar API KEY
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

    // 1. Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
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
        descripcion: negocio.descripcion || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/description/[phone]:", error);

    return NextResponse.json(
      { error: "Error interno al obtener la descripción." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar la descripción del negocio por teléfono
   Body esperado:
   {
     "descripcion": "Nuevo texto"
   }
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validar API KEY
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

    if (!body || typeof body.descripcion !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'descripcion' de tipo string." },
        { status: 400 }
      );
    }

    const nuevaDescripcion = body.descripcion.trim();

    if (nuevaDescripcion.length < 3) {
      return NextResponse.json(
        { error: "La descripción es muy corta." },
        { status: 400 }
      );
    }

    // 1. Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone  },
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

    // 2. Actualizar descripción
    const actualizado = await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        descripcion: nuevaDescripcion,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
      },
    });

    return NextResponse.json(
      {
        message: "Descripción actualizada correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/description/[phone]:", error);

    return NextResponse.json(
      { error: "Error interno al actualizar la descripción." },
      { status: 500 }
    );
  }
}
