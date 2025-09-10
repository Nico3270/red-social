// src/actions/feed/getFeedDataByCategory.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { calculateScore } from "./helpers";
import { Prisma, ReaccionTipo } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";
import { isRawProduct, isRawPublication, isRawService, isRawBusiness } from "../feed.interfaces";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

// EXTENSIÓN: Params con categoriaSlug requerido
interface ExtendedParams extends FeedQueryParams {
  cursor?: string;
  userId?: string | null;
  categoriaSlug: string;  // REQUERIDO para filtrado
}

// REFIN: Función interleave refinada: Boost equidad para smalls + round-robin progresivo (sin truncar, full batch)
function interleaveItemsByBusiness(items: FeedItem[], limit: number): FeedItem[] {
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
    // Si pocos biz, sort simple por score para no over-mix
    return items.sort((a, b) => b.score - a.score);
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

  // Log debug refinado
  if (process.env.NODE_ENV === "development") {
    const finalSizes = Array.from(groups.keys()).map(biz => `${biz.slice(-4)}: ${originalSizes.get(biz)} (shown: ${shownCounts.get(biz)})`);
    console.log(`🌀 Interleave refinado: Full mixed ${mixed.length}/${items.length} (biz: ${numBiz}, equity boost smalls, progresivo ratios: [${finalSizes.join(', ')}])`);
  }

  return mixed;
}

export async function getFeedDataByCategory(
  type: "products" | "publications" | "services" | "businesses",
  params: ExtendedParams  // categoriaSlug requerido
): Promise<FeedResponse> {
  // NUEVO: Validación temprana de categoría (fetch por slug para confirmar existencia/isActive)
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

  // FIX: Para modo categoría, ignora preferencias/secciones (set [] para estricto)
  const strictParams = {
    ...params,
    preferencias: [],  // Ignora preferencias (solo categoría + ciudad/departamento)
    secciones: [],     // Ignora secciones
  };

  let rawItems: (RawProduct | RawPublication | RawService | RawBusiness)[] = [];
  let nextCursor: string | undefined;

  try {
    // Fetch por tipo con filtro estricto por categoría (usa strictParams)
    switch (type) {
      case "products":
        rawItems = await fetchProductsWithCategory(strictParams);
        break;
      case "publications":
        rawItems = await fetchPublicationsWithCategory(strictParams);
        break;
      case "services":
        rawItems = await fetchServicesWithCategory(strictParams);
        break;
      case "businesses":
        rawItems = await fetchBusinessesWithCategory(strictParams);
        break;
    }
  } catch (error) {
    console.error(`❌ Error fetching ${type} for category ${params.categoriaSlug}:`, error);
    rawItems = []; // Resiliency
  }

  // NUEVO: Log debug de rawItems inicial
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Initial rawItems for ${type} in '${params.categoriaSlug}' (strict mode, ignored prefs/secciones): ${rawItems.length}`);
  }

  // Fallback si escaso: Relaja ciudad/departamento opcionalmente, pero mantiene categoría
  if (rawItems.length < 3) {
    // FIX: Destructuring para omitir ciudad/departamento (type-safe, infiere sin ellas)
    const { ciudad, departamento, ...relaxedParams } = strictParams;
    if (process.env.NODE_ENV === "development") {
      console.log(`⚠️ Relaxed ciudad/departamento for fallback (omitted: ${ciudad}, ${departamento}, nacional scope)`);
    }
    try {
      rawItems =
        type === "products"
          ? await fetchProductsWithCategory({ ...relaxedParams, ciudad: undefined, departamento: undefined } as any)  // As any temporal for fallback (safe since fetches handle ?.)
          : type === "publications"
          ? await fetchPublicationsWithCategory({ ...relaxedParams, ciudad: undefined, departamento: undefined } as any)
          : type === "services"
          ? await fetchServicesWithCategory({ ...relaxedParams, ciudad: undefined, departamento: undefined } as any)
          : await fetchBusinessesWithCategory({ ...relaxedParams, ciudad: undefined, departamento: undefined } as any);
      // NUEVO: Log fallback
      if (process.env.NODE_ENV === "development") {
        console.log(`📊 Fallback rawItems for ${type} in '${params.categoriaSlug}' (relaxed ciudad/depto): ${rawItems.length}`);
      }
    } catch (error) {
      console.error(`❌ Error in fallback for ${type} in category ${params.categoriaSlug}:`, error);
    }
  }

  // Batch para reacciones en publications (IDÉNTICO a original, con log)
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

      // NUEVO: Log batch reacciones
      if (process.env.NODE_ENV === "development") {
        console.log(`📊 Batch reacciones for category '${params.categoriaSlug}': ${Object.keys(userReactionsMap).length}/${pubIds.length} pubs con reacción`);
      }
    }
  }

  // Mapeo con scoring/isFollowed (MOD: Agregamos item.data.negocioId para interleave)
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

    // NUEVO: Set negocioId en data para facilitar grouping en interleave (ajusta si data no es mutable)
    (item.data as any).negocioId = negocioId;

    item.isFollowed = params.followedBusinessIds?.includes(negocioId) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });

  // REFIN: Interleave full con boost equidad (usa params.limit para cap batch en loop)
  const mixedItems = interleaveItemsByBusiness(items, params.limit);

  // MOD: nextCursor del raw original (para paginación consistente por tiempo, trae más raw en next page)
  nextCursor = rawItems.length > 0 ? rawItems[rawItems.length - 1].id : undefined;

  // Logs dev final (REFIN: Incluye info de interleave full y categoría)
  if (process.env.NODE_ENV === "development") {
    console.log(`✅ getFeedDataByCategory(${type}, ${params.categoriaSlug}): Raw ${rawItems.length} -> Full mixed ${mixedItems.length} (equity boost, no truncar, paginación intacta)`);
  }

  return { items: mixedItems.slice(0, params.limit), nextCursor };
}

// Las funciones fetch permanecen IDÉNTICAS (sin cambios)
async function fetchProductsWithCategory(params: ExtendedParams & { ciudad?: string; departamento?: string }): Promise<RawProduct[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("product-")) },
    negocio: orLocation.length > 0 ? { OR: orLocation } : {},  // Condicional OR (nacional si undefined)
    category: { slug: params.categoriaSlug },  // Filtro estricto por categoría del producto
  };

  // NUEVO: Log where estricto
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Products where STRICT for '${params.categoriaSlug}' (ciudad: ${params.ciudad || 'nacional'}, seenIds length: ${params.seenIds.length}, ignored prefs/secciones):`, JSON.stringify(where, null, 2));
  }

  const products = await prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // NUEVO: Log count y sample
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Products fetched STRICT for '${params.categoriaSlug}': ${products.length}`);
    if (products.length > 0) {
      console.log('Sample product category:', products[0].category?.slug || 'No category');
    } else {
      // NUEVO: Debug count de productos en categoría (sin filtros extra)
      const totalInCategory = await prisma.product.count({
        where: { category: { slug: params.categoriaSlug } },
      });
      console.log(`ℹ️ Total products in category '${params.categoriaSlug}' (no filters): ${totalInCategory}`);
    }
  }

  return products;
}

async function fetchPublicationsWithCategory(params: ExtendedParams & { ciudad?: string; departamento?: string }): Promise<RawPublication[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
    visibilidad: "PUBLICA",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("pub-")) },
    negocio: {
      ...(orLocation.length > 0 ? { OR: orLocation } : {}),
      categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro estricto por categoría del negocio
    },
  };

  // NUEVO: Log where estricto
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Publications where STRICT for '${params.categoriaSlug}' (ciudad: ${params.ciudad || 'nacional'}, seenIds length: ${params.seenIds.length}, ignored prefs/secciones):`, JSON.stringify(where, null, 2));
  }

  const publicaciones = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ numLikes: "desc" }, { createdAt: "desc" }],
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // NUEVO: Log count y sample
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Publications fetched STRICT for '${params.categoriaSlug}': ${publicaciones.length}`);
    if (publicaciones.length > 0) {
      const sampleNegocio = publicaciones[0].negocio;
      console.log('Sample pub negocio info:', {
        id: sampleNegocio?.id,
        nombre: sampleNegocio?.nombre,
        ciudad: sampleNegocio?.ciudad,
        categorias: 'Not included in select (use Prisma Studio for check)',
      });
    } else {
      // NUEVO: Debug count de publicaciones en categoría (sin filtros extra)
      const totalInCategory = await prisma.publicacion.count({
        where: {
          negocio: { categorias: { some: { category: { slug: params.categoriaSlug } } } },
        },
      });
      console.log(`ℹ️ Total publications in category '${params.categoriaSlug}' (no filters): ${totalInCategory}`);
    }
  }

  return publicaciones;
}

async function fetchServicesWithCategory(params: ExtendedParams & { ciudad?: string; departamento?: string }): Promise<RawService[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("serv-")) },
    negocio: {
      ...(orLocation.length > 0 ? { OR: orLocation } : {}),
      categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro estricto por categoría del negocio
    },
  };

  // NUEVO: Log where estricto
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Services where STRICT for '${params.categoriaSlug}' (ciudad: ${params.ciudad || 'nacional'}, seenIds length: ${params.seenIds.length}, ignored prefs/secciones):`, JSON.stringify(where, null, 2));
  }

  const services = await prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // NUEVO: Log count y debug total
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Services fetched STRICT for '${params.categoriaSlug}': ${services.length}`);
    if (services.length === 0) {
      const totalInCategory = await prisma.servicio.count({
        where: {
          negocio: { categorias: { some: { category: { slug: params.categoriaSlug } } } },
        },
      });
      console.log(`ℹ️ Total services in category '${params.categoriaSlug}' (no filters): ${totalInCategory}`);
    }
  }

  return services;
}

async function fetchBusinessesWithCategory(params: ExtendedParams & { ciudad?: string; departamento?: string }): Promise<RawBusiness[]> {
  const orLocation: Prisma.NegocioWhereInput[] = [];
  if (params.ciudad) orLocation.push({ ciudad: params.ciudad });
  if (params.departamento) orLocation.push({ departamento: params.departamento });
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter((id) => id.startsWith("bus-")) },
    ...(orLocation.length > 0 ? { OR: orLocation } : {}),
    categorias: { some: { category: { slug: params.categoriaSlug } } },  // Filtro estricto por categorías del negocio
  };

  // NUEVO: Log where estricto
  if (process.env.NODE_ENV === "development") {
    console.log(`🔍 Businesses where STRICT for '${params.categoriaSlug}' (ciudad: ${params.ciudad || 'nacional'}, seenIds length: ${params.seenIds.length}, ignored prefs/secciones):`, JSON.stringify(where, null, 2));
  }

  const businesses = await prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: "desc" },
    take: params.limit + 5,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
  });

  // NUEVO: Log count y sample categories (businessSelect incluye categorias, usa ?.)
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 Businesses fetched STRICT for '${params.categoriaSlug}': ${businesses.length}`);
    if (businesses.length > 0) {
      const sampleBusiness = businesses[0];
      let sampleCategories = 'No categorias';
      if (sampleBusiness.categorias && Array.isArray(sampleBusiness.categorias)) {
        sampleCategories = sampleBusiness.categorias.map((c: any) => c.category.slug).join(', ');
      }
      console.log('Sample business categories:', sampleCategories);
    } else {
      // NUEVO: Debug count de negocios en categoría (sin filtros extra)
      const totalInCategory = await prisma.negocio.count({
        where: {
          categorias: { some: { category: { slug: params.categoriaSlug } } },
        },
      });
      console.log(`ℹ️ Total businesses in category '${params.categoriaSlug}' (no filters): ${totalInCategory}`);
    }
  }

  return businesses;
}