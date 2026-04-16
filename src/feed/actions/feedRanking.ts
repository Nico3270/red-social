import { EstadoNegocio, ProductEtiquetaEspecial, ProductStatus, ServicioStatus } from "@prisma/client";
import { isRawBusiness, isRawProduct, isRawPublication, isRawService } from "../feed.interfaces";
import { FeedContentType } from "../feed-ids";
import { RawBusiness, RawData, RawProduct, RawPublication, RawService } from "./selects";

type RankingParams = {
  ciudad: string;
  departamento: string;
  followedBusinessIds?: string[];
  preferencias?: string[];
  secciones?: string[];
  userLat?: number | null;
  userLong?: number | null;
};

type BusinessStats = {
  followsCount: number;
  publicacionesCount: number;
  productsCount: number;
  servicesCount: number;
};

type RankedItem<T extends RawData> = {
  item: T;
  score: number;
  businessId: string;
};

const MAX_CANDIDATE_WINDOW = 6;

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const getBusinessMeta = (item: RawData) => {
  if (isRawBusiness(item)) {
    return {
      id: item.id,
      ciudad: item.ciudad,
      departamento: item.departamento,
      latitud: item.latitud ?? null,
      longitud: item.longitud ?? null,
      categorias: item.categorias.map((categoria) => categoria.category.slug),
      secciones: item.secciones.map((section) => section.section.id),
      stats: {
        followsCount: item._count?.followsIn ?? 0,
        publicacionesCount: item._count?.publicaciones ?? 0,
        productsCount: item._count?.Product ?? 0,
        servicesCount: item._count?.Servicio ?? 0,
      } satisfies BusinessStats,
    };
  }

  const negocio = item.negocio;
  return {
    id: negocio?.id ?? "",
    ciudad: negocio?.ciudad ?? "",
    departamento: negocio?.departamento ?? "",
    latitud: negocio?.latitud ?? null,
    longitud: negocio?.longitud ?? null,
    categorias: [] as string[],
    secciones: [] as string[],
    stats: {
      followsCount: negocio?._count?.followsIn ?? 0,
      publicacionesCount: negocio?._count?.publicaciones ?? 0,
      productsCount: negocio?._count?.Product ?? 0,
      servicesCount: negocio?._count?.Servicio ?? 0,
    } satisfies BusinessStats,
  };
};

const getInterestBoost = (item: RawData, params: RankingParams): number => {
  const preferencias = params.preferencias ?? [];
  const secciones = params.secciones ?? [];

  if (preferencias.length === 0 && secciones.length === 0) {
    return 0;
  }

  if (isRawProduct(item)) {
    const matchesCategory =
      preferencias.includes(item.categoryId) || preferencias.includes(item.category.slug)
        ? 1.2
        : 0;
    const matchingSections = item.secciones.filter((section) => secciones.includes(section.section.id)).length;
    return matchesCategory + Math.min(1.1, matchingSections * 0.4);
  }

  if (isRawBusiness(item)) {
    const matchingCategories = item.categorias.filter((categoria) =>
      preferencias.includes(categoria.category.slug)
    ).length;
    const matchingSections = item.secciones.filter((section) =>
      secciones.includes(section.section.id)
    ).length;
    return Math.min(1.6, matchingCategories * 0.45) + Math.min(1.1, matchingSections * 0.35);
  }

  return 0;
};

const getLocationBoost = (item: RawData, params: RankingParams): number => {
  const businessMeta = getBusinessMeta(item);

  if (businessMeta.ciudad && businessMeta.ciudad === params.ciudad) {
    return 2.8;
  }

  if (businessMeta.departamento && businessMeta.departamento === params.departamento) {
    return 1.6;
  }

  return 0.7;
};

const getDistanceBoost = (item: RawData, params: RankingParams): number => {
  const { userLat, userLong } = params;
  if (userLat == null || userLong == null) {
    return 0;
  }

  const businessMeta = getBusinessMeta(item);
  if (businessMeta.latitud == null || businessMeta.longitud == null) {
    return 0;
  }

  const distance = haversine(userLat, userLong, businessMeta.latitud, businessMeta.longitud);

  if (distance <= 3) return 1.7;
  if (distance <= 10) return 1.3;
  if (distance <= 25) return 0.9;
  if (distance <= 50) return 0.45;
  return 0.1;
};

const getFreshnessBoost = (item: RawData): number => {
  const now = Date.now();
  const createdAtMs = new Date(item.createdAt).getTime();
  const hoursSince = (now - createdAtMs) / (1000 * 60 * 60);

  if (isRawPublication(item)) {
    return Math.max(0, 3.6 * Math.exp(-hoursSince / 72));
  }

  const daysSince = hoursSince / 24;

  if (isRawProduct(item)) {
    return Math.max(0, 2.6 * Math.exp(-daysSince / 28));
  }

  if (isRawService(item)) {
    return Math.max(0, 2.1 * Math.exp(-daysSince / 40));
  }

  return Math.max(0, 1.7 * Math.exp(-daysSince / 60));
};

const getManualPriorityBoost = (item: RawData): number => {
  const orden = typeof item.orden === "number" ? item.orden : 0;
  return Math.min(3.5, orden * 0.42);
};

const getFollowBoost = (item: RawData, params: RankingParams): number => {
  const followed = params.followedBusinessIds ?? [];
  const businessId = getBusinessMeta(item).id;

  if (!followed.includes(businessId)) {
    return 0;
  }

  if (isRawProduct(item)) return 3.2;
  if (isRawPublication(item)) return 3;
  if (isRawService(item)) return 2.8;
  return 2.4;
};

const getBusinessAuthorityBoost = (item: RawData): number => {
  const stats = getBusinessMeta(item).stats;
  const followsScore = Math.min(1.8, Math.log1p(stats.followsCount) * 0.55);
  const activityScore =
    Math.min(1.2, Math.log1p(stats.publicacionesCount) * 0.3) +
    Math.min(0.9, Math.log1p(stats.productsCount) * 0.18) +
    Math.min(0.7, Math.log1p(stats.servicesCount) * 0.2);

  return followsScore + activityScore;
};

const scoreProduct = (item: RawProduct): number => {
  let score = 0;
  const variantCount = item.variantes?.length ?? 0;
  const optionCount = item.variantes?.reduce((total, variant) => total + (variant.options?.length ?? 0), 0) ?? 0;

  score += Math.min(1.4, (item.imagenes?.length ?? 0) * 0.3);
  score += Math.min(1.8, variantCount * 0.3);
  score += Math.min(1.3, optionCount * 0.14);
  score += Math.min(1.4, (item.prioridad ?? 0) * 0.25);
  score += Math.min(1.8, ((item.ratingPromedio ?? 0) / 5) * 1.8);
  score += Math.min(1.5, Math.log1p(item.numResenas ?? 0) * 0.55);

  if (item.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido) score += 1.1;
  if (item.etiquetaEspecial === ProductEtiquetaEspecial.novedad) score += 0.8;
  if (item.usaVariantes && variantCount > 1) score += 1.2;
  if ((item.descripcionCorta ?? "").length >= 90) score += 0.35;
  if (item.status !== ProductStatus.disponible) score -= 2.5;

  const isOutOfStock =
    !item.stockIlimitado &&
    !item.usaVariantes &&
    typeof item.stock === "number" &&
    item.stock <= 0;

  if (isOutOfStock) score -= 1.2;

  return score;
};

const scorePublication = (item: RawPublication): number => {
  let score = 0;

  const weightedEngagement =
    item.numLikes +
    item.numComentarios * 1.45 +
    item.numCompartidos * 1.25;

  score += Math.min(3.2, Math.log1p(weightedEngagement) * 1.12);
  score += Math.min(1.5, (item.multimedia?.length ?? 0) * 0.35);
  score += Math.min(1.2, ((item.calificacion ?? 0) / 5) * 1.2);
  score += Math.min(0.9, Math.log1p(item.numComentarios ?? 0) * 0.38);

  if (item.tipo === "TESTIMONIO") score += 0.75;
  if ((item.productosEnPublicacion?.length ?? 0) > 0) score += 0.9;
  if ((item.calificacion ?? 0) >= 4) score += 0.8;
  if ((item.descripcion ?? "").length >= 140) score += 0.35;

  return score;
};

const scoreService = (item: RawService): number => {
  let score = 0;

  const descriptionText = Array.isArray(item.descripcion)
    ? item.descripcion.filter((value): value is string => typeof value === "string").join(" ")
    : typeof item.descripcion === "string"
    ? item.descripcion
    : "";
  const descriptionLength = descriptionText.length;

  score += Math.min(1.4, (item.multimedia?.length ?? 0) * 0.35);
  score += Math.min(1.2, (item.tags?.length ?? 0) * 0.22);
  score += item.precio != null ? 0.35 : 0;
  score += Math.min(0.8, Math.log1p(item.negocio?._count?.followsIn ?? 0) * 0.28);

  if (descriptionLength >= 120) score += 0.9;
  else if (descriptionLength >= 50) score += 0.45;
  else score -= 0.25;

  if (item.status !== ServicioStatus.disponible) score -= 2.2;

  return score;
};

const scoreBusiness = (item: RawBusiness): number => {
  let score = 0;

  if ((item.descripcion ?? "").length >= 120) score += 1.1;
  else if ((item.descripcion ?? "").length >= 40) score += 0.55;

  if (item.fotoPerfil) score += 0.8;
  if (item.fotoPortada) score += 0.7;
  if (item.telefonoContacto) score += 0.45;
  if (item.urlGoogleMaps) score += 0.45;

  score += Math.min(1.0, item.categorias.length * 0.2);
  score += Math.min(0.8, item.secciones.length * 0.15);
  score += Math.min(1.4, Math.log1p(item._count?.followsIn ?? 0) * 0.48);
  score += Math.min(1.2, Math.log1p(item._count?.publicaciones ?? 0) * 0.34);

  if (item.estado !== EstadoNegocio.activo) score -= 2.5;

  return score;
};

const computeItemScore = (item: RawData, params: RankingParams): number => {
  let score =
    getManualPriorityBoost(item) +
    getFreshnessBoost(item) +
    getLocationBoost(item, params) +
    getDistanceBoost(item, params) +
    getFollowBoost(item, params) +
    getInterestBoost(item, params) +
    getBusinessAuthorityBoost(item);

  if (isRawProduct(item)) score += scoreProduct(item);
  if (isRawPublication(item)) score += scorePublication(item);
  if (isRawService(item)) score += scoreService(item);
  if (isRawBusiness(item)) score += scoreBusiness(item);

  return Number(score.toFixed(3));
};

const compareRankedItems = <T extends RawData>(a: RankedItem<T>, b: RankedItem<T>) => {
  if (b.score !== a.score) return b.score - a.score;

  const createdA = new Date(a.item.createdAt).getTime();
  const createdB = new Date(b.item.createdAt).getTime();
  if (createdB !== createdA) return createdB - createdA;

  return a.item.id.localeCompare(b.item.id);
};

const diversifyByBusiness = <T extends RawData>(items: RankedItem<T>[]): RankedItem<T>[] => {
  const pool = [...items].sort(compareRankedItems);
  const result: RankedItem<T>[] = [];

  while (pool.length > 0) {
    const recentBusinessIds = result
      .slice(-2)
      .map((entry) => entry.businessId)
      .filter(Boolean);

    let selectedIndex = pool.findIndex(
      (candidate, index) =>
        index < MAX_CANDIDATE_WINDOW &&
        !recentBusinessIds.includes(candidate.businessId)
    );

    if (selectedIndex === -1) {
      selectedIndex = 0;
    }

    result.push(pool.splice(selectedIndex, 1)[0]);
  }

  return result;
};

export function rankRawItems<T extends RawData>(
  items: T[],
  _type: FeedContentType,
  params: RankingParams
): Array<{ item: T; score: number }> {
  const ranked = items.map((item) => ({
    item,
    score: computeItemScore(item, params),
    businessId: getBusinessMeta(item).id,
  }));

  return diversifyByBusiness(ranked).map(({ item, score }) => ({ item, score }));
}
