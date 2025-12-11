import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Genero } from "@prisma/client";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Tipado de params dinámicos
   ============================================================ */
interface RouteParams {
  phone: string;
}

/* ============================================================
   Tipado del body PATCH
   ============================================================ */
interface UpdateGeneroBody {
  genero: string;
}

/* ============================================================
   Validar API Key
   ============================================================ */
function validateApiKey(req: Request): boolean {
  const headerKey = req.headers.get("x-api-key");
  return Boolean(headerKey && headerKey === ADMIN_KEY);
}

/* ============================================================
   Normalizar teléfono
   ============================================================ */
function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

/* ============================================================
   Validar género
   ============================================================ */
const GENEROS_VALIDOS: Genero[] = ["masculino", "femenino", "otro"];

function isValidGenero(value: string): value is Genero {
  return GENEROS_VALIDOS.includes(value.toLowerCase() as Genero);
}

/* ============================================================
   GET → Obtener género del usuario administrador
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<RouteParams> }
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

    // Buscar usuario administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: negocio.usuarioId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        genero: true,
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
        genero: usuario.genero,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /usuario/genero/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el género del usuario." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar género del usuario administrador
   ============================================================ */
export async function PATCH(
  req: Request,
  context: { params: Promise<RouteParams> }
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
    const body = (await req.json().catch(() => null)) as UpdateGeneroBody | null;

    if (!body || typeof body.genero !== "string") {
      return NextResponse.json(
        { error: "Debes enviar 'genero' como string." },
        { status: 400 }
      );
    }

    const nuevoGeneroRaw = body.genero.trim().toLowerCase();
    if (!isValidGenero(nuevoGeneroRaw)) {
      return NextResponse.json(
        {
          error: `Género inválido. Valores permitidos: ${GENEROS_VALIDOS.join(
            ", "
          )}.`,
        },
        { status: 400 }
      );
    }

    const nuevoGenero: Genero = nuevoGeneroRaw as Genero;

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
        genero: nuevoGenero,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        genero: true,
      },
    });

    return NextResponse.json(
      {
        message: "Género actualizado correctamente.",
        user: usuarioActualizado,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error PATCH /usuario/genero/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el género del usuario." },
      { status: 500 }
    );
  }
}
