// app/api/business/facebook/[phone]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Validación de API Key
   ============================================================ */
function validateApiKey(req: Request) {
  const headerKey = req.headers.get("x-api-key");
  return headerKey && headerKey === ADMIN_KEY;
}

/* ============================================================
   Normalizar teléfono (quitar espacios)
   ============================================================ */
function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

/* ============================================================
   GET → Obtener Facebook del usuario propietario del negocio
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

    // 1. Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        usuarioId: true,
      },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    // 2. Buscar usuario dueño del negocio
    const usuario = await prisma.usuario.findUnique({
      where: { id: negocio.usuarioId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        facebook: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario asociado al negocio no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        businessId: negocio.id,
        businessName: negocio.nombre,
        userId: usuario.id,
        facebook: usuario.facebook || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/facebook/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la red social." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar el Facebook del usuario dueño del negocio
   Body esperado:
   {
     "facebook": "https://facebook.com/algo"
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

    if (!body || typeof body.facebook !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'facebook' de tipo string." },
        { status: 400 }
      );
    }

    const nuevoFacebook = body.facebook.trim();

    if (nuevoFacebook.length < 5) {
      return NextResponse.json(
        { error: "URL de Facebook inválida o muy corta." },
        { status: 400 }
      );
    }

    // Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        usuarioId: true,
      },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    // Actualizar usuario dueño del negocio
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: negocio.usuarioId },
      data: {
        facebook: nuevoFacebook,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        facebook: true,
      },
    });

    return NextResponse.json(
      {
        message: "Facebook actualizado correctamente.",
        business: {
          id: negocio.id,
          nombre: negocio.nombre,
        },
        user: usuarioActualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/facebook/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el Facebook." },
      { status: 500 }
    );
  }
}
