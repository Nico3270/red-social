// app/api/business/ciudad/[phone]/route.ts

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
   GET → Obtener ciudad y departamento del negocio
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
        ciudad: true,
        departamento: true,
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
        ciudad: negocio.ciudad,
        departamento: negocio.departamento,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /business/ciudad/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener la ciudad del negocio." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar ciudad y departamento del negocio
   Body esperado:
   {
     "ciudad": "Medellín",
     "departamento": "Antioquia"
   }
   Ambos son requeridos.
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

    if (!body || typeof body.ciudad !== "string" || typeof body.departamento !== "string") {
      return NextResponse.json(
        { error: "Debes enviar 'ciudad' y 'departamento' como strings." },
        { status: 400 }
      );
    }

    const nuevaCiudad = body.ciudad.trim();
    const nuevoDepartamento = body.departamento.trim();

    if (nuevaCiudad.length < 2) {
      return NextResponse.json(
        { error: "La ciudad es demasiado corta." },
        { status: 400 }
      );
    }

    if (nuevoDepartamento.length < 2) {
      return NextResponse.json(
        { error: "El departamento es demasiado corto." },
        { status: 400 }
      );
    }

    // Buscar negocio por teléfono
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

    // Actualizar ciudad y departamento
    const actualizado = await prisma.negocio.update({
      where: { id: negocio.id },
      data: {
        ciudad: nuevaCiudad,
        departamento: nuevoDepartamento,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        departamento: true,
      },
    });

    return NextResponse.json(
      {
        message: "Ciudad y departamento actualizados correctamente.",
        business: actualizado,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error PATCH /business/ciudad/[phone]:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar la ciudad del negocio." },
      { status: 500 }
    );
  }
}
