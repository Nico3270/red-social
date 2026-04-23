"use server";

import { auth } from "@/auth.config";
import { logProductImageDiagnostics } from "@/lib/media/productImageDiagnostics";
import prisma from "@/lib/prisma";
import { EstadoNegocio, Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidateAdminProductSurfaces } from "./revalidateAdminProductSurfaces";

const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\//;

const attachAdminProductImagesInputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  productId: z.string().trim().min(1, "El producto es obligatorio."),
  imageUrls: z
    .array(
      z
        .string()
        .trim()
        .url("Cada imagen debe ser una URL válida.")
        .refine(
          (url) => cloudinaryUrlPattern.test(url),
          "Las imágenes deben venir de Cloudinary.",
        ),
    )
    .max(12, "Usa máximo 12 imágenes por producto.")
    .default([]),
});

export type AttachAdminProductImagesActionInput = z.input<
  typeof attachAdminProductImagesInputSchema
>;

export interface AttachAdminProductImagesActionResult {
  ok: boolean;
  data: {
    productId: string;
    negocioId: string;
    imageUrls: string[];
    imageCount: number;
  } | null;
  error: string | null;
  validationErrors?: string[];
}

function uniqueUrls(urls: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export async function attachAdminProductImagesAction(
  rawInput: AttachAdminProductImagesActionInput,
): Promise<AttachAdminProductImagesActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { ok: false, data: null, error: "No autorizado." };
    }

    if (session.user.role !== "super_admin") {
      return {
        ok: false,
        data: null,
        error: "No tienes permisos para modificar imágenes administrativas.",
      };
    }

    const parsedInput = attachAdminProductImagesInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa las imágenes antes de guardarlas.",
        validationErrors: parsedInput.error.issues.map(
          (issue) => `${issue.path.join(".") || "imagenes"}: ${issue.message}`,
        ),
      };
    }

    const { businessId, productId } = parsedInput.data;
    const imageUrls = uniqueUrls(parsedInput.data.imageUrls);

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        negocioId: businessId,
      },
      select: {
        id: true,
        slug: true,
        nombre: true,
        status: true,
        negocioId: true,
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

    if (
      product.negocio.archivedAt ||
      product.negocio.estado !== EstadoNegocio.activo
    ) {
      return {
        ok: false,
        data: null,
        error: "El negocio no está activo para modificar imágenes.",
      };
    }

    const storedImages = await prisma.$transaction(async (tx) => {
      await tx.image.deleteMany({
        where: { productId: product.id },
      });

      if (imageUrls.length > 0) {
        await tx.image.createMany({
          data: imageUrls.map((url) => ({
            productId: product.id,
            url,
          })),
        });
      }

      return tx.image.findMany({
        where: { productId: product.id },
        select: {
          id: true,
          url: true,
        },
      });
    });

    logProductImageDiagnostics({
      area: "admin-product-images",
      event: "db_images_attached",
      message: "Imágenes asociadas al producto desde el flujo admin.",
      product: {
        id: product.id,
        slug: product.slug,
        nombre: product.nombre,
        status: product.status,
        negocioSlug: product.negocio.slug,
      },
      imageUrls: storedImages.map((image) => image.url),
      context: {
        inputImageCount: imageUrls.length,
        storedImageRows: storedImages.map((image) => ({
          id: image.id,
          url: image.url,
        })),
      },
      dedupeKey: `admin-images-attached:${product.id}:${storedImages.length}`,
    });

    revalidateAdminProductSurfaces({
      businessSlug: product.negocio.slug,
      productSlug: product.slug,
    });

    return {
      ok: true,
      data: {
        productId: product.id,
        negocioId: product.negocioId,
        imageUrls,
        imageCount: imageUrls.length,
      },
      error: null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        ok: false,
        data: null,
        error: "Error de integridad al asociar imágenes al producto.",
      };
    }

    console.error("[attachAdminProductImagesAction] Error", { error });

    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible guardar las imágenes del producto.",
    };
  }
}
