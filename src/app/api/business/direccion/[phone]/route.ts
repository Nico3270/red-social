// app/api/business/direccion/[phone]/route.ts

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
   GET → Obtener la dirección del negocio
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
        direccion: true,
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
        direccion: negocio.direccion || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/direccion/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la dirección del negocio." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar solo la dirección del negocio
   Body esperado:
   {
     "direccion": "Nueva dirección"
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

    if (!body || typeof body.direccion !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'direccion' de tipo string." },
        { status: 400 }
      );
    }

    const nuevaDireccion = body.direccion.trim();

    if (nuevaDireccion.length < 3) {
      return NextResponse.json(
        { error: "La dirección es demasiado corta." },
        { status: 400 }
      );
    }

    // Buscar negocio
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

    // Actualizar dirección
    const actualizado = await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        direccion: nuevaDireccion,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
      },
    });

    return NextResponse.json(
      {
        message: "Dirección actualizada correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/direccion/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la dirección." },
      { status: 500 }
    );
  }
}
