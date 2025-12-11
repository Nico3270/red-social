import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ProductStatus, Currency } from "@prisma/client";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;

/* ============================================================
   Tipado de parámetros dinámicos
   ============================================================ */
interface RouteParams {
  id: string;
}

/* ============================================================
   Tipado del body PATCH
   ============================================================ */
interface UpdateProductBody {
  nombre?: string;
  descripcion?: string;
  descripcionCorta?: string | null;
  precio?: number;
  prioridad?: number | null;
  status?: ProductStatus;
  currency?: Currency;
  tags?: string[];
  componentes?: string[];
  categoryId?: string;
  imagenes?: string[] | string | null;
  seccionIds?: string[] | string | null;
}

/* ============================================================
   Validar API KEY
   ============================================================ */
function validateApiKey(req: Request): boolean {
  const header = req.headers.get("x-api-key");
  return Boolean(header && header === ADMIN_KEY);
}

/* ============================================================
   Normalizar arrays (evitar null, strings inválidos)
   ============================================================ */
function ensureArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
}

/* ============================================================
   GET → Obtener producto completo por ID
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del producto." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        imagenes: true,
        secciones: { include: { section: true } },
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("❌ Error GET /api/products/update/[id]:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el producto." },
      { status: 500 }
    );
  }
}

/* ============================================================
   PATCH → Actualizar producto completo
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

    const { id: productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el ID del producto." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as UpdateProductBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "Debes enviar un body JSON válido." },
        { status: 400 }
      );
    }

    const {
      nombre,
      descripcion,
      descripcionCorta,
      precio,
      prioridad,
      status,
      currency,
      tags,
      componentes,
      categoryId,
      imagenes,
      seccionIds,
    } = body;

    /* ============================================================
       Verificar existencia del producto
       ============================================================ */
    const existing = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 }
      );
    }

    /* ============================================================
       Validar categoría si viene
       ============================================================ */
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        return NextResponse.json(
          { error: "La categoría enviada no existe." },
          { status: 400 }
        );
      }
    }

    /* ============================================================
       Validar secciones si vienen
       ============================================================ */
    const finalSections = ensureArray(seccionIds);

    if (finalSections.length > 0) {
      const sectionsExist = await prisma.section.findMany({
        where: { id: { in: finalSections } },
      });

      if (sectionsExist.length !== finalSections.length) {
        return NextResponse.json(
          { error: "Una o más secciones enviadas no existen." },
          { status: 400 }
        );
      }
    }

    /* ============================================================
       Validar imágenes si vienen
       ============================================================ */
    const finalImages = ensureArray(imagenes);

    if (finalImages.length > 0) {
      const isValid = finalImages.every((url) =>
        /^https:\/\/res\.cloudinary\.com\//.test(url)
      );
      if (!isValid) {
        return NextResponse.json(
          { error: "Una o más imágenes no son URLs Cloudinary válidas." },
          { status: 400 }
        );
      }
    }

    /* ============================================================
       Transacción: actualizar producto + imágenes + secciones
       ============================================================ */
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Actualizar base del producto
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          nombre: nombre ?? undefined,
          descripcion: descripcion ?? undefined,
          descripcionCorta: descripcionCorta ?? undefined,
          precio: precio ?? undefined,
          prioridad: prioridad ?? undefined,
          status: status ?? undefined,
          currency: currency ?? undefined,
          tags: tags ?? undefined,
          componentes: componentes ?? undefined,
          categoryId: categoryId ?? undefined,
        },
      });

      // 2. Reemplazar imágenes si vienen nuevas
      if (finalImages.length > 0) {
        await tx.image.deleteMany({ where: { productId } });

        await tx.image.createMany({
          data: finalImages.map((url) => ({ url, productId })),
        });
      }

      // 3. Reemplazar secciones si vienen nuevas
      if (finalSections.length > 0) {
        await tx.productSection.deleteMany({ where: { productId } });

        await tx.productSection.createMany({
          data: finalSections.map((sectionId) => ({
            productId,
            sectionId,
          })),
        });
      }

      return product;
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Producto actualizado correctamente.",
        product: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error PATCH /api/products/update/[id]:", error);

    const err = error as { code?: string };

    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Slug en uso. Intente otro." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno al actualizar el producto." },
      { status: 500 }
    );
  }
}
