// app/api/usuario/fecha-nacimiento/[phone]/route.ts

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
   Convertir fecha enviada por el usuario → Date válido
   Acepta: 1984-09-13, 13/09/1984, 13-09-1984, etc.
   ============================================================ */
function tryParseDate(raw: string): Date | null {
  if (!raw) return null;

  const value = raw.trim();

  // 1. Intento directo con Date()
  const direct = new Date(value);
  if (!isNaN(direct.getTime())) return direct;

  // 2. Formatos día/mes/año comunes
  const dmYPatterns = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // 13/09/1984 o 13-09-1984
  ];

  for (const pattern of dmYPatterns) {
    const match = value.match(pattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // month index starts at 0
      const year = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Fechas tipo "13 Sep 1984" o "13 septiembre 1984"
  const meses: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3,
    mayo: 4, junio: 5, julio: 6, agosto: 7,
    septiembre: 8, setiembre: 8, "sep": 8, "sept": 8,
    octubre: 9, noviembre: 10, diciembre: 11,
  };

  const words = value.toLowerCase().split(" ");
  if (words.length === 3) {
    const day = parseInt(words[0], 10);
    const monthWord = words[1];
    const year = parseInt(words[2], 10);

    if (meses[monthWord] !== undefined && !isNaN(day) && !isNaN(year)) {
      const d = new Date(year, meses[monthWord], day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null; // imposible parsear
}

/* ============================================================
   GET → Obtener fechaNacimiento del usuario administrador
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

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: negocio.usuarioId },
      select: {
        id: true,
        fechaNacimiento: true,
        nombre: true,
        apellido: true,
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
        fechaNacimiento: usuario.fechaNacimiento,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error GET /usuario/fecha-nacimiento/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la fecha de nacimiento." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar fechaNacimiento
   Body esperado:
   { "fechaNacimiento": "1984-09-13" }
   O cualquier formato parseable.
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

    if (!body || typeof body.fechaNacimiento !== "string") {
      return NextResponse.json(
        { error: "Debes enviar 'fechaNacimiento' como string." },
        { status: 400 }
      );
    }

    // Intentar parsear la fecha
    const fecha = tryParseDate(body.fechaNacimiento);

    if (!fecha) {
      return NextResponse.json(
        {
          error:
            "Formato de fecha inválido. Intenta algo como: '1984-09-13', '13/09/1984', '13 septiembre 1984'.",
        },
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
        fechaNacimiento: fecha,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        fechaNacimiento: true,
        nombre: true,
        apellido: true,
      },
    });

    return NextResponse.json(
      {
        message: "Fecha de nacimiento actualizada correctamente.",
        user: usuarioActualizado,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error PATCH /usuario/fecha-nacimiento/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la fecha de nacimiento." },
      { status: 500 }
    );
  }
}
