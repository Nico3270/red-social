// src/actions/feed/getFeedDataByCategory.ts
"use server";

import {
  buildPublishedBusinessRelationWhere,
  buildPublishedBusinessWhere,
} from "@/lib/business/business-visibility-policy";
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
import { extractSeenRawIds } from "../feed-ids";
import { rankRawItems } from "./feedRanking";

// === 1. FUNCIONES FETCH ===

function buildPublishedBusinessRelationWith(
  additionalWhere: Prisma.NegocioWhereInput,
): Prisma.NegocioScalarRelationFilter {
  return {
    is: {
      AND: [buildPublishedBusinessWhere(), additionalWhere],
    },
  };
}

function buildPublishedBusinessWith(
  additionalWhere: Prisma.NegocioWhereInput,
): Prisma.NegocioWhereInput {
  return {
    AND: [buildPublishedBusinessWhere(), additionalWhere],
  };
}

async function fetchProductsCity(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "products") },
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
    }),
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

async function fetchProductsDept(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "products") },
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
    }),
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

async function fetchProductsNational(params: ExtendedParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "products") },
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWhere(),
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

async function fetchServicesCity(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "services") },
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
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

async function fetchServicesDept(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "services") },
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
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

async function fetchServicesNational(params: ExtendedParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: extractSeenRawIds(params.seenIds, "services") },
    negocio: buildPublishedBusinessRelationWith({
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
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

async function fetchBusinessesCity(params: ExtendedParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: { notIn: extractSeenRawIds(params.seenIds, "businesses") },
    ciudad: params.ciudad,
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesDept(params: ExtendedParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: { notIn: extractSeenRawIds(params.seenIds, "businesses") },
    departamento: params.departamento,
    ciudad: { not: params.ciudad },
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesNational(params: ExtendedParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: { notIn: extractSeenRawIds(params.seenIds, "businesses") },
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsCity(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: extractSeenRawIds(params.seenIds, "publications") },
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsDept(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: extractSeenRawIds(params.seenIds, "publications") },
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsNational(params: ExtendedParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: extractSeenRawIds(params.seenIds, "publications") },
    negocio: buildPublishedBusinessRelationWith({
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// === 2. INTERFACES Y HELPERS ===

interface SortableItem {
  id: string;
  orden?: number;
  createdAt: Date;
}

interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;
  categoriaSlug: string;
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
    console.error(`Error en ${type} ciudad para '${params.categoriaSlug}':`, e);
  }

  if (remaining > 0 && params.departamento) {
    try {
      const deptItems = await fetchDept({ ...params, limit: remaining });
      items = [...items, ...sortGroup(deptItems)];
      remaining -= deptItems.length;
    } catch (e) {
      console.error(`Error en ${type} depto para '${params.categoriaSlug}':`, e);
    }
  }

  if (remaining > 0) {
    try {
      const nationalItems = await fetchNational({ ...params, limit: remaining });
      items = [...items, ...sortGroup(nationalItems)];
    } catch (e) {
      console.error(`Error en ${type} nacional para '${params.categoriaSlug}':`, e);
    }
  }

  const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values());
  return uniqueItems.slice(0, params.limit + buffer);
}

// === 3. getFeedDataByCategory ===
export async function getFeedDataByCategory(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");
  if (!params.categoriaSlug) throw new Error("categoriaSlug requerido para feed por categoría");

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
    console.error(`Error fetching ${type} para '${params.categoriaSlug}':`, error);
    rawItems = [];
  }
  const rankedRawItems = rankRawItems(rawItems, type, params);
  rawItems = rankedRawItems.map(({ item }) => item);

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
  const scoreMap = new Map(rankedRawItems.map(({ item, score }) => [item.id, score]));

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
    item.score = scoreMap.get(raw.id) ?? item.score;

    return item;
  });

  if (rawItems.length >= params.limit) {
    nextCursor = rawItems[rawItems.length - 1].id;
  }

  return { items: items.slice(0, params.limit), nextCursor };
}
