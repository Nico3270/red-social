"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { EstadoNegocio, ProductStatus } from "@prisma/client";
import { z } from "zod";

const inputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  productIds: z
    .array(z.string().trim().min(1, "Cada producto debe tener id."))
    .min(1, "Selecciona al menos un producto.")
    .max(80, "Consulta máximo 80 productos por lote."),
});

export type GetAdminBatchProductsReadinessActionInput = z.input<
  typeof inputSchema
>;

export interface AdminBatchProductReadiness {
  id: string;
  nombre: string;
  slug: string;
  status: ProductStatus;
  negocioId: string;
  negocioNombre: string;
  precio: number;
  categoryName: string;
  categorySlug: string;
  imageCount: number;
  sectionCount: number;
  catalogGroupCount: number;
  readyToPublish: boolean;
  blockers: string[];
  signals: string[];
}

export interface GetAdminBatchProductsReadinessActionResult {
  ok: boolean;
  data: {
    products: AdminBatchProductReadiness[];
    missingProductIds: string[];
  } | null;
  error: string | null;
  validationErrors?: string[];
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function buildReadiness(product: {
  id: string;
  nombre: string;
  slug: string;
  status: ProductStatus;
  negocioId: string;
  precio: number;
  category: { nombre: string; slug: string };
  negocio: {
    nombre: string;
    estado: EstadoNegocio;
    archivedAt: Date | null;
  };
  _count: {
    imagenes: number;
    secciones: number;
    catalogGroupProducts: number;
  };
}): AdminBatchProductReadiness {
  const blockers: string[] = [];
  const signals: string[] = [];

  if (
    product.negocio.archivedAt ||
    product.negocio.estado !== EstadoNegocio.activo
  ) {
    blockers.push("El negocio no está activo.");
  }

  if (!product.nombre.trim()) {
    blockers.push("Sin nombre.");
  }

  if (!Number.isFinite(product.precio) || product.precio < 0) {
    blockers.push("Precio inválido.");
  }

  if (product._count.imagenes === 0) {
    blockers.push("Sin imagen.");
    signals.push("sin imagen");
  }

  if (product._count.secciones === 0) {
    signals.push("sin sección resuelta");
  }

  if (product._count.catalogGroupProducts === 0) {
    signals.push("sin groups");
  }

  if (product.status === ProductStatus.disponible) {
    signals.push("ya publicado");
  }

  const readyToPublish =
    blockers.length === 0 && product.status !== ProductStatus.disponible;

  signals.push(readyToPublish ? "listo para publicar" : "requiere revisión");

  return {
    id: product.id,
    nombre: product.nombre,
    slug: product.slug,
    status: product.status,
    negocioId: product.negocioId,
    negocioNombre: product.negocio.nombre,
    precio: product.precio,
    categoryName: product.category.nombre,
    categorySlug: product.category.slug,
    imageCount: product._count.imagenes,
    sectionCount: product._count.secciones,
    catalogGroupCount: product._count.catalogGroupProducts,
    readyToPublish,
    blockers,
    signals,
  };
}

export async function getAdminBatchProductsReadinessAction(
  rawInput: GetAdminBatchProductsReadinessActionInput,
): Promise<GetAdminBatchProductsReadinessActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { ok: false, data: null, error: "No autorizado." };
    }

    if (session.user.role !== "super_admin") {
      return {
        ok: false,
        data: null,
        error: "No tienes permisos para consultar productos administrativos.",
      };
    }

    const parsedInput = inputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa los productos antes de consultar su estado.",
        validationErrors: parsedInput.error.issues.map(
          (issue) => `${issue.path.join(".") || "productos"}: ${issue.message}`,
        ),
      };
    }

    const productIds = uniqueValues(parsedInput.data.productIds);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        negocioId: parsedInput.data.businessId,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        status: true,
        negocioId: true,
        precio: true,
        category: {
          select: {
            nombre: true,
            slug: true,
          },
        },
        negocio: {
          select: {
            nombre: true,
            estado: true,
            archivedAt: true,
          },
        },
        _count: {
          select: {
            imagenes: true,
            secciones: true,
            catalogGroupProducts: true,
          },
        },
      },
    });

    const foundIds = new Set(products.map((product) => product.id));
    const orderedProducts = productIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is NonNullable<typeof product> =>
        Boolean(product),
      );

    return {
      ok: true,
      data: {
        products: orderedProducts.map(buildReadiness),
        missingProductIds: productIds.filter((id) => !foundIds.has(id)),
      },
      error: null,
    };
  } catch (error) {
    console.error("[getAdminBatchProductsReadinessAction] Error", { error });

    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible consultar el estado post-batch.",
    };
  }
}
