"use server";

import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { Prisma, Product, ProductStatus } from "@prisma/client";
import { auth } from "@/auth.config";
import { revalidateTag } from "next/cache";
import {
  buildSlugBase,
  generateShortSlugSuffix,
  hasShortSlugSuffix,
  normalizeUrlSlug,
  withShortSlugSuffix,
} from "@/lib/slug/slugUtils";

interface CreacionProduct {
  ok: boolean;
  message: string;
  product?: Product;
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiDescriptionModel =
  process.env.OPENAI_PRODUCT_DESCRIPTION_MODEL || "gpt-4o";

const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\//;
const MAX_SLUG_ATTEMPTS = 40;

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

async function buildUniqueProductSlug(slugInput: string, fallbackName: string) {
  const baseSlug = buildSlugBase(slugInput, fallbackName);

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
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
  }

  return `${normalizeUrlSlug(baseSlug, 128)}-${Date.now().toString(36)}`;
}

export async function createProduct(formData: FormData): Promise<CreacionProduct> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      message: "No estás autenticado. Por favor, inicia sesión.",
    };
  }

  try {
    const usuarioId = session.user.id;

    const negocio = await prisma.negocio.findUnique({
      where: { usuarioId },
      select: { id: true, slug: true },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "El usuario no tiene un negocio asociado.",
      };
    }

    const nombre = normalizeString(formData.get("nombre"));
    const precio = parseOptionalNumber(formData.get("precio"));
    const descripcion = normalizeString(formData.get("descripcion"));
    const descripcionCortaRaw = normalizeString(formData.get("descripcionCorta"));
    const descripcionCorta = descripcionCortaRaw || null;
    const slugInput = normalizeString(formData.get("slug"));
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

    if (!nombre || !descripcion || precio === null || !categoryId) {
      return {
        ok: false,
        message:
          "Faltan datos obligatorios: nombre, descripción, precio o categoría.",
      };
    }

    if (imageUrls.length === 0) {
      return {
        ok: false,
        message: "Debes subir al menos una imagen antes de crear el producto.",
      };
    }

    if (precio < 0) {
      return {
        ok: false,
        message: "El precio no puede ser negativo.",
      };
    }

    if (prioridad !== null && !Number.isInteger(prioridad)) {
      return {
        ok: false,
        message: "La prioridad debe ser un número entero válido.",
      };
    }

    const validStatuses = Object.values(ProductStatus);
    if (!validStatuses.includes(statusRaw)) {
      return {
        ok: false,
        message: `El estado '${statusRaw}' no es válido. Usa: ${validStatuses.join(", ")}.`,
      };
    }

    if (!imageUrls.every((url) => cloudinaryUrlPattern.test(url))) {
      return {
        ok: false,
        message: "Una o más URLs de imágenes no son válidas.",
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

    const slug = await buildUniqueProductSlug(slugInput, nombre);

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

        if (
          variant.imagenUrl &&
          !cloudinaryUrlPattern.test(variant.imagenUrl)
        ) {
          return {
            ok: false,
            message: "Una o más imágenes de variantes no tienen una URL válida.",
          };
        }
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
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
          imagenes: {
            create: imageUrls.map((url) => ({ url })),
          },
          atributos:
            atributos.length > 0
              ? {
                  create: atributos.map((atributo, index) => ({
                    nombre: atributo.nombre,
                    valor: atributo.valor,
                    orden: index,
                  })),
                }
              : undefined,
          variantes:
            usaVariantes && variantes.length > 0
              ? {
                  create: variantes.map((variant, variantIndex) => ({
                    nombre: variant.nombre || undefined,
                    sku: variant.sku || undefined,
                    precio: variant.precio,
                    stock: variant.stockIlimitado ? null : variant.stock,
                    stockIlimitado: variant.stockIlimitado ?? true,
                    imagenUrl: variant.imagenUrl || undefined,
                    isActive: variant.isActive ?? true,
                    orden: variantIndex,
                    options:
                      variant.options.length > 0
                        ? {
                            create: variant.options.map((option, optionIndex) => ({
                              nombre: option.nombre,
                              valor: option.valor,
                              orden: optionIndex,
                            })),
                          }
                        : undefined,
                  })),
                }
              : undefined,
        },
      });

      if (seccionIds.length > 0) {
        await tx.productSection.createMany({
          data: seccionIds.map((sectionId) => ({
            productId: newProduct.id,
            sectionId,
          })),
        });
      }

      return newProduct;
    });

    revalidateTag(`negocio-products-${negocio.slug}`);

    return {
      ok: true,
      product,
      message: "Producto creado exitosamente.",
    };
  } catch (error) {
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
          message: "Error de integridad: categoría, negocio o relaciones no válidas.",
        };
      }
    }

    console.error("Error al crear producto:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    return {
      ok: false,
      message: `Error inesperado al crear el producto: ${errorMessage}`,
    };
  }
}

// Server action para generar la descripción del producto
export async function generateDescriptionFromText(
  nombreProducto: string,
  caracteristicas: string,
  componentes: string[]
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        ok: false,
        message:
          "No se encontró OPENAI_API_KEY en el entorno. Configura la clave antes de usar la generación con IA.",
      };
    }

    if (!nombreProducto.trim() || !caracteristicas.trim()) {
      return {
        ok: false,
        message:
          "Se requieren el título del producto y las características para generar la descripción.",
      };
    }

    const componentesTexto =
      componentes.length > 0 ? componentes.join(", ") : "No especificados";

    const response = await openai.chat.completions.create({
      model: openaiDescriptionModel,
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en ecommerce y SEO. Basado en el título, las características y la lista de componentes del producto, genera: una descripción detallada clara y profesional, una descripción corta de máximo 20 palabras, y una lista de palabras clave SEO separadas por comas. No agregues encabezados ni numeración.",
        },
        {
          role: "user",
          content: `Título del producto: "${nombreProducto}".
Características principales: "${caracteristicas}".
Componentes incluidos: "${componentesTexto}".
Genera la descripción detallada, la descripción corta y los tags SEO.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.6,
    });

    const responseText = response.choices[0]?.message?.content?.trim() || "";
    const sections = responseText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      ok: true,
      description:
        sections[0] || "No se pudo generar una descripción detallada.",
      shortDescription:
        sections[1] || "No se pudo generar una descripción corta.",
      tags: sections[2]
        ? sections[2]
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };
  } catch (error) {
    console.error("Error al generar contenido con OpenAI:", error);

    const openAIError = error as {
      status?: number;
      code?: string;
      type?: string;
      message?: string;
      request_id?: string;
    };

    if (
      openAIError?.status === 429 &&
      openAIError?.code === "insufficient_quota"
    ) {
      return {
        ok: false,
        message:
          "La cuenta o proyecto de OpenAI no tiene cuota disponible. Revisa billing, créditos y presupuesto del proyecto asociado a OPENAI_API_KEY.",
      };
    }

    if (openAIError?.status === 429) {
      return {
        ok: false,
        message:
          "OpenAI está limitando temporalmente las solicitudes. Intenta de nuevo en unos minutos.",
      };
    }

    if (openAIError?.status === 401) {
      return {
        ok: false,
        message:
          "La clave de OpenAI no es válida o no tiene acceso al proyecto configurado.",
      };
    }

    return {
      ok: false,
      message:
        openAIError?.message ||
        "Error al generar la descripción y tags con OpenAI.",
    };
  }
}
