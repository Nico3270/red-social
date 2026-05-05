"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { ProductEtiquetaEspecial } from "@prisma/client";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiDraftModel =
  process.env.OPENAI_ADMIN_PRODUCT_DRAFT_MODEL ||
  process.env.OPENAI_PRODUCT_DESCRIPTION_MODEL ||
  "gpt-4o";

const MAX_CONTEXT_PRODUCTS = 12;
const MAX_CONTEXT_GROUPS = 16;
const MAX_CONTEXT_OPTIONS = 28;

const productBriefingInputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  productName: z
    .string()
    .trim()
    .min(2, "El nombre del producto es obligatorio.")
    .max(140, "El nombre del producto es demasiado largo."),
  price: z
    .union([z.string(), z.number()])
    .transform((value) =>
      typeof value === "number" ? String(value) : value.trim()
    )
    .refine((value) => value.length > 0, "El precio es obligatorio.")
    .refine((value) => {
      const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) && parsed >= 0;
    }, "El precio debe ser un número válido."),
  baseDescription: z
    .string()
    .trim()
    .min(8, "La descripción base debe tener más contexto.")
    .max(2000, "La descripción base es demasiado larga."),
  additionalContext: z
    .string()
    .trim()
    .max(2000, "El contexto adicional es demasiado largo.")
    .optional()
    .default(""),
});

const suggestedOptionSchema = z.object({
  id: z.string().nullable().optional(),
  nombre: z.string().trim().min(1).max(90),
  slug: z.string().trim().max(120).nullable().optional(),
  razon: z.string().trim().max(280).optional().default(""),
});

const variantOptionSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
  valor: z.string().trim().min(1).max(80),
});

const variantSchema = z.object({
  nombre: z.string().trim().min(1).max(90),
  skuSugerido: z.string().trim().max(80).optional().default(""),
  precioSugerido: z.number().nullable().optional(),
  stockIlimitadoSugerido: z.boolean().optional().default(true),
  opciones: z.array(variantOptionSchema).max(8).optional().default([]),
});

const generatedProductDraftSchema = z.object({
  nombre: z.string().trim().min(2).max(140),
  slugSugerido: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug sugerido debe estar en kebab-case sin acentos."
    ),
  descripcionCorta: z.string().trim().min(8).max(180),
  descripcion: z.string().trim().min(30).max(2400),
  tags: z.array(z.string().trim().min(1).max(40)).min(3).max(12),
  componentes: z.array(z.string().trim().min(1).max(90)).max(18),
  categoriaSugerida: suggestedOptionSchema,
  seccionSugerida: suggestedOptionSchema,
  catalogGroupsSugeridos: z.array(suggestedOptionSchema).max(5).default([]),
  etiquetaEspecialSugerida: z.nativeEnum(ProductEtiquetaEspecial).default("ninguna"),
  usaVariantesSugerido: z.boolean(),
  variantesSugeridas: z.array(variantSchema).max(8).default([]),
  promptsImagen: z.object({
    promptCatalogo: z.string().trim().min(30).max(1200),
    promptPublicitario: z.string().trim().min(30).max(1200),
  }),
});

export type GenerateAdminProductDraftActionInput = z.input<
  typeof productBriefingInputSchema
>;

export type AdminGeneratedProductDraft = z.infer<
  typeof generatedProductDraftSchema
>;

export interface AdminProductDraftContextSummary {
  business: {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    tipo: string;
    ciudad: string;
    departamento: string;
    estado: string;
    isTestData: boolean;
    archivedAt: string | null;
  };
  productsAnalyzed: number;
  priceRange: {
    min: number | null;
    max: number | null;
    avg: number | null;
  };
  categorySignals: string[];
  sectionSignals: string[];
  catalogGroupSignals: string[];
}

export interface AdminCatalogGroupOption {
  id: string;
  nombre: string;
  slug: string;
  parentId: string | null;
  order: number;
  description: string | null;
}

export interface GenerateAdminProductDraftActionResult {
  ok: boolean;
  data: {
    draft: AdminGeneratedProductDraft;
    contextSummary: AdminProductDraftContextSummary;
    model: string;
    catalogGroupOptions: AdminCatalogGroupOption[];
  } | null;
  error: string | null;
  validationErrors?: string[];
}

type CompactProductContext = {
  nombre: string;
  precio: number;
  descripcionCorta: string | null;
  tags: string[];
  componentes: string[];
  categoria: string | null;
  secciones: string[];
  etiquetaEspecial: string | null;
  usaVariantes: boolean;
};

function buildTraceId() {
  return `generate-admin-product-draft-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function compactText(value: string | null | undefined, maxLength = 420) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1)}…`;
}

function uniqueStrings(values: Array<string | null | undefined>, limit = 12) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);

    if (result.length >= limit) break;
  }

  return result;
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value);
}

function parseJsonObject(value: string) {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence);
}

function buildSystemPrompt() {
  return [
    "Eres un estratega senior de ecommerce para Myckeo.",
    "Tu tarea es generar un borrador de producto coherente con el negocio seleccionado.",
    "No inventes verticales absurdas: respeta el contexto comercial, productos existentes, rangos de precio, categorias, secciones y grupos de catalogo.",
    "Responde exclusivamente con un objeto JSON valido, sin markdown, sin explicaciones fuera del JSON.",
    "El slug debe estar en kebab-case ASCII, sin acentos ni caracteres especiales.",
    "Los prompts de imagen deben describir el producto de forma segura, realista y usable para generar imagenes comerciales.",
  ].join(" ");
}

function buildUserPrompt(input: {
  briefing: z.output<typeof productBriefingInputSchema>;
  context: {
    business: AdminProductDraftContextSummary["business"];
    products: CompactProductContext[];
    priceRange: AdminProductDraftContextSummary["priceRange"];
    categoryOptions: Array<{ id: string; nombre: string; slug: string }>;
    sectionOptions: Array<{ id: string; nombre: string; slug: string }>;
    catalogGroups: Array<{
      id: string;
      nombre: string;
      slug: string;
      description: string | null;
      productCount: number;
    }>;
    keywords: string[];
  };
}) {
  const { briefing, context } = input;

  return JSON.stringify(
    {
      objetivo:
        "Genera un borrador de producto editable para un super admin. Todavia no se guarda en DB.",
      briefingAdmin: {
        nombreProducto: briefing.productName,
        precioReferencia: briefing.price,
        descripcionBase: briefing.baseDescription,
        contextoAdicional: briefing.additionalContext || null,
      },
      contextoNegocio: {
        negocio: context.business,
        palabrasClaveNegocio: context.keywords,
        rangoPreciosHistorico: context.priceRange,
        productosRecientesRepresentativos: context.products,
        categoriasDisponibles: context.categoryOptions,
        seccionesDisponibles: context.sectionOptions,
        catalogGroupsActivos: context.catalogGroups,
      },
      formatoRespuestaObligatorio: {
        nombre: "string",
        slugSugerido: "kebab-case-ascii-string",
        descripcionCorta: "string maximo 180 caracteres",
        descripcion: "string descriptivo, comercial y concreto",
        tags: ["3 a 12 strings"],
        componentes: ["strings con componentes, ingredientes o atributos relevantes"],
        categoriaSugerida: {
          id: "id si coincide con una categoria disponible, si no null",
          nombre: "nombre de categoria",
          slug: "slug si existe, si no null",
          razon: "por que encaja",
        },
        seccionSugerida: {
          id: "id si coincide con una seccion disponible, si no null",
          nombre: "nombre de seccion",
          slug: "slug si existe, si no null",
          razon: "por que encaja",
        },
        catalogGroupsSugeridos: [
          {
            id: "id si coincide con un catalogGroup activo, si no null",
            nombre: "nombre del grupo",
            slug: "slug si existe, si no null",
            razon: "por que encaja",
          },
        ],
        etiquetaEspecialSugerida:
          "una de: mas_buscado, mas_vendido, novedad, reciente, promocion, ultimos_dias, ninguna",
        usaVariantesSugerido: "boolean",
        variantesSugeridas: [
          {
            nombre: "string",
            skuSugerido: "string opcional",
            precioSugerido: "number o null",
            stockIlimitadoSugerido: "boolean",
            opciones: [{ nombre: "string", valor: "string" }],
          },
        ],
        promptsImagen: {
          promptCatalogo:
            "prompt realista para foto de catalogo, fondo limpio, producto protagonista",
          promptPublicitario:
            "prompt editorial/publicitario coherente con el negocio y el producto",
        },
      },
      reglas:
        "Usa nombres de categorias, secciones y catalogGroups disponibles cuando haya coincidencia natural. Si no hay coincidencia, sugiere nombre razonable con id null. No uses claims medicos o promesas imposibles. No agregues campos extra.",
    },
    null,
    2
  );
}

async function buildBusinessContext(businessId: string) {
  const business = await prisma.negocio.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      nombre: true,
      slug: true,
      descripcion: true,
      tipo: true,
      ciudad: true,
      departamento: true,
      estado: true,
      isTestData: true,
      archivedAt: true,
      palabrasClave: true,
      categorias: {
        select: {
          category: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
      },
      secciones: {
        select: {
          section: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!business) return null;

  const [recentProducts, productPriceStats, activeCatalogGroups, activeCategories] =
    await Promise.all([
      prisma.product.findMany({
        where: { negocioId: business.id },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_CONTEXT_PRODUCTS,
        select: {
          nombre: true,
          precio: true,
          descripcionCorta: true,
          tags: true,
          componentes: true,
          etiquetaEspecial: true,
          usaVariantes: true,
          category: {
            select: {
              nombre: true,
              slug: true,
            },
          },
          secciones: {
            select: {
              section: {
                select: {
                  nombre: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.aggregate({
        where: { negocioId: business.id },
        _min: { precio: true },
        _max: { precio: true },
        _avg: { precio: true },
      }),
      prisma.catalogGroup.findMany({
        where: {
          negocioId: business.id,
          isActive: true,
        },
        orderBy: [{ parentId: "asc" }, { order: "asc" }],
        take: MAX_CONTEXT_GROUPS,
        select: {
          id: true,
          nombre: true,
          slug: true,
          parentId: true,
          order: true,
          description: true,
          _count: {
            select: {
              productos: true,
            },
          },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { nombre: "asc" },
        take: MAX_CONTEXT_OPTIONS,
        select: {
          id: true,
          nombre: true,
          slug: true,
        },
      }),
    ]);

  const compactProducts: CompactProductContext[] = recentProducts.map((product) => ({
    nombre: product.nombre,
    precio: product.precio,
    descripcionCorta: compactText(product.descripcionCorta, 180) || null,
    tags: product.tags.slice(0, 8),
    componentes: product.componentes.slice(0, 8),
    categoria: product.category
      ? `${product.category.nombre} (${product.category.slug})`
      : null,
    secciones: product.secciones
      .map((item) => item.section?.nombre)
      .filter((value): value is string => Boolean(value))
      .slice(0, 6),
    etiquetaEspecial: product.etiquetaEspecial,
    usaVariantes: product.usaVariantes,
  }));

  const businessCategories = business.categorias.map((item) => item.category);
  const categoryOptions =
    businessCategories.length > 0 ? businessCategories : activeCategories;

  const sectionOptions = business.secciones
    .map((item) => item.section)
    .slice(0, MAX_CONTEXT_OPTIONS);

  const catalogGroups = activeCatalogGroups.map((group) => ({
    id: group.id,
    nombre: group.nombre,
    slug: group.slug,
    description: compactText(group.description, 180) || null,
    productCount: group._count.productos,
  }));

  const catalogGroupOptions: AdminCatalogGroupOption[] = activeCatalogGroups.map(
    (group) => ({
      id: group.id,
      nombre: group.nombre,
      slug: group.slug,
      parentId: group.parentId,
      order: group.order,
      description: compactText(group.description, 180) || null,
    }),
  );

  const contextSummary: AdminProductDraftContextSummary = {
    business: {
      id: business.id,
      nombre: business.nombre,
      slug: business.slug,
      descripcion: compactText(business.descripcion, 360) || null,
      tipo: business.tipo,
      ciudad: business.ciudad,
      departamento: business.departamento,
      estado: business.estado,
      isTestData: business.isTestData,
      archivedAt: business.archivedAt?.toISOString() ?? null,
    },
    productsAnalyzed: compactProducts.length,
    priceRange: {
      min: formatPrice(productPriceStats._min.precio),
      max: formatPrice(productPriceStats._max.precio),
      avg: formatPrice(productPriceStats._avg.precio),
    },
    categorySignals: uniqueStrings(
      [
        ...businessCategories.map((category) => category.nombre),
        ...recentProducts.map((product) => product.category?.nombre),
      ],
      10
    ),
    sectionSignals: uniqueStrings(
      [
        ...business.secciones.map((item) => item.section.nombre),
        ...recentProducts.flatMap((product) =>
          product.secciones.map((item) => item.section?.nombre)
        ),
      ],
      12
    ),
    catalogGroupSignals: uniqueStrings(
      catalogGroups.map((group) => group.nombre),
      12
    ),
  };

  return {
    business,
    promptContext: {
      business: contextSummary.business,
      products: compactProducts,
      priceRange: contextSummary.priceRange,
      categoryOptions: categoryOptions.slice(0, MAX_CONTEXT_OPTIONS),
      sectionOptions,
      catalogGroups,
      keywords: business.palabrasClave.slice(0, 16),
    },
    summary: contextSummary,
    catalogGroupOptions,
  };
}

export async function generateAdminProductDraftAction(
  rawInput: GenerateAdminProductDraftActionInput
): Promise<GenerateAdminProductDraftActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

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
      console.warn(`[generateAdminProductDraftAction][${traceId}] Acceso denegado`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        data: null,
        error: "No tienes permisos para generar productos administrativos.",
      };
    }

    const parsedInput = productBriefingInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa los datos del briefing antes de generar.",
        validationErrors: parsedInput.error.issues.map((issue) => issue.message),
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        ok: false,
        data: null,
        error:
          "No se encontró OPENAI_API_KEY en el entorno. Configura la clave antes de generar borradores.",
      };
    }

    const context = await buildBusinessContext(parsedInput.data.businessId);

    if (!context) {
      return {
        ok: false,
        data: null,
        error: "El negocio seleccionado no existe o ya no está disponible.",
      };
    }

    const completion = await openai.chat.completions.create({
      model: openaiDraftModel,
      response_format: { type: "json_object" },
      temperature: 0.45,
      max_tokens: 1900,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt({
            briefing: parsedInput.data,
            context: context.promptContext,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return {
        ok: false,
        data: null,
        error: "OpenAI no devolvió contenido para el borrador.",
      };
    }

    let parsedJson: unknown;

    try {
      parsedJson = parseJsonObject(content);
    } catch (error) {
      console.error(
        `[generateAdminProductDraftAction][${traceId}] JSON inválido desde OpenAI`,
        {
          error,
          elapsedMs: Date.now() - startedAt,
        }
      );

      return {
        ok: false,
        data: null,
        error: "OpenAI devolvió una respuesta que no es JSON válido.",
      };
    }

    const parsedDraft = generatedProductDraftSchema.safeParse(parsedJson);

    if (!parsedDraft.success) {
      console.warn(
        `[generateAdminProductDraftAction][${traceId}] Draft no pasó validación`,
        {
          issues: parsedDraft.error.issues,
          elapsedMs: Date.now() - startedAt,
        }
      );

      return {
        ok: false,
        data: null,
        error: "El borrador generado no cumple el contrato esperado.",
        validationErrors: parsedDraft.error.issues.map(
          (issue) => `${issue.path.join(".") || "draft"}: ${issue.message}`
        ),
      };
    }

    console.info(`[generateAdminProductDraftAction][${traceId}] Draft generado`, {
      actorUserId: session.user.id,
      businessId: context.summary.business.id,
      model: openaiDraftModel,
      productsAnalyzed: context.summary.productsAnalyzed,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      data: {
        draft: parsedDraft.data,
        contextSummary: context.summary,
        model: openaiDraftModel,
        catalogGroupOptions: context.catalogGroupOptions,
      },
      error: null,
    };
  } catch (error) {
    const openAIError = error as {
      status?: number;
      code?: string;
      message?: string;
    };

    console.error(`[generateAdminProductDraftAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    if (openAIError?.status === 429 && openAIError?.code === "insufficient_quota") {
      return {
        ok: false,
        data: null,
        error:
          "La cuenta o proyecto de OpenAI no tiene cuota disponible. Revisa billing, créditos y presupuesto.",
      };
    }

    if (openAIError?.status === 429) {
      return {
        ok: false,
        data: null,
        error:
          "OpenAI está limitando temporalmente las solicitudes. Intenta de nuevo en unos minutos.",
      };
    }

    if (openAIError?.status === 401) {
      return {
        ok: false,
        data: null,
        error:
          "La clave de OpenAI no es válida o no tiene acceso al proyecto configurado.",
      };
    }

    return {
      ok: false,
      data: null,
      error:
        openAIError?.message ||
        "No fue posible generar el borrador del producto.",
    };
  }
}
