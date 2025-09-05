// src/actions/feed/getFeedData.ts
"use server";

import prisma from "@/lib/prisma";
import { FeedQueryParams, FeedResponse, FeedItem } from "../feed.interfaces";
import { calculateScore, diversifyItems} from "./helpers";
import { Prisma } from "@prisma/client";
import { productSelect, publicationSelect, serviceSelect, businessSelect, RawProduct, RawPublication, RawService, RawBusiness } from "./selects";
import { mapToFeedItem } from "./mapItem";


export async function getFeedData(params: FeedQueryParams & { cursor?: { product?: string; publication?: string; service?: string; business?: string } }): Promise<FeedResponse> {
  if (!params.ciudad) throw new Error("Ciudad requerida para feed local");

  // Use allSettled para resiliency
  const [productsRes, publicationsRes, servicesRes, businessesRes] = await Promise.allSettled([
    fetchProducts(params),
    fetchPublications(params),
    fetchServices(params),
    fetchBusinesses(params),
  ]);

  let rawProducts: RawProduct[] = productsRes.status === 'fulfilled' ? productsRes.value : [];
  let rawPublications: RawPublication[] = publicationsRes.status === 'fulfilled' ? publicationsRes.value : [];
  let rawServices: RawService[] = servicesRes.status === 'fulfilled' ? servicesRes.value : [];
  let rawBusinesses: RawBusiness[] = businessesRes.status === 'fulfilled' ? businessesRes.value : [];

  // Fallback si escaso: Relajar preferencias/secciones
  if (rawProducts.length < 3) rawProducts = await fetchProducts({ ...params, preferencias: [], secciones: [] });
  if (rawPublications.length < 3) rawPublications = await fetchPublications({ ...params, preferencias: [] });
  if (rawServices.length < 3) rawServices = await fetchServices({ ...params, preferencias: [], secciones: [] });
  if (rawBusinesses.length < 3) rawBusinesses = await fetchBusinesses({ ...params, preferencias: [], secciones: [] });

  // Mapeo con scoring/isFollowed
  const productItems = rawProducts.map((raw) => {
    const item = mapToFeedItem(raw, 'product');
    item.isFollowed = params.followedBusinessIds?.includes(raw.negocio.id) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });
  const publicationItems = rawPublications.map((raw) => {
    const item = mapToFeedItem(raw, 'publication');
    item.isFollowed = params.followedBusinessIds?.includes(raw.negocio?.id ?? '') ?? false;
    item.score = calculateScore(item, params);
    return item;
  });
  const serviceItems = rawServices.map((raw) => {
    const item = mapToFeedItem(raw, 'service');
    item.isFollowed = params.followedBusinessIds?.includes(raw.negocio.id) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });
  const businessItems = rawBusinesses.map((raw) => {
    const item = mapToFeedItem(raw, 'business');
    item.isFollowed = params.followedBusinessIds?.includes(raw.id) ?? false;
    item.score = calculateScore(item, params);
    return item;
  });

  const allItems: FeedItem[] = [...productItems, ...publicationItems, ...serviceItems, ...businessItems];

  // Logs totals dev
  if (process.env.NODE_ENV === "development") {
    console.log(`getFeedData: Totals - Products: ${rawProducts.length}, Publications: ${rawPublications.length}, Services: ${rawServices.length}, Businesses: ${rawBusinesses.length}`);
  }

  const diversifiedItems = diversifyItems(allItems);

  const nextCursor = {
    product: rawProducts.length > 0 ? rawProducts[rawProducts.length - 1].id : undefined,
    publication: rawPublications.length > 0 ? rawPublications[rawPublications.length - 1].id : undefined,
    service: rawServices.length > 0 ? rawServices[rawServices.length - 1].id : undefined,
    business: rawBusinesses.length > 0 ? rawBusinesses[rawBusinesses.length - 1].id : undefined,
  };

  return { items: diversifiedItems.slice(0, params.limit), nextCursor };
}



async function fetchProducts(params: FeedQueryParams & { cursor?: { product?: string } }): Promise<RawProduct[]> {
  // Where dinámico: Relaja si params vacíos (sin any, usando type guards TS)
  const where: Prisma.ProductWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter(id => id.startsWith('product-')) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  // Añade categorias solo si preferencias no vacío; else fallback always-true
  if (params.preferencias.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  } // No else: Omite para incluir todos si vacío

  // Similar para secciones: Usa slug, y relaja si vacío
  if (params.secciones.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } }; // Corrección: slug
  } // No else: Omite para fallback

  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: { createdAt: 'desc' },
    take: Math.floor(params.limit / 4) + 1,
    cursor: params.cursor?.product ? { id: params.cursor.product } : undefined,
    skip: params.cursor?.product ? 1 : 0,
  });
}

async function fetchPublications(params: FeedQueryParams & { cursor?: { publication?: string } }): Promise<RawPublication[]> {
  // Where dinámico: Relaja si params vacíos
  const where: Prisma.PublicacionWhereInput = {
    tipo: { in: ['TESTIMONIO', 'CARRUSEL_IMAGENES'] },
    visibilidad: 'PUBLICA',
    id: { notIn: params.seenIds.filter(id => id.startsWith('pub-')) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  // Añade categorias solo si preferencias no vacío
  if (params.preferencias.length > 0) {
    where.negocio!.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  const publicaciones = await prisma.publicacion.findMany({
    where,
    select: publicationSelect,
    orderBy: [{ numLikes: 'desc' }, { createdAt: 'desc' }],
    take: Math.floor(params.limit / 4) + 5, // Aumenta buffer
    cursor: params.cursor?.publication ? { id: params.cursor.publication } : undefined,
    skip: params.cursor?.publication ? 1 : 0,
  });

  // Logs dev como ref
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

async function fetchServices(params: FeedQueryParams & { cursor?: { service?: string } }): Promise<RawService[]> {
  // Where dinámico: Relaja si params vacíos
  const where: Prisma.ServicioWhereInput = {
    status: "disponible",
    id: { notIn: params.seenIds.filter(id => id.startsWith('serv-')) },
    negocio: {
      OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
    },
  };

  // Añade tags solo si preferencias no vacío
  if (params.preferencias.length > 0) {
    where.tags = { hasSome: params.preferencias };
  }

  // Añade secciones solo si no vacío; corrige a slug
  if (params.secciones.length > 0) {
    where.negocio!.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }

  const services = await prisma.servicio.findMany({
    where,
    select: serviceSelect,
    orderBy: { createdAt: 'desc' },
    take: Math.floor(params.limit / 4) + 5, // Aumenta buffer
    cursor: params.cursor?.service ? { id: params.cursor.service } : undefined,
    skip: params.cursor?.service ? 1 : 0,
  });

  // Logs dev como ref
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

async function fetchBusinesses(params: FeedQueryParams & { cursor?: { business?: string } }): Promise<RawBusiness[]> {
  // Where dinámico: Relaja si params vacíos
  const where: Prisma.NegocioWhereInput = {
    estado: "activo",
    id: { notIn: params.seenIds.filter(id => id.startsWith('bus-')) },
    OR: [{ ciudad: params.ciudad }, { departamento: params.departamento }],
  };

  // Añade categorias solo si preferencias no vacío
  if (params.preferencias.length > 0) {
    where.categorias = { some: { category: { slug: { in: params.preferencias } } } };
  }

  // Añade secciones solo si no vacío; corrige a slug
  if (params.secciones.length > 0) {
    where.secciones = { some: { section: { slug: { in: params.secciones } } } };
  }

  const businesses = await prisma.negocio.findMany({
    where,
    select: businessSelect,
    orderBy: { createdAt: 'desc' },
    take: Math.floor(params.limit / 4) + 5, // Aumenta buffer
    cursor: params.cursor?.business ? { id: params.cursor.business } : undefined,
    skip: params.cursor?.business ? 1 : 0,
  });

  // Logs dev para depuración
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