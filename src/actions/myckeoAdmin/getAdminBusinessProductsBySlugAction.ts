"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import type {
  Currency,
  EstadoNegocio,
  ProductEtiquetaEspecial,
} from "@prisma/client";

export type AdminBusinessProductsStatusFilter = "todos" | ProductStatus;

export interface AdminBusinessProductsAuditFilters {
  withoutImages?: boolean;
  withoutSections?: boolean;
  withoutCatalogGroups?: boolean;
  zeroPrice?: boolean;
  usesVariantsWithoutActiveVariants?: boolean;
  needsReview?: boolean;
}

export interface GetAdminBusinessProductsBySlugActionInput {
  slug: string;
  search?: string;
  status?: AdminBusinessProductsStatusFilter;
  filters?: AdminBusinessProductsAuditFilters;
  page?: number;
  pageSize?: number;
}

export interface AdminBusinessProductsBusiness {
  id: string;
  nombre: string;
  slug: string;
  estado: EstadoNegocio;
  isTestData: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminBusinessProductsCategory {
  id: string;
  nombre: string;
  slug: string;
  isActive: boolean;
}

export interface AdminBusinessProductsListItem {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  descripcionCorta: string | null;
  precio: number;
  currency: Currency;
  status: ProductStatus;
  stock: number | null;
  stockIlimitado: boolean;
  usaVariantes: boolean;
  prioridad: number | null;
  orden: number;
  etiquetaEspecial: ProductEtiquetaEspecial | null;
  createdAt: Date;
  updatedAt: Date;
  category: AdminBusinessProductsCategory;
  imageUrl: string | null;
  imageCount: number;
  sectionCount: number;
  catalogGroupCount: number;
  variantCount: number;
  activeVariantCount: number;
  orderItemCount: number;
  publicationLinksCount: number;
  hasImages: boolean;
  hasSections: boolean;
  hasCatalogGroups: boolean;
  hasZeroOrInvalidPrice: boolean;
  isHidden: boolean;
  isDiscontinued: boolean;
  usesVariantsWithoutActiveVariants: boolean;
  needsReview: boolean;
}

export interface AdminBusinessProductsStats {
  totalProducts: number;
  totalDisponible: number;
  totalAgotado: number;
  totalOculto: number;
  totalDescontinuado: number;
  totalWithoutImages: number;
  totalWithoutSections: number;
  totalWithoutCatalogGroups: number;
  totalZeroPrice: number;
  totalNeedsReview: number;
}

export interface AdminBusinessProductsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type GetAdminBusinessProductsBySlugActionResult =
  | {
      ok: true;
      business: AdminBusinessProductsBusiness;
      products: AdminBusinessProductsListItem[];
      stats: AdminBusinessProductsStats;
      pagination: AdminBusinessProductsPagination;
    }
  | {
      ok: false;
      error: string;
    };

type ResolvedAuditFilters = Required<AdminBusinessProductsAuditFilters>;

const LOG_PREFIX = "[getAdminBusinessProductsBySlugAction]";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function buildTraceId() {
  return `admin-business-products-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeSlug(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearch(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePage(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) {
    return DEFAULT_PAGE;
  }

  return Math.floor(value);
}

function normalizePageSize(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function normalizeStatus(
  value?: AdminBusinessProductsStatusFilter,
): AdminBusinessProductsStatusFilter {
  if (value === "todos") {
    return value;
  }

  return Object.values(ProductStatus).includes(value as ProductStatus)
    ? (value as ProductStatus)
    : "todos";
}

function normalizeFilters(
  value?: AdminBusinessProductsAuditFilters,
): ResolvedAuditFilters {
  return {
    withoutImages: value?.withoutImages === true,
    withoutSections: value?.withoutSections === true,
    withoutCatalogGroups: value?.withoutCatalogGroups === true,
    zeroPrice: value?.zeroPrice === true,
    usesVariantsWithoutActiveVariants:
      value?.usesVariantsWithoutActiveVariants === true,
    needsReview: value?.needsReview === true,
  };
}

function buildNeedsReviewWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      { status: ProductStatus.oculto },
      { status: ProductStatus.descontinuado },
      { imagenes: { none: {} } },
      { precio: { lte: 0 } },
      { secciones: { none: {} } },
      {
        AND: [
          { usaVariantes: true },
          { variantes: { none: { isActive: true } } },
        ],
      },
    ],
  };
}

function buildProductWhere(args: {
  businessId: string;
  search: string;
  status: AdminBusinessProductsStatusFilter;
  filters: ResolvedAuditFilters;
}): Prisma.ProductWhereInput {
  const andClauses: Prisma.ProductWhereInput[] = [
    {
      negocioId: args.businessId,
    },
  ];

  if (args.search) {
    andClauses.push({
      OR: [
        {
          nombre: {
            contains: args.search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: args.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (args.status !== "todos") {
    andClauses.push({ status: args.status });
  }

  if (args.filters.withoutImages) {
    andClauses.push({ imagenes: { none: {} } });
  }

  if (args.filters.withoutSections) {
    andClauses.push({ secciones: { none: {} } });
  }

  if (args.filters.withoutCatalogGroups) {
    andClauses.push({ catalogGroupProducts: { none: {} } });
  }

  if (args.filters.zeroPrice) {
    andClauses.push({ precio: { lte: 0 } });
  }

  if (args.filters.usesVariantsWithoutActiveVariants) {
    andClauses.push({
      AND: [
        { usaVariantes: true },
        { variantes: { none: { isActive: true } } },
      ],
    });
  }

  if (args.filters.needsReview) {
    andClauses.push(buildNeedsReviewWhere());
  }

  return { AND: andClauses };
}

function buildStatsFromStatusCounts(
  groupedCounts: Array<{
    status: ProductStatus;
    _count: { _all: number };
  }>,
): Pick<
  AdminBusinessProductsStats,
  | "totalProducts"
  | "totalDisponible"
  | "totalAgotado"
  | "totalOculto"
  | "totalDescontinuado"
> {
  const totalsByStatus: Record<ProductStatus, number> = {
    disponible: 0,
    agotado: 0,
    oculto: 0,
    descontinuado: 0,
  };

  for (const row of groupedCounts) {
    totalsByStatus[row.status] = row._count._all;
  }

  const totalProducts = Object.values(totalsByStatus).reduce(
    (sum, count) => sum + count,
    0,
  );

  return {
    totalProducts,
    totalDisponible: totalsByStatus.disponible,
    totalAgotado: totalsByStatus.agotado,
    totalOculto: totalsByStatus.oculto,
    totalDescontinuado: totalsByStatus.descontinuado,
  };
}

export async function getAdminBusinessProductsBySlugAction(
  rawInput: GetAdminBusinessProductsBySlugActionInput,
): Promise<GetAdminBusinessProductsBySlugActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "unauthenticated",
      });

      return {
        ok: false,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "forbidden_role",
        actorUserId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        error: "No tienes permisos para consultar los productos de este negocio.",
      };
    }

    const slug = normalizeSlug(rawInput?.slug);
    const search = normalizeSearch(rawInput?.search);
    const status = normalizeStatus(rawInput?.status);
    const filters = normalizeFilters(rawInput?.filters);
    const page = normalizePage(rawInput?.page);
    const pageSize = normalizePageSize(rawInput?.pageSize);
    const skip = (page - 1) * pageSize;

    if (!slug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "missing_slug",
        actorUserId: session.user.id,
      });

      return {
        ok: false,
        error: "El slug del negocio es obligatorio.",
      };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      slug,
      filters: {
        search,
        status,
        filters,
        page,
        pageSize,
      },
    });

    const business = await prisma.negocio.findUnique({
      where: { slug },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        isTestData: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!business) {
      console.info(`${LOG_PREFIX}[${traceId}] Negocio no encontrado`, {
        actorUserId: session.user.id,
        slug,
        elapsedMs: Date.now() - startedAt,
      });

      return {
        ok: false,
        error: "No se encontró un negocio con ese slug.",
      };
    }

    const baseWhere: Prisma.ProductWhereInput = {
      negocioId: business.id,
    };
    const filteredWhere = buildProductWhere({
      businessId: business.id,
      search,
      status,
      filters,
    });

    const [
      statusCounts,
      totalWithoutImages,
      totalWithoutSections,
      totalWithoutCatalogGroups,
      totalZeroPrice,
      totalNeedsReview,
      total,
      rawProducts,
    ] = await Promise.all([
      prisma.product.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: {
          _all: true,
        },
      }),
      prisma.product.count({
        where: {
          negocioId: business.id,
          imagenes: { none: {} },
        },
      }),
      prisma.product.count({
        where: {
          negocioId: business.id,
          secciones: { none: {} },
        },
      }),
      prisma.product.count({
        where: {
          negocioId: business.id,
          catalogGroupProducts: { none: {} },
        },
      }),
      prisma.product.count({
        where: {
          negocioId: business.id,
          precio: { lte: 0 },
        },
      }),
      prisma.product.count({
        where: {
          AND: [baseWhere, buildNeedsReviewWhere()],
        },
      }),
      prisma.product.count({
        where: filteredWhere,
      }),
      prisma.product.findMany({
        where: filteredWhere,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
        select: {
          id: true,
          nombre: true,
          slug: true,
          descripcion: true,
          descripcionCorta: true,
          precio: true,
          currency: true,
          status: true,
          stock: true,
          stockIlimitado: true,
          usaVariantes: true,
          prioridad: true,
          orden: true,
          etiquetaEspecial: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              nombre: true,
              slug: true,
              isActive: true,
            },
          },
          imagenes: {
            select: {
              url: true,
            },
            take: 1,
          },
          variantes: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              imagenes: true,
              secciones: true,
              catalogGroupProducts: true,
              variantes: true,
              orderItems: true,
              publicacionesRelacionadas: true,
            },
          },
        },
      }),
    ]);

    const statusStats = buildStatsFromStatusCounts(statusCounts);
    const products: AdminBusinessProductsListItem[] = rawProducts.map((product) => {
      const imageCount = product._count.imagenes;
      const sectionCount = product._count.secciones;
      const catalogGroupCount = product._count.catalogGroupProducts;
      const variantCount = product._count.variantes;
      const activeVariantCount = product.variantes.length;
      const orderItemCount = product._count.orderItems;
      const publicationLinksCount = product._count.publicacionesRelacionadas;
      const hasZeroOrInvalidPrice =
        !Number.isFinite(product.precio) || product.precio <= 0;
      const isHidden = product.status === ProductStatus.oculto;
      const isDiscontinued = product.status === ProductStatus.descontinuado;
      const usesVariantsWithoutActiveVariants =
        product.usaVariantes === true && activeVariantCount === 0;
      const needsReview =
        isHidden ||
        isDiscontinued ||
        imageCount === 0 ||
        hasZeroOrInvalidPrice ||
        sectionCount === 0 ||
        usesVariantsWithoutActiveVariants;

      return {
        id: product.id,
        nombre: product.nombre,
        slug: product.slug,
        descripcion: product.descripcion,
        descripcionCorta: product.descripcionCorta,
        precio: product.precio,
        currency: product.currency,
        status: product.status,
        stock: product.stock,
        stockIlimitado: product.stockIlimitado,
        usaVariantes: product.usaVariantes,
        prioridad: product.prioridad,
        orden: product.orden,
        etiquetaEspecial: product.etiquetaEspecial,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        category: product.category,
        imageUrl: product.imagenes[0]?.url ?? null,
        imageCount,
        sectionCount,
        catalogGroupCount,
        variantCount,
        activeVariantCount,
        orderItemCount,
        publicationLinksCount,
        hasImages: imageCount > 0,
        hasSections: sectionCount > 0,
        hasCatalogGroups: catalogGroupCount > 0,
        hasZeroOrInvalidPrice,
        isHidden,
        isDiscontinued,
        usesVariantsWithoutActiveVariants,
        needsReview,
      };
    });

    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const stats: AdminBusinessProductsStats = {
      ...statusStats,
      totalWithoutImages,
      totalWithoutSections,
      totalWithoutCatalogGroups,
      totalZeroPrice,
      totalNeedsReview,
    };

    console.info(`${LOG_PREFIX}[${traceId}] Consulta OK`, {
      actorUserId: session.user.id,
      slug,
      businessId: business.id,
      totalProducts: stats.totalProducts,
      filteredTotal: total,
      returnedItems: products.length,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      business,
      products,
      stats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      error: "No fue posible cargar los productos del negocio en este momento.",
    };
  }
}