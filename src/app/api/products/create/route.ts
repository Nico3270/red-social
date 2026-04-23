//src/app/api/products/create/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ProductStatus, Currency } from "@prisma/client";
import {
  buildSlugBase,
  generateShortSlugSuffix,
  hasShortSlugSuffix,
  normalizeUrlSlug,
  withShortSlugSuffix,
} from "@/lib/slug/slugUtils";

/* ============================================================
   Tipado del body esperado
   ============================================================ */
interface CreateProductBody {
  negocioPhone: string;
  nombre: string;
  descripcion: string;
  descripcionCorta?: string | null;
  precio: number;
  currency?: Currency;
  prioridad?: number | null;
  status?: ProductStatus;
  tags?: string[];
  componentes?: string[];
  categoryId: string;
  imagenes: string[];
  seccionIds?: string[];
}

/* ============================================================
   Validar API Key
   ============================================================ */
function validateApiKey(req: Request): boolean {
  const headerKey = req.headers.get("x-api-key");
  return Boolean(headerKey && headerKey === process.env.MYCKEO_ADMIN_KEY);
}

/* ============================================================
   Normalizar teléfono
   ============================================================ */
function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

const MAX_SLUG_ATTEMPTS = 40;

/* ============================================================
   Validar URL Cloudinary
   ============================================================ */
function isCloudinaryUrl(url: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\//.test(url);
}

async function buildUniqueProductSlug(nombre: string) {
  const baseSlug = buildSlugBase(nombre, nombre);

  if (!baseSlug) {
    throw new Error("No fue posible construir un slug válido para el producto.");
  }

  const baseWithoutExistingSuffix = hasShortSlugSuffix(baseSlug)
    ? baseSlug.slice(0, -5)
    : baseSlug;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 0
        ? withShortSlugSuffix(baseSlug)
        : `${normalizeUrlSlug(baseWithoutExistingSuffix, 135)}-${generateShortSlugSuffix()}`;
    const existingSlug = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existingSlug) return candidate;
  }

  return `${normalizeUrlSlug(baseSlug, 128)}-${Date.now().toString(36)}`;
}

/* ============================================================
   POST → Crear producto
   ============================================================ */
export async function POST(req: Request) {
  try {
    // Validar API KEY
    if (!validateApiKey(req)) {
      return NextResponse.json(
        { error: "Unauthorized: invalid API key." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as CreateProductBody | null;

    if (!body) {
      return NextResponse.json(
        { error: "Debe enviar un JSON válido en el body." },
        { status: 400 }
      );
    }

    const {
      negocioPhone,
      nombre,
      descripcion,
      descripcionCorta = null,
      precio,
      currency = "COP",
      prioridad = null,
      status = "disponible",
      tags = [],
      componentes = [],
      categoryId,
      imagenes = [],
      seccionIds = [],
    } = body;

    /* ============================================================
       Validar campos obligatorios
       ============================================================ */
    if (!negocioPhone || !nombre || !descripcion || !precio || !categoryId) {
      return NextResponse.json(
        {
          error:
            "Faltan datos obligatorios: negocioPhone, nombre, descripcion, precio o categoryId.",
        },
        { status: 400 }
      );
    }

    if (typeof precio !== "number" || isNaN(precio)) {
      return NextResponse.json(
        { error: "El campo 'precio' debe ser un número válido." },
        { status: 400 }
      );
    }

    if (prioridad !== null && (typeof prioridad !== "number" || isNaN(prioridad))) {
      return NextResponse.json(
        { error: "La prioridad debe ser un número o null." },
        { status: 400 }
      );
    }

    if (!Array.isArray(imagenes) || imagenes.length === 0) {
      return NextResponse.json(
        { error: "El producto debe tener al menos una imagen." },
        { status: 400 }
      );
    }

    if (!imagenes.every(isCloudinaryUrl)) {
      return NextResponse.json(
        { error: "Una o más imágenes no tienen formato Cloudinary válido." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(negocioPhone);

    /* ============================================================
       Buscar negocio por teléfono
       ============================================================ */
    const negocio = await prisma.negocio.findFirst({
      where: { telefonoContacto: normalizedPhone },
      select: { id: true },
    });

    if (!negocio) {
      return NextResponse.json(
        { error: "No existe un negocio asociado a este número de teléfono." },
        { status: 404 }
      );
    }

    /* ============================================================
       Verificar categoría por ID
       ============================================================ */
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!categoryExists) {
      return NextResponse.json(
        { error: `La categoría con id '${categoryId}' no existe.` },
        { status: 404 }
      );
    }

    /* ============================================================
       Verificar secciones
       ============================================================ */
    if (seccionIds.length > 0) {
      const sectionsExist = await prisma.section.findMany({
        where: { id: { in: seccionIds } },
        select: { id: true },
      });

      if (sectionsExist.length !== seccionIds.length) {
        return NextResponse.json(
          { error: "Una o más secciones enviadas no existen." },
          { status: 400 }
        );
      }
    }

    const slug = await buildUniqueProductSlug(nombre);

    /* ============================================================
       Transacción completa
       ============================================================ */
    const createdProduct = await prisma.$transaction(async (tx) => {
      // 1. Crear producto
      const product = await tx.product.create({
        data: {
          nombre,
          slug,
          descripcion,
          descripcionCorta: descripcionCorta ?? null,
          precio,
          currency,
          prioridad,
          status,
          componentes,
          tags,
          negocioId: negocio.id,
          categoryId,
        },
      });

      const productId = product.id;

      // 2. Insertar imágenes
      await tx.image.createMany({
        data: imagenes.map((url: string) => ({
          url,
          productId,
        })),
      });

      // 3. Insertar secciones
      if (seccionIds.length > 0) {
        await tx.productSection.createMany({
          data: seccionIds.map((sectionId: string) => ({
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
        message: "Producto creado correctamente.",
        product: createdProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error en POST /api/products/create:", error);

    const err = error as { code?: string };

    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "El slug ya está en uso. Intenta otro nombre." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno al crear el producto." },
      { status: 500 }
    );
  }
}
