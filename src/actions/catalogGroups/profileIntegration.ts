"use server";

import prisma from "@/lib/prisma";
import {
  hasNegocioCatalogGroupsActive,
  type CatalogGroupTreeNode,
} from "./getCatalogGroupsTree";

/**
 * FASE 3: Integración pasiva en perfil
 * 
 * Helpers para que el perfil decida qué vista usar:
 * - Si NO hay CatalogGroups → usar vista tradicional (Category/Section)
 * - Si SÍ hay CatalogGroups → preparar datos para vista de grupos (sin romper actual)
 */

export interface ProfileNavigationContext {
  hasCatalogGroups: boolean;
  negocioId: string;
  negocioSlug: string;
  // Se pueden agregar más fields según necesidad
}

export interface ProfileDataSource {
  mode: "traditional" | "catalogGroups";
  // Si mode === "traditional": usar Category/Section
  // Si mode === "catalogGroups": usar tree de grupos
  context: ProfileNavigationContext;
}

/**
 * Determina qué fuente de datos usar para navegar el catálogo
 * Usado por PerfilUsuarioHeader para decidir qué componente renderizar
 */
export async function getProfileNavigationMode(
  businessSlug: string
): Promise<ProfileDataSource> {
  try {
    // Obtener negocio
    const negocio = await prisma.negocio.findUnique({
      where: { slug: businessSlug },
      select: { id: true, slug: true },
    });

    if (!negocio) {
      return {
        mode: "traditional",
        context: {
          hasCatalogGroups: false,
          negocioId: "",
          negocioSlug: businessSlug,
        },
      };
    }

    // Verificar si tiene CatalogGroups activos
    const hasCatalogGroups = await hasNegocioCatalogGroupsActive(negocio.id);

    return {
      mode: hasCatalogGroups ? "catalogGroups" : "traditional",
      context: {
        hasCatalogGroups,
        negocioId: negocio.id,
        negocioSlug: negocio.slug,
      },
    };
  } catch (error) {
    console.error("Error en getProfileNavigationMode:", error);
    // Fallback seguro: usar modo tradicional
    return {
      mode: "traditional",
      context: {
        hasCatalogGroups: false,
        negocioId: "",
        negocioSlug: businessSlug,
      },
    };
  }
}

/**
 * Obtiene todos los datos de catálogo necesarios para el perfil
 * Decide automáticamente qué incluir basado en CatalogGroups
 */
export async function getProfileCatalogData(businessSlug: string) {
  try {
    const navigationMode = await getProfileNavigationMode(businessSlug);

    if (navigationMode.mode === "traditional") {
      // Modo tradicional: no hacer nada especial
      // El perfil usa sus queries existentes (Category/Section/ProductSection)
      return {
        ok: true,
        mode: "traditional",
        catalogGroups: null,
        context: navigationMode.context,
      };
    }

    // Modo CatalogGroups: obtener estructura
    const { getCatalogGroupsTreeByBusinessSlug } = await import(
      "./getCatalogGroupsTree"
    );
    const groupsTree = await getCatalogGroupsTreeByBusinessSlug(businessSlug);
    const catalogGroups = groupsTree.tree ?? [];
    const rootGroups = ("rootGroups" in groupsTree ? groupsTree.rootGroups : undefined) ?? catalogGroups;

    return {
      ok: true,
      mode: "catalogGroups",
      catalogGroups,
      rootGroups,
      context: navigationMode.context,
    };
  } catch (error) {
    console.error("Error en getProfileCatalogData:", error);
    // Fallback: modo tradicional
    return {
      ok: false,
      mode: "traditional",
      catalogGroups: null,
      context: {
        hasCatalogGroups: false,
        negocioId: "",
        negocioSlug: businessSlug,
      },
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Preparar props opcionales para componentes de catalogo
 * Usado cuando el perfil quiere prepararse para futura UI de grupos
 */
export interface PrepareCatalogUIProps {
  catalogGroups?: CatalogGroupTreeNode[];
  rootGroups?: CatalogGroupTreeNode[];
  hasCatalogGroups: boolean;
  mode: "traditional" | "catalogGroups";
}

export async function prepareCatalogUIProps(
  businessSlug: string
): Promise<PrepareCatalogUIProps> {
  try {
    const data = await getProfileCatalogData(businessSlug);

    return {
      catalogGroups: data.catalogGroups ?? undefined,
      rootGroups: data.rootGroups ?? undefined,
      hasCatalogGroups: data.context.hasCatalogGroups,
      mode: data.mode as "traditional" | "catalogGroups",
    };
  } catch (error) {
    console.error("Error en prepareCatalogUIProps:", error);
    return {
      hasCatalogGroups: false,
      mode: "traditional",
    };
  }
}

/**
 * Hook server helper: Obtener datos de CatalogGroups SOLO si existen
 * Retorna null si no hay grupos, para no sobrecargar
 */
export async function getCatalogGroupsIfExist(negocioId: string) {
  try {
    if (!negocioId) return null;

    const hasGroups = await hasNegocioCatalogGroupsActive(negocioId);

    if (!hasGroups) {
      return null; // No hay grupos, no hacer query innecesaria
    }

    // Si hay grupos, obtener estructura
    const { getCatalogGroupsTreeByNegocioId } = await import(
      "./getCatalogGroupsTree"
    );
    const result = await getCatalogGroupsTreeByNegocioId(negocioId);

    if (!result.ok || !result.tree) {
      return null;
    }

    return {
      tree: result.tree,
      rootGroups: ("rootGroups" in result ? result.rootGroups : undefined) ?? result.tree,
    };
  } catch (error) {
    console.error("Error en getCatalogGroupsIfExist:", error);
    return null;
  }
}
