// app/api/usuario/fotoperfil/[phone]/route.ts

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
   Validar URL de imagen (mínima validación)
   ============================================================ */
function isValidImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/* ============================================================
   GET → Obtener foto de perfil del usuario administrador
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
      select: { usuarioId: true, nombre: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    // Buscar usuario administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: negocio.usuarioId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        fotoPerfil: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario asociado no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        userId: usuario.id,
        fotoPerfil: usuario.fotoPerfil,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /usuario/fotoperfil/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la foto de perfil." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar foto de perfil del usuario
   Body esperado:
   {
     "fotoPerfil": "https://url-cloudinary.com/image.jpg"
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
        { error: "Debes enviar 'fotoPerfil' como string (URL de imagen)." },
        { status: 400 }
      );
    }

    const nuevaFoto = body.fotoPerfil.trim();

    if (!isValidImageUrl(nuevaFoto)) {
      return NextResponse.json(
        { error: "El valor enviado no es una URL válida." },
        { status: 400 }
      );
    }

    // Buscar negocio
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: { usuarioId: true, nombre: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "Negocio no encontrado para este teléfono." },
        { status: 404 }
      );
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: negocio.usuarioId },
      data: {
        fotoPerfil: nuevaFoto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        fotoPerfil: true,
      },
    });

    return NextResponse.json(
      {
        message: "Foto de perfil actualizada correctamente.",
        user: usuarioActualizado,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /usuario/fotoperfil/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la foto de perfil." },
      { status: 500 }
    );
  }
}
