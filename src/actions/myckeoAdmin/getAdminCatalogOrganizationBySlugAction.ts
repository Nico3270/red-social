"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import type { EstadoNegocio } from "@prisma/client";

export type AdminCatalogOrganizationBusiness = {
  id: string;
  nombre: string;
  slug: string;
  estado: EstadoNegocio;
  isTestData: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminCatalogOrganizationGroup = {
  id: string;
  nombre: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
  children: AdminCatalogOrganizationGroup[];
};

export type AdminCatalogOrganizationStats = {
  totalGroups: number;
  activeGroups: number;
  inactiveGroups: number;
  totalAssignedProducts: number;
};

export type AdminCatalogOrganizationCatalog = {
  groups: AdminCatalogOrganizationGroup[];
  stats: AdminCatalogOrganizationStats;
};

export type GetAdminCatalogOrganizationBySlugActionResult =
  | {
      ok: true;
      business: AdminCatalogOrganizationBusiness;
      catalog: AdminCatalogOrganizationCatalog;
    }
  | {
      ok: false;
      error: string;
    };

type RawCatalogGroupRow = {
  id: string;
  nombre: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    productos: number;
  };
};

const LOG_PREFIX = "[getAdminCatalogOrganizationBySlugAction]";
const VALID_SLUG_PATTERN = /^[a-z0-9-]+$/i;

function buildTraceId() {
  return `admin-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSlug(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

function sortCatalogGroupTree(
  groups: AdminCatalogOrganizationGroup[]
): AdminCatalogOrganizationGroup[] {
  return [...groups]
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.nombre.localeCompare(right.nombre, "es-CO");
    })
    .map((group) => ({
      ...group,
      children: sortCatalogGroupTree(group.children),
    }));
}

function buildCatalogGroupTree(rows: RawCatalogGroupRow[]) {
  const nodeMap = new Map<string, AdminCatalogOrganizationGroup>();
  const roots: AdminCatalogOrganizationGroup[] = [];

  for (const row of rows) {
    nodeMap.set(row.id, {
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      description: row.description,
      parentId: row.parentId,
      order: row.order,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      productCount: row._count.productos,
      children: [],
    });
  }

  for (const row of rows) {
    const node = nodeMap.get(row.id);

    if (!node) {
      continue;
    }

    if (!row.parentId) {
      roots.push(node);
      continue;
    }

    const parentNode = nodeMap.get(row.parentId);

    if (!parentNode) {
      roots.push(node);
      continue;
    }

    parentNode.children.push(node);
  }

  return sortCatalogGroupTree(roots);
}

export async function getAdminCatalogOrganizationBySlugAction(
  rawSlug: string
): Promise<GetAdminCatalogOrganizationBySlugActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();
  const slug = normalizeSlug(rawSlug);

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "unauthenticated",
        slug,
      });
      return { ok: false, error: "No autorizado." };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "forbidden_role",
        actorUserId: session.user.id,
        slug,
      });
      return {
        ok: false,
        error: "No tienes permisos para consultar la organización de este catálogo.",
      };
    }

    if (!slug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "missing_slug",
        actorUserId: session.user.id,
      });
      return { ok: false, error: "El slug del negocio es obligatorio." };
    }

    if (!VALID_SLUG_PATTERN.test(slug)) {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        reason: "invalid_slug_format",
        actorUserId: session.user.id,
        slug,
      });
      return { ok: false, error: "El slug del negocio no es válido." };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      slug,
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
      return { ok: false, error: "No se encontró un negocio con ese slug." };
    }

    const rawGroups = await prisma.catalogGroup.findMany({
      where: { negocioId: business.id },
      select: {
        id: true,
        nombre: true,
        slug: true,
        description: true,
        parentId: true,
        order: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            productos: true,
          },
        },
      },
      orderBy: [
        { parentId: "asc" },
        { order: "asc" },
        { nombre: "asc" },
      ],
    });

    const stats: AdminCatalogOrganizationStats = {
      totalGroups: rawGroups.length,
      activeGroups: rawGroups.filter((group) => group.isActive).length,
      inactiveGroups: rawGroups.filter((group) => !group.isActive).length,
      totalAssignedProducts: rawGroups.reduce(
        (total, group) => total + group._count.productos,
        0
      ),
    };

    const groups = buildCatalogGroupTree(rawGroups);

    console.info(`${LOG_PREFIX}[${traceId}] Negocio encontrado`, {
      actorUserId: session.user.id,
      slug,
      totalGroups: stats.totalGroups,
      activeGroups: stats.activeGroups,
      inactiveGroups: stats.inactiveGroups,
      totalAssignedProducts: stats.totalAssignedProducts,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      business,
      catalog: {
        groups,
        stats,
      },
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      actorUserId: null,
      slug,
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return {
      ok: false,
      error: "No fue posible cargar la organización del catálogo en este momento.",
    };
  }
}
