// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { calculateScore } from "./helpers"; // Quité diversifyItems, ya no se necesita aquí
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces"; // Importa guards del contexto
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// CAMBIO: Extiende params con userId opcional (string | null para manejar anónimos)
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;  // De session.user.id; null para anónimos
}

export async function getFeedDataByType(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams  // Usa extended para userId
): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
    // Fetch por tipo (sin cambios en switch)
    switch (type) {
      case "products":
        rawItems = await fetchProducts(params);
        break;
      case "publications":
        rawItems = await fetchPublications(params);  // Pasa userId para condicional
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
    rawItems = []; // Resiliency
  }

  // Fallback si escaso (CAMBIO: Pasa userId en relaxedParams para consistencia)
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

  // CAMBIO: Si type=publications y userId, fetch batch de reacciones personalizadas (eficiente, como en referencia)
  let userReactionsMap: Record<string, { id: string; tipo: ReaccionTipo } | null> = {};
  if (type === "publications" && params.userId && rawItems.length > 0) {
    const pubIds = rawItems.filter(isRawPublication).map((pub) => pub.id);
    if (pubIds.length > 0) {
      const userReactions = await prisma.interaccion.findMany({
        where: {
          usuarioId: params.userId!,
          tipo: "REACCION",
          publicacionId: { in: pubIds },  // Batch: Una query para todas pubs
        },
        select: {
          id: true,
          publicacionId: true,
          reaccionTipo: true,
        },
      });

      // Type guard para reacción válida (como en referencia)
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

  // Mapeo con scoring/isFollowed (CAMBIO: Para publications, setea userReaction del batch y formatea comments)
  const items: FeedItem[] = rawItems.map((raw) => {
    const itemType = type.slice(0, -1) as "product" | "publication" | "service" | "business";
    let item: FeedItem;

    if (isRawProduct(raw)) {
      item = mapToFeedItem(raw, "product");
    } else if (isRawPublication(raw)) {
      item = mapToFeedItem(raw, "publication");
      // CAMBIO: Personaliza userReaction (de batch o null)
      const enhancedData = item.data as EnhancedPublicacion;  // Asume mapToFeedItem retorna EnhancedPublicacion
      enhancedData.userReaction = userReactionsMap[raw.id] ?? null;
      // CAMBIO: Formatea createdAt y comments (de interacciones) a strings ISO
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

    // isFollowed: Lógica unificada (sin cambios)
    let negocioId: string;
    if (isRawProduct(raw) || isRawPublication(raw) || isRawService(raw)) {
      negocioId = raw.negocio?.id ?? "";
    } else { // RawBusiness
      negocioId = raw.id;
    }
    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });

  // Orden por score (sin cambios)
  items.sort((a, b) => b.score - a.score);

  // Next cursor (sin cambios)
  nextCursor = rawItems.length > 0 ? rawItems[rawItems.length - 1].id : undefined;

  // Logs dev mejorados (CAMBIO: Incluye userId y reacciones count)
  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Fetched ${rawItems.length} items`);
    if (type === "publications" && params.userId) {
      console.log(`User reactions fetched for userId ${params.userId}: ${Object.keys(userReactionsMap).length} pubs con reacción`);
    }
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

async function fetchPublications(params: ExtendedParams): Promise<RawPublication[]> {
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
    orderBy: [{ numLikes: "desc" }, { createdAt: "desc" }],  // Hot first (likes), then recent
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  if (process.env.NODE_ENV === "development") {
    console.log("fetchPublications: Fetched:", publicaciones.length, `con userId: ${params.userId || 'anónimo'}`);
    console.log(
      "Details sample:",
      publicaciones.slice(0, 1).map((pub) => ({
        id: pub.id,
        tipo: pub.tipo,
        interaccionesCount: pub.interacciones?.length || 0,  // Verifica comentarios
        numLikes: pub.numLikes,
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