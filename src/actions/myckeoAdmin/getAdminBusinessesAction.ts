"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type BusinessStatusFilter = "all" | "activo" | "suspendido" | "eliminado";
type BusinessKindFilter = "all" | "real" | "test";
type BusinessArchiveFilter = "all" | "archived" | "not_archived";
type BusinessSortBy = "createdAt" | "updatedAt" | "nombre" | "slug";
type SortDirection = "asc" | "desc";

export interface GetAdminBusinessesActionInput {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BusinessStatusFilter;
  kind?: BusinessKindFilter;
  archived?: BusinessArchiveFilter;
  sortBy?: BusinessSortBy;
  sortDirection?: SortDirection;
}

export interface AdminBusinessListItem {
  id: string;
  nombre: string;
  slug: string | null;
  estado: string;
  isTestData: boolean;
  archivedAt: Date | null;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAdminBusinessesActionResult {
  ok: boolean;
  data: {
    items: AdminBusinessListItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
    filters: {
      search: string;
      status: BusinessStatusFilter;
      kind: BusinessKindFilter;
      archived: BusinessArchiveFilter;
      sortBy: BusinessSortBy;
      sortDirection: SortDirection;
    };
  } | null;
  error: string | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function normalizePage(value?: number): number {
  if (!value || Number.isNaN(value) || value < 1) return DEFAULT_PAGE;
  return Math.floor(value);
}

function normalizePageSize(value?: number): number {
  if (!value || Number.isNaN(value) || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function normalizeSearch(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value?: string): BusinessStatusFilter {
  if (value === "activo" || value === "suspendido" || value === "eliminado") {
    return value;
  }
  return "all";
}

function normalizeKind(value?: string): BusinessKindFilter {
  if (value === "real" || value === "test") return value;
  return "all";
}

function normalizeArchived(value?: string): BusinessArchiveFilter {
  if (value === "archived" || value === "not_archived") return value;
  return "all";
}

function normalizeSortBy(value?: string): BusinessSortBy {
  if (
    value === "createdAt" ||
    value === "updatedAt" ||
    value === "nombre" ||
    value === "slug"
  ) {
    return value;
  }
  return "createdAt";
}

function normalizeSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function buildWhereClause(input: {
  search: string;
  status: BusinessStatusFilter;
  kind: BusinessKindFilter;
  archived: BusinessArchiveFilter;
}): Prisma.NegocioWhereInput {
  const where: Prisma.NegocioWhereInput = {};

  if (input.search) {
    where.OR = [
      {
        nombre: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        slug: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        id: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        usuarioId: {
          contains: input.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (input.status !== "all") {
    where.estado = input.status;
  }

  if (input.kind === "real") {
    where.isTestData = false;
  } else if (input.kind === "test") {
    where.isTestData = true;
  }

  if (input.archived === "archived") {
    where.archivedAt = {
      not: null,
    };
  } else if (input.archived === "not_archived") {
    where.archivedAt = null;
  }

  return where;
}

function buildOrderBy(
  sortBy: BusinessSortBy,
  sortDirection: SortDirection
): Prisma.NegocioOrderByWithRelationInput[] {
  if (sortBy === "nombre") {
    return [{ nombre: sortDirection }, { createdAt: "desc" }];
  }

  if (sortBy === "slug") {
    return [{ slug: sortDirection }, { createdAt: "desc" }];
  }

  if (sortBy === "updatedAt") {
    return [{ updatedAt: sortDirection }, { createdAt: "desc" }];
  }

  return [{ createdAt: sortDirection }];
}

function buildTraceId(): string {
  return `get-admin-businesses-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function getAdminBusinessesAction(
  rawInput: GetAdminBusinessesActionInput = {}
): Promise<GetAdminBusinessesActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`[getAdminBusinessesAction][${traceId}] Sesión no válida`);
      return {
        ok: false,
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`[getAdminBusinessesAction][${traceId}] Acceso denegado`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        data: null,
        error: "No tienes permisos para consultar los negocios.",
      };
    }

    const page = normalizePage(rawInput.page);
    const pageSize = normalizePageSize(rawInput.pageSize);
    const search = normalizeSearch(rawInput.search);
    const status = normalizeStatus(rawInput.status);
    const kind = normalizeKind(rawInput.kind);
    const archived = normalizeArchived(rawInput.archived);
    const sortBy = normalizeSortBy(rawInput.sortBy);
    const sortDirection = normalizeSortDirection(rawInput.sortDirection);

    const where = buildWhereClause({
      search,
      status,
      kind,
      archived,
    });

    const orderBy = buildOrderBy(sortBy, sortDirection);
    const skip = (page - 1) * pageSize;

    console.info(`[getAdminBusinessesAction][${traceId}] Inicio`, {
      userId: session.user.id,
      filters: {
        page,
        pageSize,
        search,
        status,
        kind,
        archived,
        sortBy,
        sortDirection,
      },
    });

    const [items, totalItems] = await Promise.all([
      prisma.negocio.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          nombre: true,
          slug: true,
          estado: true,
          isTestData: true,
          archivedAt: true,
          usuarioId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.negocio.count({
        where,
      }),
    ]);

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

    console.info(`[getAdminBusinessesAction][${traceId}] Consulta OK`, {
      returnedItems: items.length,
      totalItems,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          search,
          status,
          kind,
          archived,
          sortBy,
          sortDirection,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error(`[getAdminBusinessesAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      data: null,
      error: "No fue posible obtener los negocios en este momento.",
    };
  }
}