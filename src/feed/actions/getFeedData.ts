// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// Interfaz base para items sortable (todos raw tienen createdAt, orden opcional)
interface SortableItem {
  orden?: number;
  createdAt: Date;
}

// Extiende params con userId opcional (string | null para manejar anónimos)
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;  // De session.user.id; null para anónimos
}

// Helper para ordenar grupo internamente (por orden DESC + createdAt DESC)
const sortGroup = <T extends SortableItem>(items: T[]): T[] => {
  return items.sort((a, b) => {
    const orderA = a.orden || 0;
    const orderB = b.orden || 0;
    if (orderB !== orderA) return orderB - orderA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// Fetch priorizado: Ciudad > Departamento (excluyendo ciudad) > Nacional
async function fetchWithPriority<T extends SortableItem>(
  fetchCity: (params: ExtendedParams) => Promise<T[]>,
  fetchDept: (params: ExtendedParams) => Promise<T[]>,
  fetchNational: (params: ExtendedParams) => Promise<T[]>,
  params: ExtendedParams,
  type: string,
  buffer: number = 10
): Promise<T[]> {
  const limitWithBuffer = params.limit + buffer;
  let items: T[] = [];
  let remaining = limitWithBuffer;

  // 1. Ciudad estricta
  try {
    const cityItems = await fetchCity({ ...params, limit: remaining });
    items = [...items, ...sortGroup(cityItems)];
    remaining -= cityItems.length;
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 ${type} ciudad: ${cityItems.length} items (ciudad: ${params.ciudad})`);
    }
  } catch (e) {
    console.error(`Error en ${type} ciudad:`, e);
  }

  // 2. Departamento (excluyendo ciudad) si no completo
  if (remaining > 0 && params.departamento) {
    try {
      const deptItems = await fetchDept({ ...params, limit: remaining });
      items = [...items, ...sortGroup(deptItems)];
      remaining -= deptItems.length;
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 ${type} depto excluyendo ciudad: +${deptItems.length} (depto: ${params.departamento})`);
      }
    } catch (e) {
      console.error(`Error en ${type} depto:`, e);
    }
  }

  // 3. Nacional si aún no completo
  if (remaining > 0) {
    try {
      const nationalItems = await fetchNational({ ...params, limit: remaining });
      items = [...items, ...sortGroup(nationalItems)];
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 ${type} nacional: +${nationalItems.length}`);
      }
    } catch (e) {
      console.error(`Error en ${type} nacional:`, e);
    }
  }

  return items.slice(0, params.limit + buffer);
}

// Fetch para Products - Ciudad
async function fetchProductsCity(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: { ciudad: params.ciudad },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch para Products - Depto excluyendo ciudad
async function fetchProductsDept(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: {
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
    },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Fetch para Products - Nacional
async function fetchProductsNational(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Similar para Services - Ciudad
async function fetchServicesCity(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: { ciudad: params.ciudad },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Services - Depto excluyendo ciudad
async function fetchServicesDept(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: {
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
    },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Services - Nacional
async function fetchServicesNational(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Businesses - Ciudad
async function fetchBusinessesCity(params: ExtendedParams): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    ciudad: params.ciudad,
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Businesses - Depto excluyendo ciudad
async function fetchBusinessesDept(params: ExtendedParams): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    departamento: params.departamento,
    ciudad: { not: params.ciudad },
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// Businesses - Nacional
async function fetchBusinessesNational(params: ExtendedParams): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}


async function fetchPublicationsCity(params: ExtendedParams): Promise<RawPublication[]> {
  return prisma.publicacion.findMany({
    where: {
      tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
      visibilidad: "PUBLICA",
      id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
      negocio: { ciudad: params.ciudad },
    },
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsDept(params: ExtendedParams): Promise<RawPublication[]> {
  return prisma.publicacion.findMany({
    where: {
      tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
      visibilidad: "PUBLICA",
      id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
      negocio: { departamento: params.departamento, ciudad: { not: params.ciudad } },
    },
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsNational(params: ExtendedParams): Promise<RawPublication[]> {
  return prisma.publicacion.findMany({
    where: {
      tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
      visibilidad: "PUBLICA",
      id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    },
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
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
    // Fetch priorizado por geo-nivel
    switch (type) {
      case "products":
        rawItems = await fetchWithPriority<RawProduct>(fetchProductsCity, fetchProductsDept, fetchProductsNational, params, "products");
        break;
        case "publications":
          rawItems = await fetchWithPriority<RawPublication>(
            fetchPublicationsCity,
            fetchPublicationsDept,
            fetchPublicationsNational,
            params,
            "publications"
          );
          break;
      case "services":
        rawItems = await fetchWithPriority<RawService>(fetchServicesCity, fetchServicesDept, fetchServicesNational, params, "services");
        console.log({ rawItems }, "Servicios");
        break;
      case "businesses":
        rawItems = await fetchWithPriority<RawBusiness>(fetchBusinessesCity, fetchBusinessesDept, fetchBusinessesNational, params, "businesses");
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

  // Mapeo simplificado (orden ya por grupos + interno)
  const items: FeedItem[] = rawItems.map((raw) => {
    let item: FeedItem;
    console.log(`📦 Raw ${type} item antes de map:`, raw.id, raw);

    console.log(`🔎 Detectando tipo de raw con keys:`, Object.keys(raw));

    if (isRawProduct(raw)) {
      // console.log("🛒 mapToFeedItem con PRODUCT", raw.id);
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      // console.log("📰 mapToFeedItem con PUBLICATION", raw.id);
      item = mapToFeedItem(raw, "publication");
      const enhancedData = item.data as EnhancedPublicacion;
      enhancedData.userReaction = userReactionsMap[raw.id] ?? null;
      enhancedData.createdAt = raw.createdAt.toISOString();
      enhancedData.comments = (raw.interacciones || []).map((inter) => ({
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
      // console.log("🛠️ mapToFeedItem con SERVICE", raw.id);
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
    (item.data as { negocioId?: string }).negocioId = negocioId;
    console.log("🔗 negocioId asignado:", negocioId, "isFollowed:", item.isFollowed);


    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;

    return item;
  });

  const orderedItems = items;  // Orden ya priorizado por geo + grupo interno

 if (rawItems.length >= params.limit) {
  nextCursor = rawItems[rawItems.length - 1].id;
}

  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Fetched ${rawItems.length} raw (ciudad > depto > nacional) -> ${orderedItems.length} items`);
    if (type === "publications" && params.userId) {
      console.log(`User reactions: ${Object.keys(userReactionsMap).length} pubs`);
    }
//     console.log("📊 orderedItems detalle:", orderedItems.map(i => ({
//   id: i.id,
//   type: i.type,
//   negocioId: (i.data as { negocioId?: string }).negocioId,
//   isFollowed: i.isFollowed
// })));
  }

  return { items: orderedItems.slice(0, params.limit), nextCursor };
}