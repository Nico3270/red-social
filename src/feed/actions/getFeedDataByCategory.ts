// src/actions/feed/getFeedDataByCategory.ts
"use server";

import {
  buildPublishedBusinessWhere,
} from "@/lib/business/business-visibility-policy";
import prisma from "@/lib/prisma";
import { FeedResponse, FeedItem } from "../feed.interfaces";
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
  RawData,
} from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { getLocationTier } from "../geography";
import { getGeographicPage, feedIdWhere, nationalLocationWhere, type FeedPageParams, type FeedFetchers } from "./feedPage";
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

async function fetchProductsCity(params: FeedPageParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "products"),
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
    }),
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsDept(params: FeedPageParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "products"),
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
    }),
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchProductsNational(params: FeedPageParams): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "products"),
    category: { slug: params.categoriaSlug },
    negocio: buildPublishedBusinessRelationWith(nationalLocationWhere(params)),
  };
  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesCity(params: FeedPageParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "services"),
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesDept(params: FeedPageParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "services"),
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchServicesNational(params: FeedPageParams): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: feedIdWhere(params, "services"),
    negocio: buildPublishedBusinessRelationWith({
      ...nationalLocationWhere(params),
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesCity(params: FeedPageParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: feedIdWhere(params, "businesses"),
    ciudad: params.ciudad,
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesDept(params: FeedPageParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: feedIdWhere(params, "businesses"),
    departamento: params.departamento,
    ciudad: { not: params.ciudad },
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchBusinessesNational(params: FeedPageParams): Promise<RawBusiness[]> {
  const where = buildPublishedBusinessWith({
    id: feedIdWhere(params, "businesses"),
    ...nationalLocationWhere(params),
    categorias: { some: { category: { slug: params.categoriaSlug } } },
  });
  return prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsCity(params: FeedPageParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: feedIdWhere(params, "publications"),
    negocio: buildPublishedBusinessRelationWith({
      ciudad: params.ciudad,
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsDept(params: FeedPageParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: feedIdWhere(params, "publications"),
    negocio: buildPublishedBusinessRelationWith({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublicationsNational(params: FeedPageParams): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: feedIdWhere(params, "publications"),
    negocio: buildPublishedBusinessRelationWith({
      ...nationalLocationWhere(params),
      categorias: { some: { category: { slug: params.categoriaSlug } } },
    }),
  };
  return prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    take: params.limit,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

// === 2. INTERFACES Y HELPERS ===

// === 3. getFeedDataByCategory ===
export async function getFeedDataByCategory(
  type: "products" | "publications" | "services" | "businesses",
  params: FeedPageParams
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");
  if (!params.categoriaSlug) throw new Error("categoriaSlug requerido para feed por categoría");

  const fetchers = {
    products: [fetchProductsCity, fetchProductsDept, fetchProductsNational],
    publications: [fetchPublicationsCity, fetchPublicationsDept, fetchPublicationsNational],
    services: [fetchServicesCity, fetchServicesDept, fetchServicesNational],
    businesses: [fetchBusinessesCity, fetchBusinessesDept, fetchBusinessesNational],
  } satisfies Record<string, FeedFetchers<RawData>>;
  const { rankedItems: rankedRawItems, nextCursor, nextTier } = await getGeographicPage<RawData>(
    type, params, fetchers[type], items => rankRawItems(items, type, params),
  );
  const rawItems = rankedRawItems.map(({ item }) => item);

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
    item.locationTier = getLocationTier(isRawBusiness(raw) ? raw : raw.negocio ?? {}, params);
    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    item.score = scoreMap.get(raw.id) ?? item.score;

    return item;
  });

  return { items, nextCursor, nextTier };
}
