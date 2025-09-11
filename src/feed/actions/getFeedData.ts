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

// Helper simplificado para fallback (local primero, nacional si escaso; sin prefs)
async function fetchWithFallback<T>(
  fetchLocal: (params: any) => Promise<T[]>,
  fetchAll: (params: any) => Promise<T[]>,
  params: any,
  type: string,
  thresholdLocal: number = 5
): Promise<T[]> {
  let items: T[] = [];

  // 1. Local: Solo ciudad/depto + seen filter
  try {
    items = await fetchLocal(params);
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 ${type} local: ${items.length} items (ciudad: ${params.ciudad}, depto: ${params.departamento}, cursor: ${params.cursor || 'initial'})`);
    }
  } catch (e) {
    console.error(`Error en ${type} local:`, e);
  }

  // 2. Si escaso, fallback nacional (sin ciudad/depto)
  if (items.length < thresholdLocal) {
    const allParams = { ...params, ciudad: undefined, departamento: undefined };
    try {
      const allItems = await fetchAll(allParams);
      // Dedup por ID
      const newItems = allItems.filter(item => !items.some(existing => (existing as any).id === (item as any).id));
      items = [...items, ...newItems];
      if (process.env.NODE_ENV === "development") {
        console.log(`⚠️ ${type} nacional fallback: +${newItems.length} (total: ${items.length}, seen: ${allParams.seenIds?.length || 0})`);
      }
    } catch (e) {
      console.error(`Error en ${type} nacional:`, e);
    }
  }

  // Ordena por DB (orden si existe, sino createdAt DESC) y buffer
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

// Fetch local para Products (solo ciudad/depto)
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

// Fetch local para Services (solo ciudad/depto; orderBy createdAt ya que no tiene orden en schema)
async function fetchServicesLocal(params: any): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Services where debug: ciudad=${params.ciudad}, depto=${params.departamento}, seen=${params.seenIds.length}`);
  }
  
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }], // Solo createdAt (no orden en schema)
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
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }], // Solo createdAt (no orden en schema)
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch local para Businesses (solo ciudad/depto; orderBy createdAt)
async function fetchBusinessesLocal(params: any): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },  // Solo createdAt (no orden en schema)
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
    orderBy: { createdAt: "desc" },
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch para Publications (solo ciudad/depto, sin prefs; fallback si <5)
async function fetchPublications(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  const localItems = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit + 10,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // Fallback nacional si <5
  if (localItems.length < 5) {
    const allWhere = {
      ...where,
      negocio: undefined,  // Sin filtro local
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
      console.log(`fetchPublications fallback: +${allItems.length} (total: ${combined.length})`);
    }
    return combined.slice(0, params.limit + 10);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("fetchPublications: Fetched local:", localItems.length, `con userId: ${params.userId || 'anónimo'}`);
  }
  return localItems;
}

export async function getFeedDataByType(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;
  if (process.env.NODE_ENV === "development") {
  console.log(`▶️ getFeedDataByType(${type})`, {
    ciudad: params.ciudad,
    depto: params.departamento,
    cursor: params.cursor,
    limit: params.limit,
    seen: params.seenIds?.length,
    userId: params.userId || "anon",
    followed: params.followedBusinessIds?.length
  });
}

  try {
    console.log(`🟢 Antes de switch, type=${type}, rawItems.len=${rawItems.length}`);

    // Fetch por tipo (local + fallback nacional si escaso)
    switch (type) {
      case "products":
        rawItems = await fetchWithFallback(fetchProductsLocal, fetchProductsAll, params, "products");
        break;
      case "publications":
        rawItems = await fetchPublications(params);
        break;
      case "services":
        rawItems = await fetchWithFallback(fetchServicesLocal, fetchServicesAll, params, "services");
        console.log({ rawItems }, "Servicios");
        break;
      case "businesses":
        rawItems = await fetchWithFallback(fetchBusinessesLocal, fetchBusinessesAll, params, "businesses");
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

  // Fetch batch de reacciones para publications si aplica
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
            console.warn(`Reacción inválida para pub ${reaction.publicacionId}: tipo ${reaction.reaccionTipo ?? 'null'}`);
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
    }
  }

  // Mapeo simplificado (orden ya de DB)
  const items: FeedItem[] = rawItems.map((raw) => {
    const itemType = type.slice(0, -1) as "product" | "publication" | "service" | "business";
    let item: FeedItem;
    console.log(`📦 Raw ${type} item antes de map:`, raw.id, raw);

console.log(`🔎 Detectando tipo de raw con keys:`, Object.keys(raw));

    if (isRawProduct(raw)) {
      console.log("🛒 mapToFeedItem con PRODUCT", raw.id);
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      console.log("📰 mapToFeedItem con PUBLICATION", raw.id);
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
      console.log("🛠️ mapToFeedItem con SERVICE", raw.id);
      item = mapToFeedItem(raw, "service");
      console.log("✅ Item mapeado SERVICE:", item);
    } else if (isRawBusiness(raw)) {
      item = mapToFeedItem(raw, "business");
    } else {
      throw new Error(`Tipo raw no reconocido para ${type}`);
    }

    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      console.log("🔗 Negocio asociado al item", raw.id, "→ negocioId:", raw.negocio?.id);
      negocioId = raw.negocio?.id ?? "";
    } else {
      console.log("🏢 Item es BUSINESS directo", raw.id);
      negocioId = raw.id;
    }
    (item.data as any).negocioId = negocioId;
    console.log("🔗 negocioId asignado:", negocioId, "isFollowed:", item.isFollowed);


    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;

    return item;
  });

  const orderedItems = items;  // Orden de DB preservado

  nextCursor = rawItems.length >= params.limit ? rawItems[rawItems.length - 1].id : undefined;

  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Fetched ${rawItems.length} raw (local + fallback) -> ${orderedItems.length} items (orden DB)`);
    if (type === "publications" && params.userId) {
      console.log(`User reactions: ${Object.keys(userReactionsMap).length} pubs`);
    }
    console.log("📊 orderedItems detalle:", orderedItems.map(i => ({
  id: i.id,
  type: i.type,
  negocioId: (i.data as any).negocioId,
  isFollowed: i.isFollowed
})));
  }

  return { items: orderedItems.slice(0, params.limit), nextCursor };
}