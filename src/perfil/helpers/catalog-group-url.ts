/**
 * Helpers para manejo de URL state y grupo en perfil público
 */

import type { CatalogGroupPreview } from "@/actions/catalogGroups/preloadProfileCatalog";
import { normalizeSectionSlugForUrl } from "@/perfil/helpers/catalog-section-url";

export interface CatalogGroupLike {
  id: string;
  slug: string;
  nombre?: string;
  productCount?: number;
  children?: CatalogGroupLike[];
}

export function getPreferredGroupIdFromNode<T extends CatalogGroupLike>(
  group: T | null | undefined
): string | null {
  if (!group) {
    return null;
  }

  const children = group.children ?? [];
  const hasChildren = children.length > 0;
  const hasDirectProducts =
    typeof group.productCount === "number" ? group.productCount > 0 : !hasChildren;

  if (hasDirectProducts || !hasChildren) {
    return group.id;
  }

  for (const child of children) {
    const preferredChildId = getPreferredGroupIdFromNode(child);
    if (preferredChildId) {
      return preferredChildId;
    }
  }

  return group.id;
}

/**
 * Resuelve slug de grupo a ID
 * Retorna el ID del grupo o null si no existe
 */
export function resolveGroupSlugToId(
  slug: string | undefined,
  groups: CatalogGroupPreview[] | undefined
): string | null {
  if (!slug || !groups || groups.length === 0) {
    return null;
  }

  // Buscar grupo por slug
  const group = groups.find(
    (g) => g.slug && normalizeGroupSlugForUrl(g.slug) === normalizeGroupSlugForUrl(slug)
  );

  return group?.id || null;
}

export function resolveGroupSlugToIdInTree<T extends CatalogGroupLike>(
  slug: string | undefined,
  tree: T[] | undefined
): string | null {
  if (!slug || !tree || tree.length === 0) {
    return null;
  }

  const group = findGroupBySlugInTree(slug, tree);
  return group?.id ?? null;
}

/**
 * Encuentra grupo en árbol (incluyendo subgrupos)
 */
export function findGroupInTree<T extends CatalogGroupLike>(
  groupId: string,
  tree: T[]
): T | null {
  if (!tree || tree.length === 0) {
    return null;
  }

  for (const group of tree) {
    if (group.id === groupId) {
      return group;
    }

    // Buscar en subgrupos recursivamente
    if (group.children && Array.isArray(group.children)) {
      const found = findGroupInTree(groupId, group.children as T[]);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function findGroupBySlugInTree<T extends CatalogGroupLike>(
  slug: string,
  tree: T[]
): T | null {
  const normalizedSlug = normalizeGroupSlugForUrl(slug);

  for (const group of tree) {
    if (normalizeGroupSlugForUrl(group.slug) === normalizedSlug) {
      return group;
    }

    if (group.children && Array.isArray(group.children)) {
      const found = findGroupBySlugInTree(slug, group.children as T[]);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function findRootGroupIdForGroupId<T extends CatalogGroupLike>(
  groupId: string | null | undefined,
  tree: T[] | undefined
): string | null {
  if (!groupId || !tree || tree.length === 0) {
    return null;
  }

  for (const rootGroup of tree) {
    if (rootGroup.id === groupId) {
      return rootGroup.id;
    }

    const found = findGroupInTree(groupId, rootGroup.children ?? []);
    if (found) {
      return rootGroup.id;
    }
  }

  return null;
}

/**
 * Valida si un grupo existe y es válido
 */
export function isValidGroup(
  groupId: string | null | undefined,
  groupsTree: CatalogGroupLike[] | undefined
): boolean {
  if (!groupId || !groupsTree) {
    return false;
  }

  return findGroupInTree(groupId, groupsTree) !== null;
}

/**
 * Obtiene el mejor grupo inicial para mostrar.
 * Si el grupo raíz es solo contenedor, prefiere el primer subgrupo utilizable.
 */
export function getFirstValidGroup(groupsTree: CatalogGroupLike[] | undefined): string | null {
  if (!groupsTree || groupsTree.length === 0) {
    return null;
  }

  for (const group of groupsTree) {
    const preferredGroupId = getPreferredGroupIdFromNode(group);
    if (preferredGroupId) {
      return preferredGroupId;
    }
  }

  return groupsTree[0]?.id || null;
}

/**
 * Convierte slug a URL param
 */
export function normalizeGroupSlugForUrl(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "");
}

/**
 * Construye URL del perfil con tab y grupo
 */
export function buildProfileUrl(
  negocioSlug: string,
  tab?: string,
  groupSlug?: string,
  sectionSlug?: string
): string {
  const url = `/perfil/${negocioSlug}`;
  const params = new URLSearchParams();
  const normalizedTab = tab?.toLowerCase();

  if (normalizedTab && normalizedTab !== "inicio") {
    params.append("tab", normalizedTab);
  }

  if (groupSlug) {
    params.append("group", normalizeGroupSlugForUrl(groupSlug));
  }

  if (sectionSlug) {
    params.append("section", normalizeSectionSlugForUrl(sectionSlug));
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Extrae tab y group de los params
 */
export function extractLocationParams(searchParams?: {
  tab?: string;
  group?: string;
}): {
  tab: string;
  groupSlug: string | null;
} {
  return {
    tab: searchParams?.tab ? capitalizeFirstLetter(searchParams.tab) : "Inicio",
    groupSlug: searchParams?.group || null,
  };
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function tabToUrlParam(tabName: string): string {
  if (!tabName) return "";
  return tabName.toLowerCase().replace(" ", "-");
}

/**
 * Convierte URL param a tab name
 */
export function urlParamToTab(param: string): string {
  const tabs: Record<string, string> = {
    inicio: "Inicio",
    publicaciones: "Publicaciones",
    productos: "Productos",
    negocio: "Negocio",
    reseñas: "Reseñas",
  };

  return tabs[param.toLowerCase()] || "Inicio";
}
