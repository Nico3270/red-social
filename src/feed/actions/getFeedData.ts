// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { calculateScore } from "./helpers";
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// CAMBIO: Extiende params con userId opcional (string | null para manejar anónimos)
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;  // De session.user.id; null para anónimos
}

// INTEGR: Función interleave refinada (de getFeedDataByCategory): Boost equidad para smalls + round-robin progresivo (sin truncar, full batch)
function interleaveItemsByBusiness(items: FeedItem[], limit: number): FeedItem[] {
  if (items.length === 0) return []; // OPTIM: Early return para casos vacíos (resiliencia)

  if (items.length <= 1) return items;

  // Paso 1: Agrupar por negocioId (todos items, no truncar)
  const groups = new Map<string, FeedItem[]>();
  const originalSizes = new Map<string, number>(); // Track original size para ratios
  for (const item of items) {
    const negocioId = (item.data as any).negocioId || (item.type === "business" ? item.data.id : "");
    if (!negocioId) {
      console.warn(`⚠️ Item sin negocioId: ${item.type}-${item.id}, agregado sin grupo`);
      continue;
    }
    if (!groups.has(negocioId)) {
      groups.set(negocioId, []);
      originalSizes.set(negocioId, 0);
    }
    groups.get(negocioId)!.push(item);
    originalSizes.set(negocioId, groups.get(negocioId)!.length);
  }

  const numBiz = groups.size;
  if (numBiz <= 1) return items; // Fallback sort si no variedad
  if (numBiz < 3) {
    const sorted = items.sort((a, b) => b.score - a.score); // OPTIM: Asigna a var para log
    if (process.env.NODE_ENV === "development") {
      console.log(`🌀 Interleave fallback sort por score (pocos biz: ${numBiz})`);
    }
    return sorted;
  }

  // Paso 2: Ordenar cada grupo por score desc (tops primero, full)
  for (const group of groups.values()) {
    group.sort((a, b) => b.score - a.score);
  }

  // Paso 3: BizList con boost equidad (smalls first: equity = topScore * (1 + 1/size) + bonus si small)
  const bizList = Array.from(groups.keys()).sort((a, b) => {
    const groupA = groups.get(a)!;
    const groupB = groups.get(b)!;
    const sizeA = originalSizes.get(a)!;
    const sizeB = originalSizes.get(b)!;
    const topScoreA = groupA[0]?.score || 0;
    const topScoreB = groupB[0]?.score || 0;
    const equityA = topScoreA * (1 + (1 / sizeA)) + (sizeA <= 2 ? 0.5 : 0); // Boost strong para smalls (<=2 items)
    const equityB = topScoreB * (1 + (1 / sizeB)) + (sizeB <= 2 ? 0.5 : 0);
    return equityB - equityA; // Desc: High equity first (smalls boosted)
  });

  // Paso 4: Round-robin progresivo (rota queue, prioriza under-represented por ratio shown/original)
  const mixed: FeedItem[] = [];
  const shownCounts = new Map<string, number>(); // Track shown por biz
  bizList.forEach(biz => shownCounts.set(biz, 0));
  let queueIndex = 0; // Para rotación circular

  while (mixed.length < items.length) {
    // Re-sort queue por under-represented (menor ratio shown/original) cada 5 items (progresivo)
    if (mixed.length % 5 === 0 && mixed.length > 0) {
      const activeBiz = bizList.filter(biz => groups.get(biz)!.length > 0);
      if (activeBiz.length > 1) {
        bizList.sort((a, b) => {
          if (groups.get(a)!.length === 0) return 1; // Mueve agotados al final
          if (groups.get(b)!.length === 0) return -1;
          const ratioA = shownCounts.get(a)! / originalSizes.get(a)!;
          const ratioB = shownCounts.get(b)! / originalSizes.get(b)!;
          return ratioA - ratioB; // Asc: Bajo ratio first (under-represented/small remaining)
        });
        queueIndex = 0; // Reset rotación después re-sort
      }
    }

    // Toma del siguiente en queue (rota)
    let added = false;
    for (let attempts = 0; attempts < numBiz; attempts++) {
      const currentIndex = (queueIndex + attempts) % bizList.length;
      const bizId = bizList[currentIndex];
      const group = groups.get(bizId);
      if (group && group.length > 0) {
        const nextItem = group.shift()!;
        mixed.push(nextItem);
        shownCounts.set(bizId, shownCounts.get(bizId)! + 1);
        queueIndex = (currentIndex + 1) % bizList.length; // Avanza queue
        added = true;
        break;
      }
    }
    if (!added) break; // No más items
  }

  // Asegura full length (raro, pero por si skips)
  if (mixed.length < items.length) {
    // Agrega restantes por score (no push raw)
    const remaining = [];
    for (const group of groups.values()) {
      remaining.push(...group);
    }
    remaining.sort((a, b) => b.score - a.score);
    mixed.push(...remaining);
  }

  // Log debug refinado (INTEGR: Adaptado para este contexto)
  if (process.env.NODE_ENV === "development") {
    const finalSizes = Array.from(groups.keys()).map(biz => `${biz.slice(-4)}: ${originalSizes.get(biz)} (shown: ${shownCounts.get(biz)})`);
    console.log(`🌀 Interleave en getFeedDataByType: Full mixed ${mixed.length}/${items.length} (biz: ${numBiz}, equity boost smalls, progresivo ratios: [${finalSizes.join(', ')}])`);
  }

  return mixed;
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

  // OPTIM: Log seenIds filtrados para debug (solo dev)
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
      if (process.env.NODE_ENV === "development") {
        console.log(`⚠️ Fallback activado para ${type}: ${rawItems.length} items (relajado prefs/secciones)`);
      }
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
    // INTEGR: Set negocioId en data para facilitar grouping en interleave (ajusta si data no es mutable)
    (item.data as any).negocioId = negocioId;

    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });

  // INTEGR: Reemplaza sort simple por interleave para variedad (full batch, boost smalls)
  const mixedItems = interleaveItemsByBusiness(items, params.limit);

  // OPTIM: nextCursor más conservador (solo si rawItems >= limit, explícito fin para UX)
  nextCursor = rawItems.length >= params.limit ? rawItems[rawItems.length - 1].id : undefined;

  // Logs dev mejorados (INTEGR: Incluye userId, reacciones y interleave)
  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedDataByType(${type}): Fetched ${rawItems.length} raw items -> Mixed ${mixedItems.length} (diversidad aplicada)`);
    if (type === "publications" && params.userId) {
      console.log(`User reactions fetched for userId ${params.userId}: ${Object.keys(userReactionsMap).length} pubs con reacción`);
    }
  }

  return { items: mixedItems.slice(0, params.limit), nextCursor };
}

// Las funciones fetch permanecen IDÉNTICAS (con OPTIM: buffer +10 para robustez paginación)
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
    take: params.limit + 10, // OPTIM: +10 buffer (de +5) para compensar seenIds y asegurar paginación
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
    take: params.limit + 10, // OPTIM: +10 buffer para robustez
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
    take: params.limit + 10, // OPTIM: +10 buffer
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
    take: params.limit + 10, // OPTIM: +10 buffer
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