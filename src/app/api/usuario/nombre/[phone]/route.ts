import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Tipado de params
   ============================================================ */
interface RouteParams {
  phone: string;
}

/* ============================================================
   Tipado del body PATCH
   ============================================================ */
interface UpdateNombreBody {
  nombre: string;
  apellido?: string;
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
   GET → Obtener nombre del usuario administrador
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

    // Buscar negocio asociado
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: { usuarioId: true, nombre: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "No se encontró un negocio asociado a este teléfono." },
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
        { error: "Usuario administrador no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        userId: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        negocio: negocio.nombre,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /usuario/nombre/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el nombre del usuario." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar nombre y apellido del usuario administrador
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

    const body = (await req.json().catch(() => null)) as UpdateNombreBody | null;

    if (!body || typeof body.nombre !== "string") {
      return NextResponse.json(
        { error: "Debes enviar un campo 'nombre' como string." },
        { status: 400 }
      );
    }

    const nuevoNombre = body.nombre.trim();
    const nuevoApellido =
      typeof body.apellido === "string" ? body.apellido.trim() : undefined;

    if (nuevoNombre.length < 2) {
      return NextResponse.json(
        { error: "El nombre es demasiado corto." },
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
        { error: "No existe negocio asociado a este teléfono." },
        { status: 404 }
      );
    }

    /* ============================================================
       Construcción del payload sin ANY (tipado seguro)
       ============================================================ */
    const dataUpdate: Partial<{
      nombre: string;
      apellido: string;
      updatedAt: Date;
    }> = {
      nombre: nuevoNombre,
      updatedAt: new Date(),
    };

    if (nuevoApellido) {
      dataUpdate.apellido = nuevoApellido;
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: negocio.usuarioId },
      data: dataUpdate,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        message: "Nombre actualizado correctamente.",
        user: usuarioActualizado,
        negocioAsociado: negocio.nombre,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error PATCH /usuario/nombre/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar el nombre del usuario." },
      { status: 500 }
    );
  }
}
