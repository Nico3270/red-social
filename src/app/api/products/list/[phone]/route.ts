import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Validar API Key
   ============================================================ */
function validateApiKey(req: Request): boolean {
  const headerKey = req.headers.get("x-api-key");
  return Boolean(headerKey && headerKey === ADMIN_KEY);
}

/* ============================================================
   Normalizar número de teléfono
   ============================================================ */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  let cleaned = phone.replace(/[^\d+]/g, "");

  if (!cleaned.startsWith("+57")) {
    cleaned = "+57" + cleaned.replace(/^0+/, "");
  }

  return cleaned;
}

/* ============================================================
   Tipo del parámetro dinámico
   ============================================================ */
interface RouteParams {
  phone: string;
}

/* ============================================================
   GET → Listar productos del negocio por teléfono
   ============================================================ */
export async function GET(
  req: Request,
  context: { params: Promise<RouteParams> }
) {
  try {
    // Validar API KEY
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
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Número de teléfono inválido." },
        { status: 400 }
      );
    }

    // Búsqueda opcional (?q=hamb)
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;

    // Buscar negocio por teléfono
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: { id: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "No existe un negocio con este número de teléfono." },
        { status: 404 }
      );
    }

    /* ============================================================
       Construcción del filtro de productos (sin any)
       ============================================================ */
    const productWhere: {
      negocioId: string;
      nombre?: { contains: string; mode: "insensitive" };
    } = {
      negocioId: negocio.id,
    };

    if (q) {
      productWhere.nombre = {
        contains: q,
        mode: "insensitive",
      };
    }

    /* ============================================================
       Obtener productos: respuesta ligera
       ============================================================ */
    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        nombre: true,
        precio: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        negocioId: negocio.id,
        total: products.length,
        products,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error GET /api/products/list/[phone]:", error);

    return NextResponse.json(
      { error: "Error interno al obtener productos." },
      { status: 500 }
    );
  }
}
