// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { Prisma, ReaccionTipo } from "@prisma/client";
import {
  productSelect,
  publicationSelect,
  serviceSelect,
  businessSelect,
  RawProduct,
  RawPublication,
  RawService,
  RawBusiness,
} from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// === 1. FUNCIONES FETCH (orden correcto) ===

async function fetchPublicationsCity(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    negocio: { ciudad: params.ciudad },
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsDept(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
    negocio: { departamento: params.departamento, ciudad: { not: params.ciudad } },
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsNational(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("pub-")) },
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsCity(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: { ciudad: params.ciudad },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsDept(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
    negocio: { departamento: params.departamento, ciudad: { not: params.ciudad } },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsNational(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("product-")) },
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesCity(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: { ciudad: params.ciudad },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesDept(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
    negocio: { departamento: params.departamento, ciudad: { not: params.ciudad } },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesNational(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("serv-")) },
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesCity(params: ExtendedParams): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id: string) => id.startsWith("bus-")) },
    ciudad: params.ciudad,
  };
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

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

// === 2. INTERFACES Y HELPERS ===

interface SortableItem {
  orden?: number;
  createdAt: Date;
}

interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;
  userLat?: number | null;
  userLong?: number | null;
}

const sortGroup = <T extends SortableItem>(items: T[]): T[] => {
  return items.sort((a, b) => {
    const orderA = a.orden ?? 0;
    const orderB = b.orden ?? 0;
    if (orderB !== orderA) return orderB - orderA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

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

  try {
    const cityItems = await fetchCity({ ...params, limit: remaining });
    items = [...items, ...sortGroup(cityItems)];
    remaining -= cityItems.length;
  } catch (e) {
    console.error(`Error en ${type} ciudad:`, e);
  }

  if (remaining > 0 && params.departamento) {
    try {
      const deptItems = await fetchDept({ ...params, limit: remaining });
      items = [...items, ...sortGroup(deptItems)];
      remaining -= deptItems.length;
    } catch (e) {
      console.error(`Error en ${type} depto:`, e);
    }
  }

  if (remaining > 0) {
    try {
      const nationalItems = await fetchNational({ ...params, limit: remaining });
      items = [...items, ...sortGroup(nationalItems)];
    } catch (e) {
      console.error(`Error en ${type} nacional:`, e);
    }
  }

  return items.slice(0, params.limit + buffer);
}

// === 3. Haversine ===
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// === 4. getFeedDataByType ===
export async function getFeedDataByType(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
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
        break;
      case "businesses":
        rawItems = await fetchWithPriority<RawBusiness>(fetchBusinessesCity, fetchBusinessesDept, fetchBusinessesNational, params, "businesses");
        break;
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    rawItems = [];
  }

  // === SORTING POR DISTANCIA ===
  if (params.userLat != null && params.userLong != null) {
    const itemsWithDistance = rawItems
      .map((item) => {
        let negocioLat: number | null = null;
        let negocioLong: number | null = null;

        if ("negocio" in item && item.negocio) {
          negocioLat = item.negocio.latitud ?? null;
          negocioLong = item.negocio.longitud ?? null;
        } else if ("latitud" in item && "longitud" in item) {
          const business = item as RawBusiness;
          negocioLat = business.latitud ?? null;
          negocioLong = business.longitud ?? null;
        }

        if (negocioLat != null && negocioLong != null) {
          const distance = haversine(params.userLat!, params.userLong!, negocioLat, negocioLong);
          return { item, distance };
        }
        return { item, distance: Infinity };
      })
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        const orderA = (a.item as SortableItem).orden ?? 0;
        const orderB = (b.item as SortableItem).orden ?? 0;
        if (orderB !== orderA) return orderB - orderA;
        return new Date((b.item as SortableItem).createdAt).getTime() - new Date((a.item as SortableItem).createdAt).getTime();
      })
      .map(({ item }) => item);

    rawItems = itemsWithDistance;
  }

  // === Reacciones ===
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
        select: { id: true, publicacionId: true, reaccionTipo: true },
      });

      const isValidReactionType = (tipo: ReaccionTipo | null): tipo is ReaccionTipo =>
        tipo !== null && ["LIKE", "LOVE", "WOW", "SAD", "ANGRY"].includes(tipo);

      userReactionsMap = userReactions.reduce((map, reaction) => {
        if (isValidReactionType(reaction.reaccionTipo)) {
          map[reaction.publicacionId] = { id: reaction.id, tipo: reaction.reaccionTipo };
        } else {
          map[reaction.publicacionId] = null;
        }
        return map;
      }, {} as Record<string, { id: string; tipo: ReaccionTipo } | null>);

      pubIds.forEach((pubId) => {
        if (!userReactionsMap[pubId]) userReactionsMap[pubId] = null;
      });
    }
  }

  // === Mapeo final ===
  const items: FeedItem[] = rawItems.map((raw) => {
    let item: FeedItem;
    if (isRawProduct(raw)) {
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
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
      item = mapToFeedItem(raw, "service");
    } else if (isRawBusiness(raw)) {
      item = mapToFeedItem(raw, "business");
    } else {
      throw new Error(`Tipo raw no reconocido para ${type}`);
    }

    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      negocioId = raw.negocio?.id ?? "";
    } else {
      negocioId = raw.id;
    }
    (item.data as { negocioId?: string }).negocioId = negocioId;
    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;

    return item;
  });

  if (rawItems.length >= params.limit) {
    nextCursor = rawItems[rawItems.length - 1].id;
  }

  return { items: items.slice(0, params.limit), nextCursor };
}