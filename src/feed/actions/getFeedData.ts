// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// Extiende params con userId opcional (string | null para manejar anónimos)
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;  // De session.user.id; null para anónimos
}

// Helper genérico para fallback gradual (reutilizable, eficiente con dedup)
async function fetchWithFallback<T>(
  fetchStrict: (params: any) => Promise<T[]>,
  fetchLocal: (params: any) => Promise<T[]>,
  fetchAll: (params: any) => Promise<T[]>,
  params: any,
  type: string,
  thresholdStrict: number = 10,
  thresholdLocal: number = 5
): Promise<T[]> {
  let items: T[] = [];

  // 1. Estricto: Prefs + secciones + local (ciudad/depto)
  try {
    items = await fetchStrict(params);
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 ${type} estricto: ${items.length} items (prefs: ${params.preferencias?.length || 0}, secciones: ${params.secciones?.length || 0}, cursor: ${params.cursor || 'initial'})`);
    }
  } catch (e) {
    console.error(`Error en ${type} estricto:`, e);
  }

  // 2. Si escaso, relaja a local (solo ciudad/depto, sin prefs/secciones)
  if (items.length < thresholdStrict) {
    const localParams = { ...params, preferencias: [], secciones: [] };
    try {
      const localItems = await fetchLocal(localParams);
      // Dedup por ID (evita duplicados entre niveles)
      const newItems = localItems.filter(item => !items.some(existing => (existing as any).id === (item as any).id));
      items = [...items, ...newItems];
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 ${type} local fallback: +${newItems.length} (total: ${items.length}, seen filtrados: ${localParams.seenIds?.length || 0})`);
      }
    } catch (e) {
      console.error(`Error en ${type} local:`, e);
    }
  }

  // 3. Si aún escaso, relaja a todo (nacional, sin filtros locales/prefs)
  if (items.length < thresholdLocal) {
    const allParams = { ...params, preferencias: [], secciones: [], ciudad: undefined, departamento: undefined };
    try {
      const allItems = await fetchAll(allParams);
      const newItems = allItems.filter(item => !items.some(existing => (existing as any).id === (item as any).id));
      items = [...items, ...newItems];
      if (process.env.NODE_ENV === "development") {
        console.log(`⚠️ ${type} nacional fallback: +${newItems.length} (total final: ${items.length})`);
      }
    } catch (e) {
      console.error(`Error en ${type} nacional:`, e);
    }
  }

  // Ordena final por DB (orden DESC + createdAt DESC) y aplica buffer
  items.sort((a, b) => {
    const orderA = (a as any).orden || 0;
    const orderB = (b as any).orden || 0;
    if (orderB !== orderA) return orderB - orderA;
    return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
  });
  return items.slice(0, params.limit + 10);
}

// Fetch functions para Products (strict/local/all)
async function fetchProductsStrict(params: any): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };
  if (params.preferencias?.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }
  if (params.secciones?.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsLocal(params: any): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
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

async function fetchProductsAll(params: any): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
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

// Fetch functions para Services
async function fetchServicesStrict(params: any): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };
  if (params.preferencias?.length > 0) {
    where.tags = { hasSome: params.preferencias };
  }
  if (params.secciones?.length > 0) {
    where.negocio!.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesLocal(params: any): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesAll(params: any): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch functions para Businesses
async function fetchBusinessesStrict(params: any): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
  };
  if (params.preferencias?.length > 0) {
    where.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }
  if (params.secciones?.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesLocal(params: any): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesAll(params: any): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch para Publications (con fallback simple si <5)
async function fetchPublications(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };
  if (params.preferencias?.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  const strictItems = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // Fallback si <5: Relaja a local (sin prefs)
  if (strictItems.length < 5) {
    const localWhere = {
      ...where,
      negocio: {
        OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
      },
    };
    const localItems = await prisma.publicacion.findMany({
      where: localWhere,
      select: publicationSelect,
      orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
      take: params.limit + 10,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
    });
    const combined = [...strictItems, ...localItems.filter(item => !strictItems.some(s => s.id === item.id))];
    if (process.env.NODE_ENV === "development") {
      console.log(`fetchPublications fallback: +${localItems.length} (total: ${combined.length})`);
    }
    return combined.slice(0, params.limit + 10);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("fetchPublications: Fetched:", strictItems.length, `con userId: ${params.userId || 'anónimo'}`);
  }
  return strictItems;
}

export async function getFeedDataByType(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
    // Fetch por tipo con fallbacks
    switch (type) {
      case "products":
        rawItems = await fetchWithFallback(fetchProductsStrict, fetchProductsLocal, fetchProductsAll, params, "products");
        break;
      case "publications":
        rawItems = await fetchPublications(params);
        break;
      case "services":
        rawItems = await fetchWithFallback(fetchServicesStrict, fetchServicesLocal, fetchServicesAll, params, "services");
        break;
      case "businesses":
        rawItems = await fetchWithFallback(fetchBusinessesStrict, fetchBusinessesLocal, fetchBusinessesAll, params, "businesses");
        break;
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    rawItems = []; // Resiliency
  }

  // Log seenIds filtrados para debug (solo dev)
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
    console.log(`🔍 ${type} seenIds filtrados: ${filteredSeen}/${params.seenIds.length} (total)`);
  }

  // Si aún escaso post-fetch, fallback global (sin prefs/secciones, pero mantén ciudad)
  if (rawItems.length < 3) {
    const relaxedParams = { ...params, preferencias: [], secciones: [] };
    try {
      switch (type) {
        case "products":
          rawItems = await fetchProductsLocal(relaxedParams);
          break;
        case "publications":
          rawItems = await fetchPublications(relaxedParams);
          break;
        case "services":
          rawItems = await fetchServicesLocal(relaxedParams);
          break;
        case "businesses":
          rawItems = await fetchBusinessesLocal(relaxedParams);
          break;
      }
      if (process.env.NODE_ENV === "development") {
        console.log(`⚠️ Fallback global activado para ${type}: ${rawItems.length} items (relajado prefs/secciones)`);
      }
    } catch (error) {
      console.error(`Error in fallback for ${type}:`, error);
    }
  }

  // Fetch batch de reacciones para publications si aplica
  let userReactionsMap: Record<string, { id: string; tipo: ReaccionTipo } | null> = {};
  if (type === "publications" && params.userId && rawItems.length > 0) {
    const pubIds = rawItems.filter(isRawPublication).map((pub) => pub.id);
    if (pubIds.length > 0) {
      const userReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: params.userId!,
          tipo: "REACCION",
          publicacionId: { in: pubIds },  // Batch eficiente
        },
        select: {
          id: true,
          publicacionId: true,
          reaccionTipo: true,
        },
      });

      // Type guard para reacción válida
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
            console.warn(`Reacción inválida para pub ${reaction.publicacionId}: tipo ${reaction.reaccionTipo ?? 'null'}`);
          }
          map[reaction.publicacionId] = null;
        }
        return map;
      }, {} as Record<string, { id: string; tipo: ReaccionTipo } | null>);

      // Defaults a null para pubs sin reacción
      pubIds.forEach((pubId) => {
        if (!userReactionsMap[pubId]) {
          userReactionsMap[pubId] = null;
        }
      });
    }
  }

  // Mapeo simplificado (sin score ni interleave: orden ya de DB)
  const items: FeedItem[] = rawItems.map((raw) => {
    const itemType = type.slice(0, -1) as "product" | "publication" | "service" | "business";
    let item: FeedItem;

    if (isRawProduct(raw)) {
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      item = mapToFeedItem(raw, "publication");
      // Personaliza userReaction (de batch o null)
      const enhancedData = item.data as EnhancedPublicacion;
      enhancedData.userReaction = userReactionsMap[raw.id] ?? null;
      // Formatea createdAt y comments a strings ISO
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
      // isAuthenticated: Basado en userId (para UX en frontend)
      enhancedData.isAuthenticated = !!params.userId;
    } else if (isRawService(raw)) {
      item = mapToFeedItem(raw, "service");
    } else if (isRawBusiness(raw)) {
      item = mapToFeedItem(raw, "business");
    } else {
      throw new Error(`Tipo raw no reconocido para ${type}`);
    }

    // isFollowed: Lógica unificada
    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      negocioId = raw.negocio?.id ?? "";
    } else { // RawBusiness
      negocioId = raw.id;
    }
    // Set negocioId en data para facilitar frontend (si needed)
    (item.data as any).negocioId = negocioId;

    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    
    return item;
  });

  // Usa items directamente (ordenados por fetch)
  const orderedItems = items;

  // nextCursor conservador pero generoso post-fallback
  nextCursor = rawItems.length >= params.limit ? rawItems[rawItems.length - 1].id : undefined;

  // Logs dev simplificados
  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Fetched ${rawItems.length} raw (con fallbacks) -> Returned ${orderedItems.length} (orden por DB)`);
    if (type === "publications" && params.userId) {
      console.log(`User reactions fetched for userId ${params.userId}: ${Object.keys(userReactionsMap).length} pubs con reacción`);
    }
  }

  return { items: orderedItems.slice(0, params.limit), nextCursor };
}