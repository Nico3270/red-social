"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { ProductEtiquetaEspecial } from "@prisma/client";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiBatchDraftModel =
  process.env.OPENAI_ADMIN_PRODUCT_BATCH_DRAFT_MODEL ||
  process.env.OPENAI_ADMIN_PRODUCT_DRAFT_MODEL ||
  process.env.OPENAI_PRODUCT_DESCRIPTION_MODEL ||
  "gpt-4o";

const MAX_CONTEXT_PRODUCTS = 10;
const MAX_CONTEXT_GROUPS = 14;
const MAX_CONTEXT_OPTIONS = 28;
const MAX_BATCH_PRODUCTS = 20;

const batchInputSchema = z.object({
  businessId: z.string().trim().min(1, "El negocio es obligatorio."),
  sourceText: z
    .string()
    .trim()
    .min(20, "Pega una carta o lista con suficiente contenido.")
    .max(16000, "El texto es demasiado largo para esta primera fase batch."),
  additionalInstructions: z
    .string()
    .trim()
    .max(1500, "Las instrucciones adicionales son demasiado largas.")
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

const batchProductDraftSchema = z.object({
  nombre: z.string().trim().min(2).max(140),
  slugSugerido: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug sugerido debe estar en kebab-case sin acentos.",
    ),
  precioSugerido: z.number().nullable(),
  descripcionCorta: z.string().trim().min(8).max(180),
  descripcion: z.string().trim().min(30).max(2400),
  tags: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  componentes: z.array(z.string().trim().min(1).max(90)).max(18).default([]),
  categoriaSugerida: suggestedOptionSchema,
  seccionSugerida: suggestedOptionSchema,
  catalogGroupsSugeridos: z.array(suggestedOptionSchema).max(5).default([]),
  etiquetaEspecialSugerida: z
    .nativeEnum(ProductEtiquetaEspecial)
    .default(ProductEtiquetaEspecial.ninguna),
  usaVariantesSugerido: z.boolean(),
  variantesSugeridas: z.array(variantSchema).max(8).default([]),
  promptsImagen: z.object({
    promptCatalogo: z.string().trim().min(30).max(1200),
    promptPublicitario: z.string().trim().min(30).max(1200),
  }),
  fuenteTexto: z.string().trim().max(600).optional().default(""),
});

const batchOutputSchema = z.object({
  productos: z
    .array(batchProductDraftSchema)
    .min(1, "La IA no identificó productos suficientes.")
    .max(MAX_BATCH_PRODUCTS),
});

export type GenerateAdminProductBatchDraftActionInput = z.input<
  typeof batchInputSchema
>;

export type AdminBatchProductDraft = z.infer<typeof batchProductDraftSchema>;

export interface AdminProductBatchContextSummary {
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
  categorySignals: string[];
  sectionSignals: string[];
  catalogGroupSignals: string[];
}

export interface GenerateAdminProductBatchDraftActionResult {
  ok: boolean;
  data: {
    drafts: AdminBatchProductDraft[];
    contextSummary: AdminProductBatchContextSummary;
    model: string;
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
};

function buildTraceId() {
  return `generate-admin-product-batch-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function compactText(value: string | null | undefined, maxLength = 420) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1)}...`;
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

function parseJsonObject(value: string) {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence);
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

  const [recentProducts, activeCatalogGroups, activeCategories] =
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
          category: { select: { nombre: true, slug: true } },
          secciones: {
            select: {
              section: { select: { nombre: true, slug: true } },
            },
          },
        },
      }),
      prisma.catalogGroup.findMany({
        where: { negocioId: business.id, isActive: true },
        orderBy: [{ parentId: "asc" }, { order: "asc" }],
        take: MAX_CONTEXT_GROUPS,
        select: {
          id: true,
          nombre: true,
          slug: true,
          description: true,
          _count: { select: { productos: true } },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { nombre: "asc" },
        take: MAX_CONTEXT_OPTIONS,
        select: { id: true, nombre: true, slug: true },
      }),
    ]);

  const compactProducts: CompactProductContext[] = recentProducts.map(
    (product) => ({
      nombre: product.nombre,
      precio: Math.round(product.precio),
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
    }),
  );

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

  const summary: AdminProductBatchContextSummary = {
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
    categorySignals: uniqueStrings(
      [
        ...businessCategories.map((category) => category.nombre),
        ...recentProducts.map((product) => product.category?.nombre),
      ],
      10,
    ),
    sectionSignals: uniqueStrings(
      [
        ...business.secciones.map((item) => item.section.nombre),
        ...recentProducts.flatMap((product) =>
          product.secciones.map((item) => item.section?.nombre),
        ),
      ],
      12,
    ),
    catalogGroupSignals: uniqueStrings(
      catalogGroups.map((group) => group.nombre),
      12,
    ),
  };

  return {
    summary,
    promptContext: {
      business: summary.business,
      products: compactProducts,
      categoryOptions: categoryOptions.slice(0, MAX_CONTEXT_OPTIONS),
      sectionOptions,
      catalogGroups,
      keywords: business.palabrasClave.slice(0, 16),
    },
  };
}

function buildSystemPrompt() {
  return [
    "Eres un estructurador senior de catalogos para Myckeo.",
    "Recibiras una carta, lista de productos o texto extraido manualmente.",
    "Identifica productos reales vendibles. No inventes productos si el texto no los soporta.",
    "Puedes mejorar descripciones y tags, pero conserva nombres/precios detectados cuando existan.",
    "Devuelve exclusivamente JSON valido, sin markdown ni explicaciones fuera del JSON.",
    "Todos los slugs deben estar en kebab-case ASCII sin acentos.",
  ].join(" ");
}

function buildUserPrompt(input: {
  sourceText: string;
  additionalInstructions: string;
  context: NonNullable<
    Awaited<ReturnType<typeof buildBusinessContext>>
  >["promptContext"];
}) {
  return JSON.stringify(
    {
      objetivo:
        "Convertir texto fuente en una lista revisable de productos. No guardar nada.",
      textoFuente: input.sourceText,
      instruccionesAdicionales: input.additionalInstructions || null,
      contextoNegocio: input.context,
      limiteProductos: MAX_BATCH_PRODUCTS,
      formatoRespuestaObligatorio: {
        productos: [
          {
            nombre: "string",
            slugSugerido: "kebab-case-ascii-string",
            precioSugerido:
              "number detectado o sugerido. Usa null solo si el texto no permite inferirlo con seguridad.",
            descripcionCorta: "string maximo 180 caracteres",
            descripcion: "string descriptivo, comercial y concreto",
            tags: ["1 a 12 strings"],
            componentes: ["ingredientes, componentes o atributos"],
            categoriaSugerida: {
              id: "id si coincide con categoria disponible, si no null",
              nombre: "nombre de categoria",
              slug: "slug si existe, si no null",
              razon: "por que encaja",
            },
            seccionSugerida: {
              id: "id si coincide con seccion disponible, si no null",
              nombre: "nombre de seccion",
              slug: "slug si existe, si no null",
              razon: "por que encaja",
            },
            catalogGroupsSugeridos: [
              {
                id: "id si coincide con grupo activo, si no null",
                nombre: "nombre",
                slug: "slug si existe",
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
              promptCatalogo: "prompt realista de catalogo",
              promptPublicitario: "prompt publicitario/editorial",
            },
            fuenteTexto:
              "fragmento breve del texto fuente que originó este producto",
          },
        ],
      },
      reglas:
        "Elimina duplicados obvios. No publiques. No agregues campos extra. Si una linea parece categoria o encabezado, no la conviertas en producto.",
    },
    null,
    2,
  );
}

export async function generateAdminProductBatchDraftAction(
  rawInput: GenerateAdminProductBatchDraftActionInput,
): Promise<GenerateAdminProductBatchDraftActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { ok: false, data: null, error: "No autorizado." };
    }

    if (session.user.role !== "super_admin") {
      console.warn(
        `[generateAdminProductBatchDraftAction][${traceId}] Acceso denegado`,
        {
          userId: session.user.id,
          role: session.user.role,
        },
      );

      return {
        ok: false,
        data: null,
        error: "No tienes permisos para generar productos administrativos.",
      };
    }

    const parsedInput = batchInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        data: null,
        error: "Revisa el texto fuente antes de generar.",
        validationErrors: parsedInput.error.issues.map(
          (issue) => `${issue.path.join(".") || "batch"}: ${issue.message}`,
        ),
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
      model: openaiBatchDraftModel,
      response_format: { type: "json_object" },
      temperature: 0.35,
      max_tokens: 5200,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({
            sourceText: parsedInput.data.sourceText,
            additionalInstructions: parsedInput.data.additionalInstructions,
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
        error: "OpenAI no devolvió contenido para el batch.",
      };
    }

    let parsedJson: unknown;

    try {
      parsedJson = parseJsonObject(content);
    } catch (error) {
      console.error(
        `[generateAdminProductBatchDraftAction][${traceId}] JSON inválido`,
        { error, elapsedMs: Date.now() - startedAt },
      );

      return {
        ok: false,
        data: null,
        error: "OpenAI devolvió una respuesta que no es JSON válido.",
      };
    }

    const parsedBatch = batchOutputSchema.safeParse(parsedJson);

    if (!parsedBatch.success) {
      return {
        ok: false,
        data: null,
        error: "El batch generado no cumple el contrato esperado.",
        validationErrors: parsedBatch.error.issues.map(
          (issue) => `${issue.path.join(".") || "batch"}: ${issue.message}`,
        ),
      };
    }

    console.info(
      `[generateAdminProductBatchDraftAction][${traceId}] Batch generado`,
      {
        actorUserId: session.user.id,
        businessId: parsedInput.data.businessId,
        count: parsedBatch.data.productos.length,
        elapsedMs: Date.now() - startedAt,
      },
    );

    return {
      ok: true,
      data: {
        drafts: parsedBatch.data.productos,
        contextSummary: context.summary,
        model: openaiBatchDraftModel,
      },
      error: null,
    };
  } catch (error) {
    const openAIError = error as {
      status?: number;
      code?: string;
      message?: string;
    };

    console.error(`[generateAdminProductBatchDraftAction][${traceId}] Error`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

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
        openAIError?.message || "No fue posible generar los borradores batch.",
    };
  }
}
