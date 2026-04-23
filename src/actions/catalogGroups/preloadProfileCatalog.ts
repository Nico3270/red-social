"use server";

import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";
import { buildPublicBusinessBySlugWhere } from "@/lib/business/publicBusinessVisibility";
import prisma from "@/lib/prisma";
import {
  hasNegocioCatalogGroupsActive,
  getCatalogGroupsTreeByBusinessSlug,
  getCatalogGroupDetail,
  type CatalogGroupTreeNode,
} from "./getCatalogGroupsTree";
import {
  getGroupProductsPublic,
} from "./getGroupProductsPublic";
import { mapPublicCatalogGroupProductToProductRedSocial } from "./mapPublicCatalogGroupProduct";
import { findGroupInTree, getFirstValidGroup } from "@/perfil/helpers/catalog-group-url";

/**
 * DETECTOR DE RESTAURANTE: Identifica si un negocio es de comida/bebidas
 * basado en señales de categoría y nombres de grupos
 */
interface RestaurantDetectionInput {
  categoryNames: string[];
  groupNames: string[];
  totalGroups: number;
}

interface RestaurantDetectionResult {
  shouldUseRestaurantMenu: boolean;
  confidence: "high" | "medium" | "low";
  categorySignals: number;
  groupNameSignals: number;
  restaurantType?: string;
}

const RESTAURANT_CATEGORIES = new Set([
  "restaurante",
  "restaurant",
  "comida",
  "food",
  "bebidas",
  "beverage",
  "beverages",
  "café",
  "cafe",
  "coffee",
  "bar",
  "pub",
  "pizzería",
  "pizzeria",
  "chicken",
  "pollo",
  "hamburguesa",
  "hamburger",
  "pasta",
  "sushi",
  "asian",
  "asiatico",
  "asiático",
  "mexican",
  "mexicano",
  "taquería",
  "taqueria",
  "bakery",
  "panadería",
  "pastelería",
  "postres",
  "desserts",
  "ice cream",
  "helado",
]);

const RESTAURANT_GROUP_NAMES = new Set([
  "entradas",
  "appetizers",
  "entrantes",
  "platos",
  "mains",
  "plato principal",
  "main dishes",
  "postres",
  "desserts",
  "bebidas",
  "drinks",
  "cócteles",
  "cocktails",
  "vinos",
  "wines",
  "cervezas",
  "beers",
  "refrescos",
  "soft drinks",
  "desayuno",
  "breakfast",
  "almuerzo",
  "lunch",
  "cena",
  "dinner",
  "sopas",
  "soups",
  "ensaladas",
  "salads",
  "carnes",
  "meats",
  "pescados",
  "fish",
  "seafood",
  "mariscos",
  "verduras",
  "vegetables",
  "arroces",
  "rice",
  "pastas",
  "pastes",
  "pizzas",
  "burgers",
  "sándwiches",
  "sandwiches",
]);

function detectRestaurantModeSignals(input: RestaurantDetectionInput): RestaurantDetectionResult {
  const { categoryNames, groupNames, totalGroups } = input;

  let categorySignals = 0;
  let groupNameSignals = 0;
  let restaurantType: string | undefined;

  // Contar señales de categoría
  categoryNames.forEach((cat) => {
    if (RESTAURANT_CATEGORIES.has(cat)) {
      categorySignals++;
      // Infer type
      if (cat.includes("café") || cat.includes("cafe") || cat.includes("coffee")) {
        restaurantType = "cafe";
      } else if (cat.includes("bar") || cat.includes("pub")) {
        restaurantType = "bar";
      } else if (cat.includes("panadería") || cat.includes("pastelería") || cat.includes("bakery")) {
        restaurantType = "bakery";
      } else if (!restaurantType) {
        restaurantType = "restaurant";
      }
    }
  });

  // Contar señales de nombres de grupos
  groupNames.forEach((grp) => {
    if (RESTAURANT_GROUP_NAMES.has(grp)) {
      groupNameSignals++;
    }
  });

  // Decidir confianza
  let confidence: "high" | "medium" | "low" = "low";

  if (categorySignals >= 1 && groupNameSignals >= 3) {
    confidence = "high";
  } else if (categorySignals >= 1 || groupNameSignals >= 2) {
    confidence = "medium";
  } else if (totalGroups >= 4 && groupNameSignals >= 1) {
    confidence = "medium";
  }

  return {
    shouldUseRestaurantMenu: confidence !== "low",
    confidence,
    categorySignals,
    groupNameSignals,
    restaurantType,
  };
}

/**
 * Estructura de un grupo de catálogo para preview en landing
 */
export interface CatalogGroupPreview {
  id: string;
  nombre: string;
  slug: string;
  hasSubgroups: boolean;
  subgroupCount: number;
  productCount: number;
  featured?: Array<{
    productId: string;
    nombre?: string;
    imagen?: string;
    precio?: number;
  }>;
  stats?: {
    minPrice?: number;
    maxPrice?: number;
    avgPrice?: number;
    featuredCount?: number;
  };
}

/**
 * Señales editoriales externas para el motor de guía
 * Indica si el negocio usa CatalogGroups como estructura editorial principal
 */
export interface CatalogGroupsSignal {
  enabled: boolean;
  rootGroupCount: number;
  totalGroupCount: number;
  groupNames: string[];
  hasDeepHierarchy: boolean;
  // NUEVO: estadísticas por grupo para decisiones editoriales
  groupStats?: Array<{
    id: string;
    nombre: string;
    slug: string;
    productCount: number;
    featuredCount: number;
    sortPriority: number; // 0=más importante, 1=importante, 2=normal, etc
  }>;
  // NUEVO: información de jerarquía profunda
  groupHierarchy?: {
    // Grupos raíz que tienen subgrupos "útiles"
    complexGroups: Array<{ id: string; nombre: string; subgroupCount: number }>;
    // Profundidad máxima
    maxDepth: number;
  };
}

/**
 * Preload completo de CatalogGroups para el perfil público
 * 
 * Esta acción se ejecuta en servidor durante el render inicial del perfil,
 * para evitar cascadas de carga innecesarias en cliente.
 * 
 * Retorna:
 * - navigationMode: "traditional" o "catalogGroups"
 * - catalogGroupsTree: árbol de grupos (si aplica)
 * - initialGroupId: ID del primer grupo a mostrar
 * - initialGroupProducts: productos del grupo inicial precargados
 * - rootGroups: grupos raíz para preview en landing
 * - groupsSignal: información editorial para motor de guía
 * - isRestaurantMenuMode: si debe usar vista premium restaurante
 * - restaurantSignals: información de detección de restaurante
 */
export interface ProfileCatalogPreloadData {
  navigationMode: "traditional" | "catalogGroups";
  hasCatalogGroups: boolean;
  catalogGroupsTree?: CatalogGroupTreeNode[];
  initialGroupId?: string;
  initialGroupProducts?: ProductRedSocial[];
  rootGroups?: CatalogGroupPreview[];
  groupsSignal?: CatalogGroupsSignal;
  isRestaurantMenuMode?: boolean;
  restaurantSignals?: {
    confidence: "high" | "medium" | "low";
    categorySignals: number;
    groupNameSignals: number;
    restaurantType?: string;
  };
  context?: {
    negocioId: string;
    negocioSlug: string;
    categoryNames?: string[];
  };
}

/**
 * Preload servidor: obtiene todo lo necesario para mostrar CatalogGroups
 * sin cascadas de carga en cliente
 */
export async function preloadProfileCatalogData(
  businessSlug: string
): Promise<ProfileCatalogPreloadData> {
  try {
    if (!businessSlug) {
      return {
        navigationMode: "traditional",
        hasCatalogGroups: false,
      };
    }

    // Obtener negocio
    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessBySlugWhere(businessSlug),
      select: { 
        id: true, 
        slug: true,
        categorias: {
          select: {
            category: {
              select: {
                nombre: true,
                isActive: true,
              },
            },
          },
        }
      },
    });

    if (!negocio) {
      return {
        navigationMode: "traditional",
        hasCatalogGroups: false,
      };
    }

    const categoryNames =
      negocio.categorias
        ?.filter((item) => item.category?.isActive)
        .map((item) => item.category.nombre.toLowerCase()) || [];

    // Verificar si tiene CatalogGroups activos
    const hasCatalogGroups = await hasNegocioCatalogGroupsActive(negocio.id);

    if (!hasCatalogGroups) {
      return {
        navigationMode: "traditional",
        hasCatalogGroups: false,
        context: {
          negocioId: negocio.id,
          negocioSlug: negocio.slug,
          categoryNames,
        },
      };
    }

    // Obtener árbol de grupos
    const treeResult = await getCatalogGroupsTreeByBusinessSlug(businessSlug);

    if (!treeResult.ok || !treeResult.tree || treeResult.tree.length === 0) {
      reportOperationalWarning({
        area: "catalog-preload",
        event: "catalog_groups_tree_unavailable",
        message: "El negocio tenia CatalogGroups activos, pero el arbol publico no estuvo disponible.",
        context: {
          businessSlug,
          negocioId: negocio.id,
          treeMessage: treeResult.message,
        },
        dedupeKey: `catalog-tree-unavailable:${businessSlug}`,
      });

      return {
        navigationMode: "traditional",
        hasCatalogGroups: false,
        context: {
          negocioId: negocio.id,
          negocioSlug: negocio.slug,
          categoryNames,
        },
      };
    }

    const extractGroupNamesForDetection = (groups: CatalogGroupTreeNode[]): string[] => {
      const names: string[] = [];
      groups.forEach((group) => {
        names.push(group.nombre.toLowerCase());
        if (group.children) {
          names.push(...extractGroupNamesForDetection(group.children));
        }
      });
      return names;
    };

    const allGroupNames = extractGroupNamesForDetection(treeResult.tree);

    // DETECTOR DE RESTAURANTE: Analizar señales
    const restaurantDetection = detectRestaurantModeSignals({
      categoryNames,
      groupNames: allGroupNames,
      totalGroups: allGroupNames.length,
    });

    const initialGroupId = getFirstValidGroup(treeResult.tree);
    const initialGroupNode = initialGroupId
      ? findGroupInTree(initialGroupId, treeResult.tree)
      : null;

    if (!initialGroupId || !initialGroupNode) {
      reportOperationalWarning({
        area: "catalog-preload",
        event: "catalog_initial_group_unresolved",
        message: "No se pudo resolver un grupo inicial valido para el perfil publico.",
        context: {
          businessSlug,
          negocioId: negocio.id,
          rootGroupCount: treeResult.tree.length,
        },
        dedupeKey: `catalog-initial-group-unresolved:${businessSlug}`,
      });

      return {
        navigationMode: "traditional",
        hasCatalogGroups: false,
        context: {
          negocioId: negocio.id,
          negocioSlug: negocio.slug,
          categoryNames,
        },
      };
    }

    // Precargar el primer grupo realmente visible para evitar vistas vacías al abrir.
    const initialGroupProductsResult = await getGroupProductsPublic(
      initialGroupId,
      businessSlug
    );

    if (!initialGroupProductsResult.ok) {
      reportOperationalWarning({
        area: "catalog-preload",
        event: "catalog_initial_group_products_failed",
        message: "La precarga de productos del grupo inicial no estuvo disponible.",
        context: {
          businessSlug,
          initialGroupId,
          reason: initialGroupProductsResult.message,
        },
        dedupeKey: `catalog-initial-group-products-failed:${businessSlug}:${initialGroupId}`,
      });
    }

    const initialGroupProducts = initialGroupProductsResult.ok && initialGroupProductsResult.products
      ? initialGroupProductsResult.products.map((row) =>
          mapPublicCatalogGroupProductToProductRedSocial(row, negocio.slug)
        )
      : [];

    // Calcular información de grupos para preview en landing
    const countTotalGroups = (groups: CatalogGroupTreeNode[]): number => {
      return groups.reduce((acc, group) => {
        return acc + 1 + (group.children ? countTotalGroups(group.children) : 0);
      }, 0);
    };

    const extractGroupNamesDeep = (groups: CatalogGroupTreeNode[]): string[] => {
      const names: string[] = [];
      groups.forEach(group => {
        names.push(group.nombre);
        if (group.children) {
          names.push(...extractGroupNamesDeep(group.children));
        }
      });
      return names;
    };

    const countProductsDeep = (group: CatalogGroupTreeNode): number => {
      return group.productCount + group.children.reduce((acc, child) => acc + countProductsDeep(child), 0);
    };

    // Precargar featured para los primeros 2 grupos raíz (para mejorar preview)
    const preloadFeaturedForGroup = async (groupId: string, limit: number = 2) => {
      try {
        const detail = await getCatalogGroupDetail(groupId);
        if (!detail.ok) {
          reportOperationalWarning({
            area: "catalog-preload",
            event: "catalog_group_featured_preview_failed",
            message: "No se pudieron precargar los destacados del grupo para el preview del perfil.",
            context: {
              businessSlug,
              groupId,
              reason: detail.message,
            },
            dedupeKey: `catalog-group-featured-preview-failed:${businessSlug}:${groupId}`,
          });

          return [];
        }

        if (detail.ok && detail.group?.productos) {
          return detail.group.productos
            .filter(p => p.isFeatured)
            .slice(0, limit)
            .map(p => ({
              productId: p.productId,
              nombre: p.product?.nombre,
              imagen: resolveSafeImageSource(
                p.product?.imagenes?.[0]?.url,
                PLACEHOLDER_PRODUCT_IMAGE
              ),
              precio: p.product?.precio,
            }));
        }
      } catch (error) {
        reportOperationalError({
          area: "catalog-preload",
          event: "catalog_group_featured_preview_crashed",
          message: "Fallo inesperado al precargar destacados del grupo para el preview del perfil.",
          context: {
            businessSlug,
            groupId,
          },
          error,
          dedupeKey: `catalog-group-featured-preview-crashed:${businessSlug}:${groupId}`,
        });
      }

      return [];
    };

    // Construir rootGroups con stats mejorados
    const rootGroupsWithStats: CatalogGroupPreview[] = [];
    const groupStatsForSignal: Array<{
      id: string;
      nombre: string;
      slug: string;
      productCount: number;
      featuredCount: number;
      sortPriority: number;
    }> = [];

    for (let i = 0; i < treeResult.tree.length; i++) {
      const group = treeResult.tree[i];
      const hasSubgroups = group.children && group.children.length > 0;
      const productCount = countProductsDeep(group);

      // Precargar featured para primeros 2 grupos
      let featuredProducts: NonNullable<CatalogGroupPreview["featured"]> = [];
      if (i < 2) {
        featuredProducts = await preloadFeaturedForGroup(group.id, 2);
      }

      // Calcular stats básicos (precio min/max vira del preload del grupo)
      const stats: CatalogGroupPreview["stats"] = {
        featuredCount: featuredProducts.length,
      };

      const rootGroupPreview: CatalogGroupPreview = {
        id: group.id,
        nombre: group.nombre,
        slug: group.slug,
        hasSubgroups,
        subgroupCount: hasSubgroups ? group.children.length : 0,
        productCount,
        featured: featuredProducts,
        stats,
      };

      rootGroupsWithStats.push(rootGroupPreview);

      // Para groupStats: los grupos con más productos son prioritarios
      groupStatsForSignal.push({
        id: group.id,
        nombre: group.nombre,
        slug: group.slug,
        productCount,
        featuredCount: featuredProducts.length,
        sortPriority: productCount > 20 ? 0 : productCount > 10 ? 1 : 2,
      });
    }

    const totalGroupsCount = countTotalGroups(treeResult.tree);
    const groupNamesForSignal = extractGroupNamesDeep(treeResult.tree);
    
    // Detectar jerarquía profunda y grupos complejos
    const complexGroups: Array<{ id: string; nombre: string; subgroupCount: number }> = [];
    let maxDepth = 1;
    
    const analyzeDepth = (groups: CatalogGroupTreeNode[], depth: number = 1): number => {
      let max = depth;
      groups.forEach((group) => {
        if (group.children && group.children.length > 0) {
          if (group.children.length >= 3) {
            complexGroups.push({
              id: group.id,
              nombre: group.nombre,
              subgroupCount: group.children.length,
            });
          }
          max = Math.max(max, analyzeDepth(group.children, depth + 1));
        }
      });
      return max;
    };

    maxDepth = analyzeDepth(treeResult.tree);

    const hasDeepHierarchy = maxDepth > 2 || treeResult.tree.some(
      (group) => group.children && group.children.length > 0
    );

    // Ordenar groupStats por prioridad y cantidad de productos
    groupStatsForSignal.sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      return b.productCount - a.productCount;
    });

    const groupsSignal: CatalogGroupsSignal = {
      enabled: true,
      rootGroupCount: treeResult.tree.length,
      totalGroupCount: totalGroupsCount,
      groupNames: groupNamesForSignal,
      hasDeepHierarchy,
      groupStats: groupStatsForSignal.slice(0, 6), // Top 6 stats
      groupHierarchy: {
        complexGroups,
        maxDepth,
      },
    };

    return {
      navigationMode: "catalogGroups",
      hasCatalogGroups: true,
      catalogGroupsTree: treeResult.tree,
      initialGroupId,
      initialGroupProducts,
      rootGroups: rootGroupsWithStats,
      groupsSignal,
      isRestaurantMenuMode: restaurantDetection.shouldUseRestaurantMenu,
      restaurantSignals: {
        confidence: restaurantDetection.confidence,
        categorySignals: restaurantDetection.categorySignals,
        groupNameSignals: restaurantDetection.groupNameSignals,
        restaurantType: restaurantDetection.restaurantType,
      },
      context: {
        negocioId: negocio.id,
        negocioSlug: negocio.slug,
        categoryNames,
      },
    };
  } catch (error) {
    reportOperationalError({
      area: "catalog-preload",
      event: "catalog_preload_failed",
      message: "Fallo la precarga del catalogo publico del perfil.",
      context: {
        businessSlug,
      },
      error,
      dedupeKey: `catalog-preload-failed:${businessSlug}`,
    });

    return {
      navigationMode: "traditional",
      hasCatalogGroups: false,
    };
  }
}
