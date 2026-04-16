// /ui/actions/productos/updateProduct.ts
"use server";

import prisma from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import { auth } from "@/auth.config";

interface UpdateProductResult {
  ok: boolean;
  product?: {
    id: string;
    slug: string;
  };
  message?: string;
}

interface AttributeInput {
  nombre: string;
  valor: string;
}

interface VariantOptionInput {
  nombre: string;
  valor: string;
}

interface VariantInput {
  nombre?: string | null;
  sku?: string | null;
  precio?: number | null;
  stock?: number | null;
  stockIlimitado?: boolean;
  imagenUrl?: string | null;
  isActive?: boolean;
  options?: VariantOptionInput[];
}

const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\//;

const normalizeString = (value: FormDataEntryValue | null): string => {
  return typeof value === "string" ? value.trim() : "";
};

const parseBoolean = (value: FormDataEntryValue | null, defaultValue = false): boolean => {
  if (typeof value !== "string") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return defaultValue;
};

const parseOptionalNumber = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeJsonParse = <T>(value: FormDataEntryValue | null, fallback: T): T => {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export async function updateProduct(
  productId: string,
  formData: FormData
): Promise<UpdateProductResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "No estás autenticado. Por favor, inicia sesión.",
    };
  }

  try {
    const userSessionId = session.user.id;

    const nombre = normalizeString(formData.get("nombre"));
    const precio = parseOptionalNumber(formData.get("precio"));
    const descripcion = normalizeString(formData.get("descripcion"));
    const descripcionCortaRaw = normalizeString(formData.get("descripcionCorta"));
    const descripcionCorta = descripcionCortaRaw || null;
    const slug = normalizeString(formData.get("slug"));
    const prioridad = parseOptionalNumber(formData.get("prioridad"));
    const statusRaw = normalizeString(formData.get("status")) as ProductStatus;
    const tagsRaw = normalizeString(formData.get("tags"));
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    const seccionIds = formData
      .getAll("seccionIds")
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    const imageUrls = formData
      .getAll("imageUrls")
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    const componentes = formData
      .getAll("componentes")
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    const categoryId = normalizeString(formData.get("categoriaId"));

    const stock = parseOptionalNumber(formData.get("stock"));
    const stockIlimitado = parseBoolean(formData.get("stockIlimitado"), true);
    const usaVariantes = parseBoolean(formData.get("usaVariantes"), false);

    const atributos = safeJsonParse<AttributeInput[]>(formData.get("atributos"), [])
      .map((item) => ({
        nombre: item?.nombre?.trim?.() || "",
        valor: item?.valor?.trim?.() || "",
      }))
      .filter((item) => item.nombre && item.valor);

    const variantes = safeJsonParse<VariantInput[]>(formData.get("variantes"), [])
      .map((variant) => ({
        nombre: variant?.nombre?.trim?.() || null,
        sku: variant?.sku?.trim?.() || null,
        precio:
          typeof variant?.precio === "number" && Number.isFinite(variant.precio)
            ? variant.precio
            : null,
        stock:
          typeof variant?.stock === "number" && Number.isFinite(variant.stock)
            ? variant.stock
            : null,
        stockIlimitado:
          typeof variant?.stockIlimitado === "boolean" ? variant.stockIlimitado : true,
        imagenUrl: variant?.imagenUrl?.trim?.() || null,
        isActive: typeof variant?.isActive === "boolean" ? variant.isActive : true,
        options: Array.isArray(variant?.options)
          ? variant.options
              .map((option) => ({
                nombre: option?.nombre?.trim?.() || "",
                valor: option?.valor?.trim?.() || "",
              }))
              .filter((option) => option.nombre && option.valor)
          : [],
      }))
      .filter((variant) => {
        return (
          variant.nombre ||
          variant.sku ||
          variant.precio !== null ||
          variant.stock !== null ||
          variant.imagenUrl ||
          variant.options.length > 0
        );
      });

    if (!productId) {
      return { ok: false, message: "El ID del producto es obligatorio." };
    }

    if (!nombre || !descripcion || precio === null || !slug || !categoryId) {
      return {
        ok: false,
        message:
          "Faltan datos obligatorios: nombre, descripción, precio, slug o categoría.",
      };
    }

    if (precio < 0) {
      return {
        ok: false,
        message: "El precio no puede ser negativo.",
      };
    }

    if (imageUrls.length === 0) {
      return {
        ok: false,
        message: "Debes mantener al menos una imagen para el producto.",
      };
    }

    if (prioridad !== null && !Number.isInteger(prioridad)) {
      return {
        ok: false,
        message: "La prioridad debe ser un número entero válido.",
      };
    }

    if (!Object.values(ProductStatus).includes(statusRaw)) {
      return {
        ok: false,
        message: "El estado del producto no es válido.",
      };
    }

    if (!imageUrls.every((url) => cloudinaryUrlPattern.test(url))) {
      return {
        ok: false,
        message: "Una o más URLs de imágenes no son válidas.",
      };
    }

    const negocio = await prisma.negocio.findUnique({
      where: { usuarioId: userSessionId },
      select: { id: true, slug: true },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "El usuario no tiene un negocio asociado.",
      };
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        negocioId: true,
      },
    });

    if (!existingProduct) {
      return {
        ok: false,
        message: "El producto especificado no existe.",
      };
    }

    if (existingProduct.negocioId !== negocio.id) {
      return {
        ok: false,
        message: "El producto no pertenece al negocio del usuario.",
      };
    }

    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!categoryExists) {
      return {
        ok: false,
        message: "La categoría especificada no existe.",
      };
    }

    if (seccionIds.length > 0) {
      const sectionsExist = await prisma.section.findMany({
        where: { id: { in: seccionIds } },
        select: { id: true },
      });

      if (sectionsExist.length !== seccionIds.length) {
        return {
          ok: false,
          message: "Una o más secciones especificadas no existen.",
        };
      }
    }

    const duplicateSlug = await prisma.product.findFirst({
      where: {
        slug,
        id: { not: productId },
      },
      select: { id: true },
    });

    if (duplicateSlug) {
      return {
        ok: false,
        message: "El slug ya está en uso. Por favor, utiliza uno diferente.",
      };
    }

    if (!usaVariantes) {
      if (!stockIlimitado && (stock === null || stock < 0)) {
        return {
          ok: false,
          message:
            "Si el producto no tiene stock ilimitado, debes indicar un stock válido.",
        };
      }
    }

    if (usaVariantes) {
      if (variantes.length === 0) {
        return {
          ok: false,
          message: "Debes agregar al menos una variante válida.",
        };
      }

      for (const variant of variantes) {
        if (!variant.stockIlimitado && (variant.stock === null || variant.stock < 0)) {
          return {
            ok: false,
            message:
              "Todas las variantes con stock limitado deben tener un stock válido.",
          };
        }

        if (variant.imagenUrl && !cloudinaryUrlPattern.test(variant.imagenUrl)) {
          return {
            ok: false,
            message: "Una o más imágenes de variantes no tienen una URL válida.",
          };
        }
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          nombre,
          precio,
          descripcion,
          descripcionCorta: descripcionCorta || undefined,
          slug,
          prioridad,
          status: statusRaw,
          tags,
          componentes,
          negocioId: negocio.id,
          categoryId,
          stock: !usaVariantes && !stockIlimitado ? stock : null,
          stockIlimitado: usaVariantes ? true : stockIlimitado,
          usaVariantes,
        },
      });

      await tx.image.deleteMany({
        where: { productId },
      });

      await tx.image.createMany({
        data: imageUrls.map((url) => ({
          url,
          productId,
        })),
      });

      await tx.productSection.deleteMany({
        where: { productId },
      });

      if (seccionIds.length > 0) {
        await tx.productSection.createMany({
          data: seccionIds.map((sectionId) => ({
            productId,
            sectionId,
          })),
        });
      }

      await tx.productAttribute.deleteMany({
        where: { productId },
      });

      if (atributos.length > 0) {
        await tx.productAttribute.createMany({
          data: atributos.map((atributo, index) => ({
            productId,
            nombre: atributo.nombre,
            valor: atributo.valor,
            orden: index,
          })),
        });
      }

      await tx.productVariant.deleteMany({
        where: { productId },
      });

      if (usaVariantes && variantes.length > 0) {
        for (let variantIndex = 0; variantIndex < variantes.length; variantIndex++) {
          const variant = variantes[variantIndex];

          const createdVariant = await tx.productVariant.create({
            data: {
              productId,
              nombre: variant.nombre || undefined,
              sku: variant.sku || undefined,
              precio: variant.precio,
              stock: variant.stockIlimitado ? null : variant.stock,
              stockIlimitado: variant.stockIlimitado ?? true,
              imagenUrl: variant.imagenUrl || undefined,
              isActive: variant.isActive ?? true,
              orden: variantIndex,
            },
          });

          if (variant.options.length > 0) {
            await tx.productVariantOption.createMany({
              data: variant.options.map((option, optionIndex) => ({
                variantId: createdVariant.id,
                nombre: option.nombre,
                valor: option.valor,
                orden: optionIndex,
              })),
            });
          }
        }
      }

      return product;
    });

    return {
      ok: true,
      product: {
        id: updatedProduct.id,
        slug: updatedProduct.slug,
      },
    };
  } catch (error: unknown) {
    console.error("Error al actualizar producto:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          message: "El slug ya está en uso.",
        };
      }

      if (error.code === "P2003") {
        return {
          ok: false,
          message:
            "Error de integridad: categoría, secciones o relaciones no válidas.",
        };
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido en el servidor";

    return {
      ok: false,
      message: `Error inesperado al actualizar el producto: ${errorMessage}`,
    };
  }
}