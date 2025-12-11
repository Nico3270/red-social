// app/api/business/fotoperfil/[phone]/route.ts

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
   GET → Obtener foto de perfil del negocio
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

    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: {
        id: true,
        nombre: true,
        fotoPerfil: true,
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
        fotoPerfil: negocio.fotoPerfil || "",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /business/fotoperfil/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la foto de perfil." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar foto de perfil
   Body esperado:
   {
     "fotoPerfil": "https://res.cloudinary.com/...jpg"
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

    if (!body || typeof body.fotoPerfil !== "string") {
      return NextResponse.json(
        { error: "Debes enviar 'fotoPerfil' como string (URL)." },
        { status: 400 }
      );
    }

    const nuevaFoto = body.fotoPerfil.trim();

    if (!nuevaFoto.startsWith("http")) {
      return NextResponse.json(
        { error: "La URL de la foto no es válida." },
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
        fotoPerfil: nuevaFoto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        fotoPerfil: true,
      },
    });

    return NextResponse.json(
      {
        message: "Foto de perfil actualizada correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /business/fotoperfil/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la foto de perfil." },
      { status: 500 }
    );
  }
}
