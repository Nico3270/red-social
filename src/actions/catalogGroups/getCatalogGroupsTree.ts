"use server";

import prisma from "@/lib/prisma";

export interface CatalogGroupTreeNode {
  id: string;
  nombre: string;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  description: string | null;
  productCount: number;
  children: CatalogGroupTreeNode[];
}

/**
 * FASE 2: Lecturas estructuradas para UI
 * 
 * Devuelven estructura jerárquica ordenada lista para renderizar
 * Sin romper compatibilidad si no hay grupos
 */

/**
 * Obtiene la estructura jerárquica de grupos para un negocio por slug
 * Retorna árbol completo: padres + hijos + productos
 */
export async function getCatalogGroupsTreeByBusinessSlug(businessSlug: string) {
  try {
    if (!businessSlug) {
      return {
        ok: false,
        message: "Slug del negocio requerido",
        tree: null,
        hasGroups: false,
      };
    }

    // Obtener el negocio
    const negocio = await prisma.negocio.findUnique({
      where: { slug: businessSlug },
      select: { id: true },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
        tree: null,
        hasGroups: false,
      };
    }

    return getCatalogGroupsTreeByNegocioId(negocio.id);
  } catch (error) {
    console.error("Error en getCatalogGroupsTreeByBusinessSlug:", error);
    return {
      ok: false,
      message: "Error al obtener árbol de grupos",
      tree: null,
      hasGroups: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene la estructura jerárquica de grupos para un negocio por ID
 * Retorna árbol completo ordenado
 */
export async function getCatalogGroupsTreeByNegocioId(negocioId: string) {
  try {
    if (!negocioId) {
      return {
        ok: false,
        message: "negocioId requerido",
        tree: null,
        hasGroups: false,
      };
    }

    // Obtener TODOS los grupos (incluyendo inactivos, para obtener count completo)
    const allGroups = await prisma.catalogGroup.findMany({
      where: { negocioId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        parentId: true,
        order: true,
        isActive: true,
        description: true,
        _count: {
          select: {
            productos: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
    });

    if (!allGroups || allGroups.length === 0) {
      return {
        ok: true,
        message: "Negocio sin grupos de catálogo",
        tree: [],
        rootGroups: [],
        hasGroups: false,
      };
    }

    // Filtrar solo activos para el árbol
    const activeGroups = allGroups.filter((g) => g.isActive);

    // Construir árbol jerárquico
    const groupMap = new Map<string, CatalogGroupTreeNode>();
    const rootGroups: CatalogGroupTreeNode[] = [];

    // Primer pase: crear nodos
    for (const group of activeGroups) {
      groupMap.set(group.id, {
        id: group.id,
        nombre: group.nombre,
        slug: group.slug,
        parentId: group.parentId,
        order: group.order,
        isActive: group.isActive,
        description: group.description,
        children: [],
        productCount: group._count.productos,
      });
    }

    // Segundo pase: establecer relaciones padre/hijo
    for (const group of activeGroups) {
      const node = groupMap.get(group.id);
      if (!node) {
        continue;
      }

      if (group.parentId) {
        const parent = groupMap.get(group.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootGroups.push(node);
      }
    }

    return {
      ok: true,
      message: "Árbol de grupos obtenido exitosamente",
      tree: rootGroups,
      rootGroups,
      hasGroups: rootGroups.length > 0,
    };
  } catch (error) {
    console.error("Error en getCatalogGroupsTreeByNegocioId:", error);
    return {
      ok: false,
      message: "Error al obtener árbol de grupos",
      tree: null,
      hasGroups: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene un grupo con sus hijos y productos
 */
export async function getCatalogGroupDetail(groupId: string) {
  try {
    if (!groupId) {
      return {
        ok: false,
        message: "groupId requerido",
        group: null,
      };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            nombre: true,
            slug: true,
            order: true,
            isActive: true,
          },
        },
        productos: {
          orderBy: { order: "asc" },
          include: {
            product: {
              select: {
                id: true,
                nombre: true,
                slug: true,
                precio: true,
                descripcionCorta: true,
                imagenes: {
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return {
        ok: false,
        message: "Grupo no encontrado",
        group: null,
      };
    }

    return {
      ok: true,
      message: "Grupo obtenido exitosamente",
      group,
    };
  } catch (error) {
    console.error("Error en getCatalogGroupDetail:", error);
    return {
      ok: false,
      message: "Error al obtener detalle del grupo",
      group: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene los productos de un grupo con paginación
 */
export async function getProductsByCatalogGroup(
  groupId: string,
  take: number = 20,
  skip: number = 0
) {
  try {
    if (!groupId) {
      return {
        ok: false,
        message: "groupId requerido",
        products: [],
        total: 0,
      };
    }

    // Verificar que el grupo existe
    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      return {
        ok: false,
        message: "Grupo no encontrado",
        products: [],
        total: 0,
      };
    }

    // Obtener total de productos
    const total = await prisma.catalogGroupProduct.count({
      where: { catalogGroupId: groupId },
    });

    // Obtener productos paginados
    const products = await prisma.catalogGroupProduct.findMany({
      where: { catalogGroupId: groupId },
      include: {
        product: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            precio: true,
            descripcionCorta: true,
            status: true,
            imagenes: {
              select: { url: true },
            },
          },
        },
      },
      orderBy: { order: "asc" },
      take,
      skip,
    });

    return {
      ok: true,
      message: "Productos obtenidos exitosamente",
      products,
      total,
      hasMore: skip + take < total,
    };
  } catch (error) {
    console.error("Error en getProductsByCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al obtener productos del grupo",
      products: [],
      total: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Helper: Verifica si un negocio tiene CatalogGroups activos
 * Usado para renderizado condicional en perfil
 */
export async function hasNegocioCatalogGroupsActive(negocioId: string): Promise<boolean> {
  try {
    if (!negocioId) return false;

    const count = await prisma.catalogGroup.count({
      where: { negocioId, isActive: true },
    });

    return count > 0;
  } catch (error) {
    console.error("Error en hasNegocioCatalogGroupsActive:", error);
    return false; // Fallback seguro
  }
}

/**
 * Helper: Obtiene count de productos en un grupo
 */
export async function getCatalogGroupProductCount(groupId: string): Promise<number> {
  try {
    if (!groupId) return 0;

    return await prisma.catalogGroupProduct.count({
      where: { catalogGroupId: groupId },
    });
  } catch (error) {
    console.error("Error en getCatalogGroupProductCount:", error);
    return 0;
  }
}
