"use server";

import { auth } from "@/auth.config";
import { logProductImageDiagnostics } from "@/lib/media/productImageDiagnostics";
import prisma from "@/lib/prisma";
import { EstadoNegocio, Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { revalidateAdminProductSurfaces } from "./revalidateAdminProductSurfaces";

const publishAdminProductInputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  productId: z.string().trim().min(1, "El producto es obligatorio."),
});

export type PublishAdminProductActionInput = z.input<
  typeof publishAdminProductInputSchema
>;

export interface PublishAdminProductActionResult {
  ok: boolean;
  data: {
    product: {
      id: string;
      nombre: string;
      slug: string;
      status: ProductStatus;
      negocioId: string;
      imageCount: number;
    };
  } | null;
  error: string | null;
  validationErrors?: string[];
}

export async function publishAdminProductAction(
  rawInput: PublishAdminProductActionInput,
): Promise<PublishAdminProductActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { ok: false, data: null, error: "No autorizado." };
    }

    if (session.user.role !== "super_admin") {
      return {
        ok: false,
        data: null,
        error: "No tienes permisos para publicar productos administrativos.",
      };
    }

    const parsedInput = publishAdminProductInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa los datos antes de publicar.",
        validationErrors: parsedInput.error.issues.map(
          (issue) => `${issue.path.join(".") || "producto"}: ${issue.message}`,
        ),
      };
    }

    const { businessId, productId } = parsedInput.data;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        negocioId: businessId,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        precio: true,
        status: true,
        negocioId: true,
        imagenes: {
          select: { id: true, url: true },
        },
        negocio: {
          select: {
            slug: true,
            estado: true,
            archivedAt: true,
          },
        },
      },
    });

    if (!product) {
      return {
        ok: false,
        data: null,
        error: "El producto no existe o no pertenece al negocio seleccionado.",
      };
    }

    const validationErrors: string[] = [];

    if (
      product.negocio.archivedAt ||
      product.negocio.estado !== EstadoNegocio.activo
    ) {
      validationErrors.push(
        "El negocio debe estar activo para publicar productos.",
      );
    }

    if (!product.nombre.trim()) {
      validationErrors.push("El producto necesita nombre antes de publicarse.");
    }

    if (!Number.isFinite(product.precio) || product.precio < 0) {
      validationErrors.push(
        "El producto necesita un precio válido antes de publicarse.",
      );
    }

    if (product.imagenes.length === 0) {
      validationErrors.push(
        "El producto debe tener al menos una imagen antes de publicarse.",
      );
    }

    if (validationErrors.length > 0) {
      return {
        ok: false,
        data: null,
        error: "El producto todavía no cumple los requisitos de publicación.",
        validationErrors,
      };
    }

    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.disponible },
      select: {
        id: true,
        nombre: true,
        slug: true,
        status: true,
        negocioId: true,
        _count: {
          select: { imagenes: true },
        },
      },
    });

    logProductImageDiagnostics({
      area: "admin-product-publish",
      event: "publish_images_snapshot",
      message: "Snapshot de imágenes antes de publicar el producto admin.",
      product: {
        id: product.id,
        slug: product.slug,
        nombre: product.nombre,
        status: updatedProduct.status,
        negocioSlug: product.negocio.slug,
      },
      imageUrls: product.imagenes.map((image) => image.url),
      context: {
        imageCount: product.imagenes.length,
      },
      dedupeKey: `admin-product-publish-images:${product.id}:${product.imagenes.length}`,
    });

    revalidateAdminProductSurfaces({
      businessSlug: product.negocio.slug,
      productSlug: updatedProduct.slug,
      includeProductCount: true,
    });

    return {
      ok: true,
      data: {
        product: {
          id: updatedProduct.id,
          nombre: updatedProduct.nombre,
          slug: updatedProduct.slug,
          status: updatedProduct.status,
          negocioId: updatedProduct.negocioId,
          imageCount: updatedProduct._count.imagenes,
        },
      },
      error: null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        ok: false,
        data: null,
        error: "El producto ya no existe.",
      };
    }

    console.error("[publishAdminProductAction] Error", { error });

    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible publicar el producto.",
    };
  }
}
