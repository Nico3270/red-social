// src/actions/feed/getFeedDataByCategory.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// EXTENSIÓN: Params con categoriaSlug requerido
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;
  categoriaSlug: string;  // REQUERIDO para filtrado temático
}

// Helper simplificado para fallback (local + nacional si escaso; con categoría fija)
async function fetchWithFallback<T>(
  fetchLocal: (params: any) => Promise<T[]>,
  fetchAll: (params: any) => Promise<T[]>,
  params: any,
  type: string,
  categoriaSlug: string,
  thresholdLocal: number = 5
): Promise<T[]> {
  let items: T[] = [];

  // 1. Local: Categoría + ciudad/depto
  try {
    items = await fetchLocal(params);
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 ${type} local para '${categoriaSlug}': ${items.length} items (ciudad: ${params.ciudad}, depto: ${params.departamento})`);
    }
  } catch (e) {
    console.error(`Error en ${type} local para '${categoriaSlug}':`, e);
  }

  // 2. Si escaso, fallback nacional: Solo categoría (sin ciudad/depto)
  if (items.length < thresholdLocal) {
    const allParams = { ...params, ciudad: undefined, departamento: undefined };
    try {
      const allItems = await fetchAll(allParams);
      const newItems = allItems.filter(item => !items.some(existing => (existing as any).id === (item as any).id));
      items = [...items, ...newItems];
      if (process.env.NODE_ENV === "development") {
        console.log(`⚠️ ${type} nacional fallback para '${categoriaSlug}': +${newItems.length} (total: ${items.length})`);
      }
    } catch (e) {
      console.error(`Error en ${type} nacional para '${categoriaSlug}':`, e);
    }
  }

  // Ordena por DB (preserva backend; orden DESC + createdAt DESC)
  items.sort((a, b) => {
    const dataA = a as any;
    const dataB = b as any;
    const orderA = dataA.orden || 0;
    const orderB = dataB.orden || 0;
    if (orderB !== orderA) return orderB - orderA;
    return new Date(dataB.createdAt).getTime() - new Date(dataA.createdAt).getTime();
  });
  return items.slice(0, params.limit + 10);
}

// Fetch local para Products (categoría + ciudad/depto)
async function fetchProductsLocal(params: any): Promise<RawProduct[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    category: { slug: params.categoriaSlug },  // Filtro estricto por categoría del producto
    negocio: orLocation.length > 0 ? { OR: orLocation } : {},
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],  // Orden DB preservado
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsAll(params: any): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    category: { slug: params.categoriaSlug },  // Mantiene categoría, sin local
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch local para Publications (categoría del negocio + ciudad/depto)
async function fetchPublications(params: ExtendedParams): Promise<RawPublication[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    negocio: {
      ...(orLocation.length > 0 ? { OR: orLocation } : {}),
      categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro por categoría del negocio
    },
  };

  const localItems = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],  // Orden DB preservado
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // Fallback nacional si <5: Solo categoría del negocio
  if (localItems.length < 5) {
    const allWhere = {
      ...where,
      negocio: {
        categorias: { some: { category: { slug: params.categoriaSlug } } },  // Mantiene categoría
      },
    };
    const allItems = await prisma.publicacion.findMany({
      where: allWhere,
      select: publicationSelect,
      orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
      take: params.limit + 10,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
    });
    const combined = [...localItems, ...allItems.filter(item => !localItems.some(s => s.id === item.id))];
    if (process.env.NODE_ENV === "development") {
      console.log(`fetchPublications fallback para '${params.categoriaSlug}': +${allItems.length} (total: ${combined.length})`);
    }
    return combined.slice(0, params.limit + 10);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`fetchPublications local para '${params.categoriaSlug}': ${localItems.length} (userId: ${params.userId || 'anónimo'})`);
  }
  return localItems;
}

// Fetch local para Services (categoría del negocio + ciudad/depto; orderBy createdAt)
async function fetchServicesLocal(params: any): Promise<RawService[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      ...(orLocation.length > 0 ? { OR: orLocation } : {}),
      categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro por categoría del negocio
    },
  };
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Services where local para '${params.categoriaSlug}': ciudad=${params.ciudad}, depto=${params.departamento}, seen=${params.seenIds.length}`);
  }
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: { createdAt: "desc" },  // Fallback createdAt (agrega orden en schema futuro)
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesAll(params: any): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      categorias: { some: { category: { slug: params.categoriaSlug } } },  // Mantiene categoría
    },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch local para Businesses (categoría + ciudad/depto; orderBy createdAt)
async function fetchBusinessesLocal(params: any): Promise<RawBusiness[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    ...(orLocation.length > 0 ? { OR: orLocation } : {}),
    categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro estricto por categorías del negocio
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },  // Fallback createdAt
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesAll(params: any): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    categorias: { some: { category: { slug: params.categoriaSlug } } },  // Mantiene categoría
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

export async function getFeedDataByCategory(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams  // categoriaSlug requerido
): Promise<FeedResponse> {
  // Validación temprana de categoría (prisma.category.findUnique por slug)
  let category;
  try {
    category = await prisma.category.findUnique({
      where: { slug: params.categoriaSlug },
      select: { id: true, nombre: true, isActive: true },
    });
    if (!category || !category.isActive) {
      throw new Error(`Categoría '${params.categoriaSlug}' no encontrada o inactiva`);
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Validación categoría '${params.categoriaSlug}': ID ${category.id}, Nombre: ${category.nombre}, Activa: ${category.isActive}`);
    }
  } catch (error) {
    console.error(`❌ Error validando categoría ${params.categoriaSlug}:`, error);
    throw new Error(`Categoría '${params.categoriaSlug}' no encontrada o inactiva`);
  }

  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
    // Fetch por tipo con fallback (local + nacional si escaso; categoría fija)
    switch (type) {
      case "products":
        rawItems = await fetchWithFallback(fetchProductsLocal, fetchProductsAll, params, "products", params.categoriaSlug);
        break;
      case "publications":
        rawItems = await fetchPublications(params);
        break;
      case "services":
        rawItems = await fetchWithFallback(fetchServicesLocal, fetchServicesAll, params, "services", params.categoriaSlug);
        break;
      case "businesses":
        rawItems = await fetchWithFallback(fetchBusinessesLocal, fetchBusinessesAll, params, "businesses", params.categoriaSlug);
        break;
    }
  } catch (error) {
    console.error(`❌ Error fetching ${type} para '${params.categoriaSlug}':`, error);
    rawItems = []; // Resiliency
  }

  // Log seenIds filtrados para debug
  if (process.env.NODE_ENV === "development") {
    const filteredSeen = params.seenIds.filter(id => {
      switch (type) {
        case "products": return id.startsWith("product-");
        case "publications": return id.startsWith("pub-");
        case "services": return id.startsWith("serv-");
        case "businesses": return id.startsWith("bus-");
        default: return false;
      }
    }).length;
    console.log(`🔍 ${type} seenIds filtrados para '${params.categoriaSlug}': ${filteredSeen}/${params.seenIds.length}`);
  }

  // Batch para reacciones en publications (eficiente)
  let userReactionsMap: Record<string, { id: string; tipo: ReaccionTipo } | null> = {};
  if (type === "publications" && params.userId && rawItems.length > 0) {
    const pubIds = rawItems.filter(isRawPublication).map((pub) => pub.id);
    if (pubIds.length > 0) {
      const userReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: params.userId!,
          tipo: "REACCION",
          publicacionId: { in: pubIds },
        },
        select: {
          id: true,
          publicacionId: true,
          reaccionTipo: true,
        },
      });

      const isValidReactionType = (tipo: ReaccionTipo | null): tipo is ReaccionTipo => {
        if (tipo === null) return false;
        return ["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(tipo);
      };

      userReactionsMap = userReactions.reduce((map, reaction) => {
        if (isValidReactionType(reaction.reaccionTipo)) {
          map[reaction.publicacionId] = {
            id: reaction.id,
            tipo: reaction.reaccionTipo,
          };
        } else {
          if (process.env.NODE_ENV === "development") {
            console.warn(`⚠️ Reacción inválida para pub ${reaction.publicacionId}: tipo ${reaction.reaccionTipo ?? 'null'}`);
          }
          map[reaction.publicacionId] = null;
        }
        return map;
      }, {} as Record<string, { id: string; tipo: ReaccionTipo } | null>);

      pubIds.forEach((pubId) => {
        if (!userReactionsMap[pubId]) {
          userReactionsMap[pubId] = null;
        }
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`📊 Reacciones batch para '${params.categoriaSlug}': ${Object.keys(userReactionsMap).length}/${pubIds.length} pubs`);
      }
    }
  }

  // Mapeo simplificado (preserva orden DB; sin score/interleave)
  const items: FeedItem[] = rawItems.map((raw) => {
    const itemType = type.slice(0, -1) as "product" | "publication" | "service" | "business";
    let item: FeedItem;

    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      negocioId = raw.negocio?.id ?? "";
    } else {
      negocioId = raw.id;
    }

    if (isRawProduct(raw)) {
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      item = mapToFeedItem(raw, "publication");
      const enhancedData = item.data as EnhancedPublicacion;
      enhancedData.userReaction = userReactionsMap[raw.id] ?? null;
      enhancedData.createdAt = raw.createdAt.toISOString();
      enhancedData.comments = (raw.interacciones || []).map((inter: any) => ({
        id: inter.id,
        contenido: inter.contenido ?? "",
        createdAt: inter.createdAt.toISOString(),
        usuario: {
          id: inter.usuario.id,
          nombre: inter.usuario.nombre,
          apellido: inter.usuario.apellido ?? "",
          fotoPerfil: inter.usuario.fotoPerfil ?? undefined,
          username: inter.usuario.username ?? "",
        },
      }));
      enhancedData.isAuthenticated = !!params.userId;
    } else if (isRawService(raw)) {
      item = mapToFeedItem(raw, "service");
    } else if (isRawBusiness(raw)) {
      item = mapToFeedItem(raw, "business");
    } else {
      throw new Error(`Tipo raw no reconocido para ${type}`);
    }

    (item.data as any).negocioId = negocioId;
    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    
    return item;
  });

  const orderedItems = items;  // Preserva orden DB (sin interleave/score)

  nextCursor = rawItems.length >= params.limit ? rawItems[rawItems.length - 1].id : undefined;

  if (process.env.NODE_ENV === "development") {
    console.log(`✅ getFeedDataByCategory(${type}, '${params.categoriaSlug}'): Raw ${rawItems.length} -> Items ${orderedItems.length} (orden DB preservado, fallback si escaso)`);
  }

  return { items: orderedItems.slice(0, params.limit), nextCursor };
}