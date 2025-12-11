// app/api/usuario/email/[phone]/route.ts

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
   Validar email
   ============================================================ */
function isValidEmail(email: string) {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/* ============================================================
   GET → Obtener email del usuario administrador
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

    // Buscar negocio asociado
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
        email: true,
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
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /usuario/email/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el email del usuario." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar email del usuario administrador
   Body esperado:
   {
     "email": "nuevo@email.com"
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

    if (!body || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'email' como string." },
        { status: 400 }
      );
    }

    const nuevoEmail = body.email.trim();

    if (!isValidEmail(nuevoEmail)) {
      return NextResponse.json(
        { error: "El email enviado no es válido." },
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
        { error: "No existe un negocio asociado a este teléfono." },
        { status: 404 }
      );
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: negocio.usuarioId },
      data: {
        email: nuevoEmail,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        message: "Email actualizado correctamente.",
        user: usuarioActualizado,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /usuario/email/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el email del usuario." },
      { status: 500 }
    );
  }
}
