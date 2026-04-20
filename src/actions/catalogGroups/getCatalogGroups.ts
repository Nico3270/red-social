"use server";

/**
 * FASE 3: Acciones/Queries de lectura compatible
 * 
 * Funciones mínimas para leer CatalogGroup sin romper lo existente.
 * Si un negocio NO usa CatalogGroup, todo sigue como antes.
 * Si un negocio SÍ usa CatalogGroup, estas funciones lo cargan opcionalmente.
 */

import prisma from "@/lib/prisma";
import { GetCatalogGroupsResponse } from "@/interfaces/catalogGroup.interface";

/**
 * Obtiene los grupos de catálogo de un negocio
 * Retorna null si el negocio no existe o no tiene grupos
 */
export async function getCatalogGroupsByNegocioId(
  negocioId: string
): Promise<GetCatalogGroupsResponse> {
  try {
    if (!negocioId) {
      return {
        ok: false,
        message: "negocioId es requerido",
        groups: [],
      };
    }

    // Obtener todos los grupos del negocio
    const groups = await prisma.catalogGroup.findMany({
      where: { negocioId, isActive: true },
      orderBy: [
        { parentId: "asc" }, // Padres primero
        { order: "asc" }, // Ordenados por order
      ],
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!groups || groups.length === 0) {
      return {
        ok: true,
        message: "El negocio no tiene grupos de catálogo definidos",
        groups: [],
        rootGroups: [],
      };
    }

    // Separar grupos raíz (sin padre) y hacer opcional su uso
    const rootGroups = groups.filter((g) => !g.parentId);

    return {
      ok: true,
      message: "Grupos de catálogo obtenidos exitosamente",
      groups,
      rootGroups,
    };
  } catch (error) {
    console.error("Error en getCatalogGroupsByNegocioId:", error);
    return {
      ok: false,
      message: "Error al obtener grupos de catálogo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Obtiene un grupo específico con sus productos
 * Usado para renderizar la vista de grupo
 */
export async function getCatalogGroupWithProducts(
  catalogGroupId: string,
  take: number = 20,
  skip: number = 0
) {
  try {
    if (!catalogGroupId) {
      return {
        ok: false,
        message: "catalogGroupId es requerido",
      };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: catalogGroupId },
      include: {
        productos: {
          take,
          skip,
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
        children: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!group) {
      return {
        ok: false,
        message: "Grupo de catálogo no encontrado",
      };
    }

    return {
      ok: true,
      message: "Grupo con productos obtenido exitosamente",
      group,
    };
  } catch (error) {
    console.error("Error en getCatalogGroupWithProducts:", error);
    return {
      ok: false,
      message: "Error al obtener grupo con productos",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Verifica si un negocio tiene grupos de catálogo configurados
 * Útil para decidir si renderizar la nueva vista o la tradicional
 * 
 * Lógica: Si NO tiene grupos, usa la vista tradicional (Category/Section)
 *         Si SÍ tiene grupos, puede usar la vista de grupos O ambas
 */
export async function hasNegocioCatalogGroups(negocioId: string): Promise<boolean> {
  try {
    if (!negocioId) return false;

    const count = await prisma.catalogGroup.count({
      where: { negocioId, isActive: true },
    });

    return count > 0;
  } catch (error) {
    console.error("Error en hasNegocioCatalogGroups:", error);
    return false; // Si hay error, asume que no tiene grupos (fallback seguro)
  }
}

/**
 * ÍNDICE DE ACCIONES (para fase posterior)
 * 
 * Estos stubs indican qué funciones se agregarán en siguientes fases:
 * 
 * - createCatalogGroup()
 * - updateCatalogGroup()
 * - deleteCatalogGroup()
 * - assignProductToCatalogGroup()
 * - removeProductFromCatalogGroup()
 * - reorderCatalogGroupsProducts()
 */
