// app/api/business/tiktok/[phone]/route.ts

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
   GET → Obtener el TikTok del usuario dueño del negocio
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validación API KEY
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

    // 1. Buscar el negocio por teléfono
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

    // 2. Buscar el usuario asociado al negocio
    const usuario = await prisma.usuario.findUnique({
      where: { id: negocio.usuarioId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tiktok: true,
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
        tiktok: usuario.tiktok || "",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /business/tiktok/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la cuenta de TikTok." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar TikTok del usuario asociado al negocio
   Body esperado:
   {
     "tiktok": "https://www.tiktok.com/@mi_negocio"
   }
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ phone: string }> }
) {
  try {
    // Validación API KEY
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

    if (!body || typeof body.tiktok !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'tiktok' de tipo string." },
        { status: 400 }
      );
    }

    const nuevoTiktok = body.tiktok.trim();

    if (nuevoTiktok.length < 3) {
      return NextResponse.json(
        { error: "El enlace de TikTok es muy corto o inválido." },
        { status: 400 }
      );
    }

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

    // 2. Actualizar usuario dueño del negocio
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: negocio.usuarioId },
      data: {
        tiktok: nuevoTiktok,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tiktok: true,
      },
    });

    return NextResponse.json(
      {
        message: "TikTok actualizado correctamente.",
        business: {
          id: negocio.id,
          nombre: negocio.nombre,
        },
        user: usuarioActualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/tiktok/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el TikTok." },
      { status: 500 }
    );
  }
}
