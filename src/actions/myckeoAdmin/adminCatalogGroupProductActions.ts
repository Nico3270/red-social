"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

export type GetAdminCatalogGroupDetailActionInput = {
  businessId: string;
  expectedSlug: string;
  groupId: string;
};

export type GetAdminAvailableProductsForCatalogGroupActionInput = {
  businessId: string;
  expectedSlug: string;
  groupId: string;
  search?: string;
  take?: number;
  skip?: number;
};

export type SaveAdminCatalogGroupProductsBatchActionInput = {
  businessId: string;
  expectedSlug: string;
  groupId: string;
  products: Array<{
    productId: string;
    order: number;
    isFeatured?: boolean;
  }>;
};

export type AdminCatalogGroupProductCategory = {
  id: string;
  nombre: string;
  slug: string;
};

export type AdminCatalogGroupAssignedProduct = {
  productId: string;
  order: number;
  isFeatured: boolean;
  product: {
    id: string;
    nombre: string;
    slug: string;
    precio: number;
    status: ProductStatus;
    imageUrl: string | null;
    category: AdminCatalogGroupProductCategory | null;
  };
};

export type AdminCatalogGroupDetail = {
  id: string;
  nombre: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  productCount: number;
  products: AdminCatalogGroupAssignedProduct[];
};

export type GetAdminCatalogGroupDetailActionResult =
  | {
      ok: true;
      group: AdminCatalogGroupDetail;
    }
  | {
      ok: false;
      error: string;
    };

export type AdminCatalogGroupAvailableProduct = {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  status: ProductStatus;
  imageUrl: string | null;
  category: AdminCatalogGroupProductCategory | null;
  isAssignedToGroup: boolean;
  groupAssignment: {
    order: number;
    isFeatured: boolean;
  } | null;
};

export type GetAdminAvailableProductsForCatalogGroupActionResult =
  | {
      ok: true;
      products: AdminCatalogGroupAvailableProduct[];
      total: number;
      take: number;
      skip: number;
      hasMore: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export type SaveAdminCatalogGroupProductsBatchActionResult =
  | {
      ok: true;
      assignments: Array<{
        productId: string;
        order: number;
        isFeatured: boolean;
      }>;
      summary: {
        added: number;
        removed: number;
        kept: number;
      };
    }
  | {
      ok: false;
      error: string;
    };

type AdminCatalogGroupProductActionErrorResult = Extract<
  | GetAdminCatalogGroupDetailActionResult
  | GetAdminAvailableProductsForCatalogGroupActionResult
  | SaveAdminCatalogGroupProductsBatchActionResult,
  { ok: false }
>;

type BusinessContext = {
  id: string;
  slug: string;
};

type GroupContext = {
  id: string;
  negocioId: string;
  nombre: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
};

type NormalizedBatchProduct = {
  productId: string;
  requestedOrder: number;
  order: number;
  isFeatured: boolean;
  originalIndex: number;
};

const LOG_PREFIX = "[adminCatalogGroupProductActions]";
const DEFAULT_TAKE = 50;
const MAX_TAKE = 100;
const AVAILABLE_PRODUCT_STATUSES: ProductStatus[] = [
  ProductStatus.disponible,
  ProductStatus.agotado,
  ProductStatus.oculto,
];

function buildTraceId(action: string) {
  return `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRequiredString(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearch(value: string | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined;
  return typeof value === "boolean" ? value : null;
}

function normalizeTake(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TAKE;
  }

  const normalized = Math.floor(value);

  if (normalized <= 0) {
    return DEFAULT_TAKE;
  }

  return Math.min(normalized, MAX_TAKE);
}

function normalizeSkip(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : 0;
}

function revalidateAdminCatalogGroupProductSurfaces(businessSlug: string) {
  if (!businessSlug) return;

  revalidatePath(`/myckeoAdmin/organizar/${businessSlug}`);
  revalidatePath(`/perfil/${businessSlug}`);
  revalidatePath(`/api/productos/${businessSlug}`);
  revalidateTag(`negocio-catalog-${businessSlug}`);
}

function controlledError(
  action: string,
  traceId: string,
  actorUserId: string | null,
  details: {
    businessId?: string;
    expectedSlug?: string;
    groupId?: string;
    productsCount?: number;
    reason: string;
  },
  error: string
): AdminCatalogGroupProductActionErrorResult {
  console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
    action,
    actorUserId,
    businessId: details.businessId,
    expectedSlug: details.expectedSlug,
    groupId: details.groupId,
    productsCount: details.productsCount,
    reason: details.reason,
  });

  return {
    ok: false,
    error,
  };
}

async function resolveAdminBusinessContext(args: {
  action: string;
  traceId: string;
  actorUserId: string;
  businessId: string;
  expectedSlug: string;
}): Promise<BusinessContext | AdminCatalogGroupProductActionErrorResult> {
  const businessId = normalizeRequiredString(args.businessId);
  const expectedSlug = normalizeRequiredString(args.expectedSlug);

  if (!businessId || !expectedSlug) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "missing_business_identifiers",
      },
      "El identificador del negocio y el slug esperado son obligatorios."
    );
  }

  const business = await prisma.negocio.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "business_not_found",
      },
      "El negocio no existe o ya no esta disponible."
    );
  }

  if (business.slug !== expectedSlug) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "business_slug_mismatch",
      },
      "El slug esperado no coincide con el negocio seleccionado. Recarga la vista antes de continuar."
    );
  }

  return business;
}

async function resolveGroupContext(args: {
  action: string;
  traceId: string;
  actorUserId: string;
  businessId: string;
  expectedSlug: string;
  groupId: string;
}): Promise<GroupContext | AdminCatalogGroupProductActionErrorResult> {
  const groupId = normalizeRequiredString(args.groupId);

  if (!groupId) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "missing_group_id",
      },
      "El identificador del grupo es obligatorio."
    );
  }

  const group = await prisma.catalogGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      negocioId: true,
      nombre: true,
      slug: true,
      description: true,
      parentId: true,
      order: true,
      isActive: true,
    },
  });

  if (!group) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "group_not_found",
      },
      "El grupo no existe o ya no esta disponible."
    );
  }

  if (group.negocioId !== args.businessId) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "group_business_mismatch",
      },
      "El grupo no pertenece al negocio seleccionado."
    );
  }

  return group;
}

function normalizeBatchProducts(
  products: SaveAdminCatalogGroupProductsBatchActionInput["products"]
):
  | { ok: true; products: NormalizedBatchProduct[] }
  | { ok: false; error: string; reason: string } {
  if (!Array.isArray(products)) {
    return {
      ok: false,
      error: "El lote de productos debe ser un arreglo.",
      reason: "invalid_products_array",
    };
  }

  const normalizedProducts: NormalizedBatchProduct[] = [];
  const productIds = new Set<string>();

  for (const [index, product] of products.entries()) {
    const productId = normalizeRequiredString(product?.productId);
    const isFeatured = normalizeOptionalBoolean(product?.isFeatured);

    if (!productId) {
      return {
        ok: false,
        error: "Todos los productos del lote deben tener productId.",
        reason: "missing_product_id",
      };
    }

    if (productIds.has(productId)) {
      return {
        ok: false,
        error: "Hay productos duplicados en el lote. Revisa la selección.",
        reason: "duplicate_product_id",
      };
    }

    if (
      typeof product?.order !== "number" ||
      !Number.isFinite(product.order) ||
      !Number.isInteger(product.order) ||
      product.order < 0
    ) {
      return {
        ok: false,
        error: "Cada producto debe tener un order entero mayor o igual a 0.",
        reason: "invalid_product_order",
      };
    }

    if (isFeatured === null) {
      return {
        ok: false,
        error: "El campo isFeatured debe ser booleano cuando se envía.",
        reason: "invalid_is_featured",
      };
    }

    productIds.add(productId);
    normalizedProducts.push({
      productId,
      requestedOrder: product.order,
      order: product.order,
      isFeatured: isFeatured ?? false,
      originalIndex: index,
    });
  }

  const canonicalProducts = [...normalizedProducts]
    .sort((left, right) => {
      if (left.requestedOrder !== right.requestedOrder) {
        return left.requestedOrder - right.requestedOrder;
      }

      return left.originalIndex - right.originalIndex;
    })
    .map((product, index) => ({
      ...product,
      order: index,
    }));

  return {
    ok: true,
    products: canonicalProducts,
  };
}

export async function getAdminCatalogGroupDetailAction(
  rawInput: GetAdminCatalogGroupDetailActionInput
): Promise<GetAdminCatalogGroupDetailActionResult> {
  const action = "getAdminCatalogGroupDetailAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para consultar este grupo de catalogo."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const groupId = normalizeRequiredString(rawInput?.groupId);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId,
      productsCount: undefined,
    });

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const groupResult = await resolveGroupContext({
      action,
      traceId,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId,
    });

    if ("ok" in groupResult) {
      return groupResult;
    }

    const groupWithProducts = await prisma.catalogGroup.findUnique({
      where: { id: groupResult.id },
      select: {
        id: true,
        nombre: true,
        slug: true,
        description: true,
        parentId: true,
        order: true,
        isActive: true,
        productos: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: {
            productId: true,
            order: true,
            isFeatured: true,
            product: {
              select: {
                id: true,
                nombre: true,
                slug: true,
                precio: true,
                status: true,
                imagenes: {
                  select: { url: true },
                  take: 1,
                },
                category: {
                  select: {
                    id: true,
                    nombre: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!groupWithProducts) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          groupId,
          reason: "group_not_found_after_validation",
        },
        "El grupo no existe o ya no esta disponible."
      );
    }

    const group: AdminCatalogGroupDetail = {
      id: groupWithProducts.id,
      nombre: groupWithProducts.nombre,
      slug: groupWithProducts.slug,
      description: groupWithProducts.description,
      parentId: groupWithProducts.parentId,
      order: groupWithProducts.order,
      isActive: groupWithProducts.isActive,
      productCount: groupWithProducts.productos.length,
      products: groupWithProducts.productos.map((assignment) => ({
        productId: assignment.productId,
        order: assignment.order,
        isFeatured: assignment.isFeatured,
        product: {
          id: assignment.product.id,
          nombre: assignment.product.nombre,
          slug: assignment.product.slug,
          precio: assignment.product.precio,
          status: assignment.product.status,
          imageUrl: assignment.product.imagenes[0]?.url ?? null,
          category: assignment.product.category
            ? {
                id: assignment.product.category.id,
                nombre: assignment.product.category.nombre,
                slug: assignment.product.category.slug,
              }
            : null,
        },
      })),
    };

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: group.id,
      productsCount: group.productCount,
    });

    return {
      ok: true,
      group,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: normalizeRequiredString(rawInput?.groupId),
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible obtener el detalle del grupo de catalogo en este momento.",
    };
  }
}

export async function getAdminAvailableProductsForCatalogGroupAction(
  rawInput: GetAdminAvailableProductsForCatalogGroupActionInput
): Promise<GetAdminAvailableProductsForCatalogGroupActionResult> {
  const action = "getAdminAvailableProductsForCatalogGroupAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para consultar productos de este grupo."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const groupId = normalizeRequiredString(rawInput?.groupId);
    const search = normalizeSearch(rawInput?.search);
    const take = normalizeTake(rawInput?.take);
    const skip = normalizeSkip(rawInput?.skip);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId,
      productsCount: undefined,
    });

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const groupResult = await resolveGroupContext({
      action,
      traceId,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId,
    });

    if ("ok" in groupResult) {
      return groupResult;
    }

    const where = {
      negocioId: businessResult.id,
      status: {
        in: AVAILABLE_PRODUCT_STATUSES,
      },
      ...(search
        ? {
            nombre: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          slug: true,
          precio: true,
          status: true,
          imagenes: {
            select: { url: true },
            take: 1,
          },
          category: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
          catalogGroupProducts: {
            where: { catalogGroupId: groupResult.id },
            select: {
              order: true,
              isFeatured: true,
            },
            take: 1,
          },
        },
        orderBy: [{ nombre: "asc" }, { createdAt: "desc" }],
        take,
        skip,
      }),
    ]);

    const mappedProducts: AdminCatalogGroupAvailableProduct[] = products.map(
      (product) => {
        const assignment = product.catalogGroupProducts[0] ?? null;

        return {
          id: product.id,
          nombre: product.nombre,
          slug: product.slug,
          precio: product.precio,
          status: product.status,
          imageUrl: product.imagenes[0]?.url ?? null,
          category: product.category
            ? {
                id: product.category.id,
                nombre: product.category.nombre,
                slug: product.category.slug,
              }
            : null,
          isAssignedToGroup: Boolean(assignment),
          groupAssignment: assignment
            ? {
                order: assignment.order,
                isFeatured: assignment.isFeatured,
              }
            : null,
        };
      }
    );

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: groupResult.id,
      productsCount: mappedProducts.length,
    });

    return {
      ok: true,
      products: mappedProducts,
      total,
      take,
      skip,
      hasMore: skip + mappedProducts.length < total,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: normalizeRequiredString(rawInput?.groupId),
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible obtener los productos disponibles para este grupo.",
    };
  }
}

export async function saveAdminCatalogGroupProductsBatchAction(
  rawInput: SaveAdminCatalogGroupProductsBatchActionInput
): Promise<SaveAdminCatalogGroupProductsBatchActionResult> {
  const action = "saveAdminCatalogGroupProductsBatchAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para guardar productos en este grupo."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const groupId = normalizeRequiredString(rawInput?.groupId);
    const normalizedBatchResult = normalizeBatchProducts(rawInput?.products);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId,
      productsCount: Array.isArray(rawInput?.products)
        ? rawInput.products.length
        : undefined,
    });

    if (!normalizedBatchResult.ok) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId,
          expectedSlug,
          groupId,
          productsCount: Array.isArray(rawInput?.products)
            ? rawInput.products.length
            : undefined,
          reason: normalizedBatchResult.reason,
        },
        normalizedBatchResult.error
      );
    }

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const groupResult = await resolveGroupContext({
      action,
      traceId,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId,
    });

    if ("ok" in groupResult) {
      return groupResult;
    }

    const normalizedProducts = normalizedBatchResult.products;
    const productIds = normalizedProducts.map((product) => product.productId);

    if (productIds.length > 0) {
      const validProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          negocioId: businessResult.id,
        },
        select: { id: true },
      });

      if (validProducts.length !== productIds.length) {
        return controlledError(
          action,
          traceId,
          actorUserId,
          {
            businessId: businessResult.id,
            expectedSlug: businessResult.slug,
            groupId: groupResult.id,
            productsCount: productIds.length,
            reason: "product_business_mismatch",
          },
          "Uno o más productos no existen o no pertenecen al negocio seleccionado."
        );
      }
    }

    const existingAssignments = await prisma.catalogGroupProduct.findMany({
      where: { catalogGroupId: groupResult.id },
      select: { productId: true },
    });

    const existingProductIds = new Set(
      existingAssignments.map((assignment) => assignment.productId)
    );

    const assignments = await prisma.$transaction(async (tx) => {
      await tx.catalogGroupProduct.deleteMany({
        where: {
          catalogGroupId: groupResult.id,
          ...(productIds.length > 0 ? { productId: { notIn: productIds } } : {}),
        },
      });

      const savedAssignments = [];

      for (const product of normalizedProducts) {
        const assignment = await tx.catalogGroupProduct.upsert({
          where: {
            catalogGroupId_productId: {
              catalogGroupId: groupResult.id,
              productId: product.productId,
            },
          },
          create: {
            catalogGroupId: groupResult.id,
            productId: product.productId,
            order: product.order,
            isFeatured: product.isFeatured,
          },
          update: {
            order: product.order,
            isFeatured: product.isFeatured,
          },
          select: {
            productId: true,
            order: true,
            isFeatured: true,
          },
        });

        savedAssignments.push(assignment);
      }

      return savedAssignments.sort((left, right) => left.order - right.order);
    });

    revalidateAdminCatalogGroupProductSurfaces(businessResult.slug);

    const finalProductIdSet = new Set(productIds);
    const added = productIds.filter(
      (productId) => !existingProductIds.has(productId)
    ).length;
    const removed = existingAssignments.filter(
      (assignment) => !finalProductIdSet.has(assignment.productId)
    ).length;

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: groupResult.id,
      productsCount: assignments.length,
    });

    return {
      ok: true,
      assignments,
      summary: {
        added,
        removed,
        kept: assignments.length - added,
      },
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: normalizeRequiredString(rawInput?.groupId),
      productsCount: Array.isArray(rawInput?.products)
        ? rawInput.products.length
        : undefined,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible guardar los productos del grupo en este momento.",
    };
  }
}
