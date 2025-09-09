// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { calculateScore } from "./helpers"; // Quité diversifyItems, ya no se necesita aquí
import { Prisma } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces"; // Importa guards del contexto

export async function getFeedDataByType(
  type: "products" | "publications" | "services" | "businesses",
  params: FeedQueryParams & { cursor?: string } // Cursor simplificado a string (último ID del tipo)
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
    // Fetch por tipo
    switch (type) {
      case "products":
        rawItems = await fetchProducts(params);
        break;
      case "publications":
        rawItems = await fetchPublications(params);
        break;
      case "services":
        rawItems = await fetchServices(params);
        break;
      case "businesses":
        rawItems = await fetchBusinesses(params);
        break;
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    rawItems = []; // Resiliency: retorno vacío en error
  }

  // Fallback si escaso: Relajar preferencias/secciones y re-fetch solo ese tipo
  if (rawItems.length < 3) {
    const relaxedParams = { ...params, preferencias: [], secciones: [] };
    try {
      rawItems =
        type === "products"
          ? await fetchProducts(relaxedParams)
          : type === "publications"
          ? await fetchPublications(relaxedParams)
          : type === "services"
          ? await fetchServices(relaxedParams)
          : await fetchBusinesses(relaxedParams);
    } catch (error) {
      console.error(`Error in fallback for ${type}:`, error);
    }
  }

  // Mapeo con scoring/isFollowed (usando guards para narrow y evitar sobrecarga errors)
  const items: FeedItem[] = rawItems.map((raw) => {
    const itemType = type.slice(0, -1) as "product" | "publication" | "service" | "business";
    let item: FeedItem;

    if (isRawProduct(raw)) {
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      item = mapToFeedItem(raw, "publication");
    } else if (isRawService(raw)) {
      item = mapToFeedItem(raw, "service");
    } else if (isRawBusiness(raw)) {
      item = mapToFeedItem(raw, "business");
    } else {
      throw new Error(`Tipo raw no reconocido para ${type}`);
    }

    // isFollowed: Lógica unificada con guards
    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      negocioId = raw.negocio?.id ?? ""; // Fallback vacío si null (boost safety)
    } else { // RawBusiness
      negocioId = raw.id;
    }
    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });

  // Orden por score descendente (eficiente post-mapeo)
  items.sort((a, b) => b.score - a.score);

  // Next cursor simple
  nextCursor = rawItems.length > 0 ? rawItems[rawItems.length - 1].id : undefined;

  // Logs totals dev
  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Totals - Fetched: ${rawItems.length}`);
  }

  return { items: items.slice(0, params.limit), nextCursor };
}

async function fetchProducts(params: FeedQueryParams & { cursor?: string }): Promise<RawProduct[]> {
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("product-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  if (params.preferencias.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  if (params.secciones.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }

  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5, // Buffer controlado
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });
}

async function fetchPublications(params: FeedQueryParams & { cursor?: string }): Promise<RawPublication[]> {
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("pub-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  if (params.preferencias.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  const publicaciones = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ numLikes: "desc" }, { createdAt: "desc" }],
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("fetchPublications: Fetched:", publicaciones.length);
    console.log(
      "Details:",
      publicaciones.map((pub) => ({
        id: pub.id,
        tipo: pub.tipo,
        visibilidad: pub.visibilidad,
        createdAt: pub.createdAt.toISOString(),
        multimedia: pub.multimedia.map((m) => m.url),
      }))
    );
  }

  return publicaciones;
}

async function fetchServices(params: FeedQueryParams & { cursor?: string }): Promise<RawService[]> {
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("serv-")) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  if (params.preferencias.length > 0) {
    where.tags = { hasSome: params.preferencias };
  }

  if (params.secciones.length > 0) {
    where.negocio!.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }

  const services = await prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("fetchServices: Fetched servicios:", services.length);
    console.log(
      "Details:",
      services.map((serv) => ({
        id: serv.id,
        status: serv.status,
        createdAt: serv.createdAt.toISOString(),
        multimedia: serv.multimedia.map((m) => m.url),
      }))
    );
  }

  return services;
}

async function fetchBusinesses(params: FeedQueryParams & { cursor?: string }): Promise<RawBusiness[]> {
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("bus-")) },
    OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
  };

  if (params.preferencias.length > 0) {
    where.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  if (params.secciones.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }

  const businesses = await prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("fetchBusinesses: Fetched negocios:", businesses.length);
    console.log(
      "Details:",
      businesses.map((bus) => ({
        id: bus.id,
        estado: bus.estado,
        createdAt: bus.createdAt.toISOString(),
        categorias: bus.categorias.map((c) => c.category.slug),
      }))
    );
  }

  return businesses;
}