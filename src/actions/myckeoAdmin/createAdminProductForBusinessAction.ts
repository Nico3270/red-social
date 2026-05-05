"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  buildSlugBase,
  generateShortSlugSuffix,
  hasShortSlugSuffix,
  normalizeUrlSlug,
  withShortSlugSuffix,
} from "@/lib/slug/slugUtils";
import {
  EstadoNegocio,
  Prisma,
  ProductEtiquetaEspecial,
  ProductStatus,
} from "@prisma/client";
import { z } from "zod";
import { revalidateAdminProductSurfaces } from "./revalidateAdminProductSurfaces";

const MAX_SLUG_ATTEMPTS = 40;

const priceInputSchema = z
  .union([z.string(), z.number()])
  .transform((value) =>
    typeof value === "number" ? String(value) : value.trim(),
  )
  .transform((value) => value.replace(/[^\d.,-]/g, "").replace(",", "."))
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isFinite(value),
    "El precio debe ser un número válido.",
  )
  .refine((value) => value >= 0, "El precio no puede ser negativo.");

const optionalPriceInputSchema = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const raw = typeof value === "number" ? String(value) : value.trim();
    if (!raw) return null;
    return Number(raw.replace(/[^\d.,-]/g, "").replace(",", "."));
  })
  .refine(
    (value) => value === null || (Number.isFinite(value) && value >= 0),
    "El precio sugerido de variante debe ser válido.",
  );

const suggestedOptionInputSchema = z.object({
  id: z.string().trim().max(120).optional().default(""),
  nombre: z.string().trim().max(120).optional().default(""),
  slug: z.string().trim().max(140).optional().default(""),
  razon: z.string().trim().max(320).optional().default(""),
});

const variantOptionInputSchema = z.object({
  nombre: z.string().trim().min(1, "La opción necesita nombre.").max(60),
  valor: z.string().trim().min(1, "La opción necesita valor.").max(80),
});

const variantInputSchema = z.object({
  nombre: z.string().trim().min(1, "Cada variante necesita nombre.").max(90),
  skuSugerido: z.string().trim().max(80).optional().default(""),
  precioSugerido: optionalPriceInputSchema,
  stockIlimitadoSugerido: z.boolean().optional().default(true),
  opciones: z.array(variantOptionInputSchema).max(8).optional().default([]),
});

const productEtiquetaEspecialInputSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      Object.values(ProductEtiquetaEspecial).includes(
        value as ProductEtiquetaEspecial,
      ),
    "La etiqueta especial no es válida.",
  )
  .transform((value) => value as ProductEtiquetaEspecial);

const createAdminProductForBusinessInputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  categoryId: z.string().trim().min(1).max(120).optional(),
  sectionIds: z
    .array(z.string().trim().min(1).max(120))
    .optional(),
  catalogGroupIds: z
    .array(z.string().trim().min(1).max(120))
    .optional(),
  draft: z
    .object({
      nombre: z
        .string()
        .trim()
        .min(2, "El nombre del producto es obligatorio.")
        .max(140, "El nombre es demasiado largo."),
      slugSugerido: z
        .string()
        .trim()
        .min(1, "El slug sugerido es obligatorio.")
        .max(140, "El slug es demasiado largo."),
      precioBase: priceInputSchema,
      descripcionCorta: z
        .string()
        .trim()
        .min(8, "La descripción corta necesita más contexto.")
        .max(220, "La descripción corta es demasiado larga."),
      descripcion: z
        .string()
        .trim()
        .min(30, "La descripción necesita más contexto.")
        .max(3000, "La descripción es demasiado larga."),
      tags: z
        .array(z.string().trim().min(1).max(40))
        .max(16, "Usa máximo 16 tags.")
        .default([]),
      componentes: z
        .array(z.string().trim().min(1).max(90))
        .max(24, "Usa máximo 24 componentes.")
        .default([]),
      categoriaSugerida: suggestedOptionInputSchema,
      seccionSugerida: suggestedOptionInputSchema,
      catalogGroupsSugeridos: z
        .array(suggestedOptionInputSchema)
        .max(6)
        .default([]),
      etiquetaEspecialSugerida: z
        .union([
          productEtiquetaEspecialInputSchema,
          z.nativeEnum(ProductEtiquetaEspecial),
        ])
        .default(ProductEtiquetaEspecial.ninguna),
      usaVariantesSugerido: z.boolean().default(false),
      variantesSugeridas: z.array(variantInputSchema).max(12).default([]),
      promptsImagen: z
        .object({
          promptCatalogo: z.string().trim().max(1200).optional().default(""),
          promptPublicitario: z
            .string()
            .trim()
            .max(1200)
            .optional()
            .default(""),
        })
        .optional()
        .default({ promptCatalogo: "", promptPublicitario: "" }),
    })
    .superRefine((draft, ctx) => {
      if (draft.usaVariantesSugerido && draft.variantesSugeridas.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variantesSugeridas"],
          message: "Si usa variantes, agrega al menos una variante válida.",
        });
      }
    }),
});

export type CreateAdminProductForBusinessActionInput = z.input<
  typeof createAdminProductForBusinessInputSchema
>;

type ParsedInput = z.output<typeof createAdminProductForBusinessInputSchema>;

export interface CreateAdminProductForBusinessActionResult {
  ok: boolean;
  data: {
    product: {
      id: string;
      nombre: string;
      slug: string;
      status: ProductStatus;
      negocioId: string;
      categoryId: string;
      precio: number;
      usaVariantes: boolean;
    };
    warnings: string[];
  } | null;
  error: string | null;
  validationErrors?: string[];
}

function buildTraceId() {
  return `create-admin-product-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function cleanStringArray(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);

    if (result.length >= limit) break;
  }

  return result;
}

function cleanIdArray(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

async function buildUniqueProductSlug(
  slugSuggestion: string,
  fallbackName: string,
) {
  const baseSlug = buildSlugBase(slugSuggestion, fallbackName);

  if (!baseSlug) {
    throw new Error(
      "No fue posible construir un slug válido para el producto.",
    );
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const baseWithoutExistingSuffix = hasShortSlugSuffix(baseSlug)
      ? baseSlug.slice(0, -5)
      : baseSlug;
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

async function resolveCategory(
  option: ParsedInput["draft"]["categoriaSugerida"],
) {
  if (option.id) {
    const category = await prisma.category.findFirst({
      where: { id: option.id, isActive: true },
      select: { id: true, nombre: true, slug: true },
    });
    if (category) return category;
  }

  if (option.slug) {
    const category = await prisma.category.findFirst({
      where: { slug: option.slug, isActive: true },
      select: { id: true, nombre: true, slug: true },
    });
    if (category) return category;
  }

  if (option.nombre) {
    const category = await prisma.category.findFirst({
      where: {
        nombre: { equals: option.nombre, mode: "insensitive" },
        isActive: true,
      },
      select: { id: true, nombre: true, slug: true },
    });
    if (category) return category;
  }

  return null;
}

async function resolveExplicitCategoryId(categoryId: string) {
  return prisma.category.findFirst({
    where: {
      id: categoryId,
      isActive: true,
    },
    select: { id: true, nombre: true, slug: true },
  });
}

async function resolveSection(option: ParsedInput["draft"]["seccionSugerida"]) {
  if (!option.id && !option.slug && !option.nombre) return null;

  const whereOptions: Prisma.SectionWhereInput[] = [];
  if (option.id) whereOptions.push({ id: option.id });
  if (option.slug) whereOptions.push({ slug: option.slug });
  if (option.nombre) {
    whereOptions.push({
      nombre: { equals: option.nombre, mode: "insensitive" },
    });
  }

  return prisma.section.findFirst({
    where: {
      isActive: true,
      OR: whereOptions,
    },
    select: { id: true, nombre: true, slug: true, categoryId: true },
  });
}

async function resolveExplicitSectionIds(
  categoryId: string,
  sectionIds: string[],
) {
  const uniqueSectionIds = cleanIdArray(sectionIds);

  if (uniqueSectionIds.length === 0) {
    return {
      resolvedIds: [],
      invalidIds: [],
      incompatibleIds: [],
    };
  }

  const sections = await prisma.section.findMany({
    where: {
      id: { in: uniqueSectionIds },
      isActive: true,
    },
    select: {
      id: true,
      nombre: true,
      categoryId: true,
    },
  });

  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const invalidIds = uniqueSectionIds.filter((id) => !sectionById.has(id));
  const incompatibleIds = uniqueSectionIds.filter((id) => {
    const section = sectionById.get(id);

    return Boolean(
      section && section.categoryId && section.categoryId !== categoryId,
    );
  });

  return {
    resolvedIds: uniqueSectionIds.filter((id) => {
      const section = sectionById.get(id);

      if (!section) return false;
      if (section.categoryId && section.categoryId !== categoryId) return false;

      return true;
    }),
    invalidIds,
    incompatibleIds,
  };
}

async function resolveCatalogGroups(
  businessId: string,
  groups: ParsedInput["draft"]["catalogGroupsSugeridos"],
) {
  const warnings: string[] = [];
  const resolvedIds: string[] = [];

  for (const group of groups) {
    if (!group.id && !group.slug && !group.nombre) continue;

    const whereOptions: Prisma.CatalogGroupWhereInput[] = [];
    if (group.id) whereOptions.push({ id: group.id });
    if (group.slug) whereOptions.push({ slug: group.slug });
    if (group.nombre) {
      whereOptions.push({
        nombre: { equals: group.nombre, mode: "insensitive" },
      });
    }

    const resolved = await prisma.catalogGroup.findFirst({
      where: {
        negocioId: businessId,
        isActive: true,
        OR: whereOptions,
      },
      select: { id: true, nombre: true },
    });

    if (!resolved) {
      warnings.push(
        `No se vinculó el grupo "${group.nombre || group.slug || group.id}" porque no coincide con un CatalogGroup activo del negocio.`,
      );
      continue;
    }

    if (!resolvedIds.includes(resolved.id)) {
      resolvedIds.push(resolved.id);
    }
  }

  return { resolvedIds, warnings };
}

async function resolveExplicitCatalogGroupIds(
  businessId: string,
  catalogGroupIds: string[],
) {
  const uniqueCatalogGroupIds = cleanIdArray(catalogGroupIds);

  if (uniqueCatalogGroupIds.length === 0) {
    return {
      resolvedIds: [],
      invalidIds: [],
    };
  }

  const resolvedCatalogGroups = await prisma.catalogGroup.findMany({
    where: {
      negocioId: businessId,
      isActive: true,
      id: { in: uniqueCatalogGroupIds },
    },
    select: { id: true },
  });

  const resolvedCatalogGroupIdSet = new Set(
    resolvedCatalogGroups.map((group) => group.id),
  );

  return {
    resolvedIds: uniqueCatalogGroupIds.filter((id) =>
      resolvedCatalogGroupIdSet.has(id),
    ),
    invalidIds: uniqueCatalogGroupIds.filter(
      (id) => !resolvedCatalogGroupIdSet.has(id),
    ),
  };
}

export async function createAdminProductForBusinessAction(
  rawInput: CreateAdminProductForBusinessActionInput,
): Promise<CreateAdminProductForBusinessActionResult> {
  const traceId = buildTraceId();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        ok: false,
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(
        `[createAdminProductForBusinessAction][${traceId}] Acceso denegado`,
        {
          userId: session.user.id,
          role: session.user.role,
        },
      );

      return {
        ok: false,
        data: null,
        error: "No tienes permisos para crear productos administrativos.",
      };
    }

    const parsedInput =
      createAdminProductForBusinessInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa los datos del producto antes de guardar.",
        validationErrors: parsedInput.error.issues.map(
          (issue) => `${issue.path.join(".") || "producto"}: ${issue.message}`,
        ),
      };
    }

    const { businessId, categoryId, sectionIds, catalogGroupIds, draft } =
      parsedInput.data;

    const business = await prisma.negocio.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        slug: true,
        nombre: true,
        estado: true,
        archivedAt: true,
      },
    });

    if (!business) {
      return {
        ok: false,
        data: null,
        error: "El negocio seleccionado no existe.",
      };
    }

    if (business.archivedAt || business.estado !== EstadoNegocio.activo) {
      return {
        ok: false,
        data: null,
        error: "El negocio seleccionado no está activo para crear productos.",
      };
    }

    const category = categoryId
      ? await resolveExplicitCategoryId(categoryId)
      : await resolveCategory(draft.categoriaSugerida);

    if (!category) {
      return {
        ok: false,
        data: null,
        error: categoryId
          ? "La categoría seleccionada no existe o no está activa."
          : "No se pudo resolver la categoría a una categoría activa real. Corrige el ID, slug o nombre antes de guardar.",
        validationErrors: categoryId
          ? [
              `categoryId: La categoría \"${categoryId}\" no existe o no está activa.`,
            ]
          : undefined,
      };
    }

    const warnings: string[] = [];
    let resolvedSectionIds: string[] = [];
    let resolvedCatalogGroupIds: string[] = [];

    if (sectionIds && sectionIds.length > 0) {
      const explicitSections = await resolveExplicitSectionIds(
        category.id,
        sectionIds,
      );

      if (
        explicitSections.invalidIds.length > 0 ||
        explicitSections.incompatibleIds.length > 0
      ) {
        return {
          ok: false,
          data: null,
          error:
            "Revisa las secciones seleccionadas antes de guardar el producto.",
          validationErrors: [
            ...explicitSections.invalidIds.map(
              (id) =>
                `sectionIds: La sección \"${id}\" no existe o no está activa.`,
            ),
            ...explicitSections.incompatibleIds.map(
              (id) =>
                `sectionIds: La sección \"${id}\" no pertenece a la categoría seleccionada.`,
            ),
          ],
        };
      }

      resolvedSectionIds = explicitSections.resolvedIds;
    } else {
      const section = await resolveSection(draft.seccionSugerida);

      if (
        !section &&
        (draft.seccionSugerida.id ||
          draft.seccionSugerida.slug ||
          draft.seccionSugerida.nombre)
      ) {
        warnings.push(
          `No se vinculó la sección "${draft.seccionSugerida.nombre || draft.seccionSugerida.slug || draft.seccionSugerida.id}" porque no coincide con una sección activa.`,
        );
      } else if (section) {
        if (section.categoryId && section.categoryId !== category.id) {
          warnings.push(
            `No se vinculó la sección "${section.nombre}" porque pertenece a otra categoría activa.`,
          );
        } else {
          resolvedSectionIds = [section.id];
        }
      }
    }

    if (catalogGroupIds && catalogGroupIds.length > 0) {
      const explicitCatalogGroups = await resolveExplicitCatalogGroupIds(
        business.id,
        catalogGroupIds,
      );

      if (explicitCatalogGroups.invalidIds.length > 0) {
        return {
          ok: false,
          data: null,
          error:
            "Revisa los CatalogGroups seleccionados antes de guardar el producto.",
          validationErrors: explicitCatalogGroups.invalidIds.map(
            (id) =>
              `catalogGroupIds: El grupo \"${id}\" no existe, no está activo o no pertenece al negocio seleccionado.`,
          ),
        };
      }

      resolvedCatalogGroupIds = explicitCatalogGroups.resolvedIds;
    } else {
      const catalogGroups = await resolveCatalogGroups(
        business.id,
        draft.catalogGroupsSugeridos,
      );
      warnings.push(...catalogGroups.warnings);
      resolvedCatalogGroupIds = catalogGroups.resolvedIds;
    }

    const slug = await buildUniqueProductSlug(draft.slugSugerido, draft.nombre);
    const tags = cleanStringArray(draft.tags, 16);
    const componentes = cleanStringArray(draft.componentes, 24);
    const usaVariantes = draft.usaVariantesSugerido;

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          nombre: draft.nombre,
          slug,
          descripcion: draft.descripcion,
          descripcionCorta: draft.descripcionCorta,
          precio: draft.precioBase,
          status: ProductStatus.oculto,
          tags,
          componentes,
          etiquetaEspecial: draft.etiquetaEspecialSugerida,
          negocioId: business.id,
          categoryId: category.id,
          stock: null,
          stockIlimitado: true,
          usaVariantes,
          variantes:
            usaVariantes && draft.variantesSugeridas.length > 0
              ? {
                  create: draft.variantesSugeridas.map((variant, index) => ({
                    nombre: variant.nombre,
                    sku: variant.skuSugerido || undefined,
                    precio: variant.precioSugerido,
                    stock: null,
                    stockIlimitado: variant.stockIlimitadoSugerido,
                    isActive: true,
                    orden: index,
                    options:
                      variant.opciones.length > 0
                        ? {
                            create: variant.opciones.map(
                              (option, optionIndex) => ({
                                nombre: option.nombre,
                                valor: option.valor,
                                orden: optionIndex,
                              }),
                            ),
                          }
                        : undefined,
                  })),
                }
              : undefined,
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          status: true,
          negocioId: true,
          categoryId: true,
          precio: true,
          usaVariantes: true,
        },
      });

      if (resolvedSectionIds.length > 0) {
        await tx.productSection.createMany({
          data: resolvedSectionIds.map((sectionId) => ({
            productId: createdProduct.id,
            sectionId,
          })),
          skipDuplicates: true,
        });
      }

      if (resolvedCatalogGroupIds.length > 0) {
        await tx.catalogGroupProduct.createMany({
          data: resolvedCatalogGroupIds.map((catalogGroupId, index) => ({
            productId: createdProduct.id,
            catalogGroupId,
            order: index,
          })),
          skipDuplicates: true,
        });
      }

      return createdProduct;
    });

    revalidateAdminProductSurfaces({
      businessSlug: business.slug,
      productSlug: product.slug,
    });

    console.info(
      `[createAdminProductForBusinessAction][${traceId}] Producto creado`,
      {
        actorUserId: session.user.id,
        businessId: business.id,
        productId: product.id,
        slug: product.slug,
      },
    );

    return {
      ok: true,
      data: {
        product,
        warnings,
      },
      error: null,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          data: null,
          error:
            "El slug final ya fue tomado por otro producto. Intenta guardar de nuevo para generar una nueva variante.",
        };
      }

      if (error.code === "P2003") {
        return {
          ok: false,
          data: null,
          error:
            "Error de integridad: negocio, categoría, sección o grupo no válido.",
        };
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "No fue posible guardar el producto.";

    console.error(`[createAdminProductForBusinessAction][${traceId}] Error`, {
      error,
    });

    return {
      ok: false,
      data: null,
      error: message,
    };
  }
}
