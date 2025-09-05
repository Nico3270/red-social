// src/actions/feed/helpers.ts

import { FeedItem, FeedQueryParams, isProductItem, isPublicationItem, isServiceItem, isBusinessItem, } from "../feed.interfaces";
import { mockParams, mockProductItem, mockPublicationItem } from "./feedMocks";

import { 
  isRawProduct, 
  isRawPublication, 
  isRawService, 
  isRawBusiness 
} from "../feed.interfaces";

export function calculateScore(item: FeedItem, params: FeedQueryParams): number {
  let score = 0;

  // Matches preferencias (categorias/tags) - Narrow por type
  let itemCategorias: string[] = [];
  if (isBusinessItem(item)) {
    itemCategorias = item.data.categorias || [];
  } else if (isProductItem(item)) {
    itemCategorias = item.data.tags || [];
  } else if (isServiceItem(item)) {
    itemCategorias = item.data.tags || [];
  } else if (isPublicationItem(item)) {
    itemCategorias = []; // Publicaciones no tienen categorías directas; fallback o deriva de negocio
  }
  const catMatches = params.preferencias.filter(pref => itemCategorias.includes(pref)).length;
  score += catMatches * 2;

  // Matches secciones (slugs)
  let itemSecciones: string[] = [];
  if (isBusinessItem(item)) {
    itemSecciones = item.data.secciones || [];
  } else if (isProductItem(item)) {
    itemSecciones = item.data.sections || [];
  } else if (isServiceItem(item)) {
    itemSecciones = []; // Services no tienen secciones; ajusta si agregas
  } else if (isPublicationItem(item)) {
    itemSecciones = []; // Similar, deriva si necesario
  }
  const secMatches = params.secciones.filter(sec => itemSecciones.includes(sec)).length;
  score += secMatches * 1;

  // Ubicación (ciudad/departamento) - Narrow con optional chaining
  let itemCiudad = '';
  let itemDepartamento = '';
  if (isBusinessItem(item)) {
    itemCiudad = item.data.ciudad || '';
    itemDepartamento = item.data.departamento || '';
  } else if (isProductItem(item)) {
    itemCiudad = item.data.ciudad || ''; // De negocio
    itemDepartamento = item.data.departamento || '';
  } else if (isServiceItem(item)) {
    itemCiudad = ''; // Placeholder; agrega a ServicioData si necesario
    itemDepartamento = '';
  } else if (isPublicationItem(item)) {
    itemCiudad = item.data.negocio?.ciudad || '';
    itemDepartamento = item.data.negocio?.departamento || '';
  }
  if (itemCiudad === params.ciudad) score += 3;
  else if (itemDepartamento === params.departamento) score += 1;

  // Boost follows (negocioId común)
  let negocioId = '';
  if (isProductItem(item) || isServiceItem(item)) {
    negocioId = item.data.negocioId;
  } else if (isBusinessItem(item)) {
    negocioId = item.data.id;
  } else if (isPublicationItem(item)) {
    negocioId = item.data.negocio?.id || '';
  }
  if (params.followedBusinessIds?.includes(negocioId)) {
    score += 5;
    item.isFollowed = true;
  }

  // Hotness (narrow a tipos con numLikes/numComentarios)
  if (isPublicationItem(item)) {
    score += (item.data.numLikes || 0) * 0.5;
    score += (item.data.numComentarios || 0) * 0.3;
  } // Extiende para otros si agregas interacciones

  // Decay relajado: /45 días para incluir semi-recientes
  const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  score *= (1 - (daysOld / 45));

  // Relajo: Base score +1 si no matches para inclusión mínima
  if (catMatches === 0 && secMatches === 0) score += 1;

  return Math.max(score, 0);
}

export function diversifyItems(items: FeedItem[]): FeedItem[] {
  // Filtra por score >2 (relajado; dinámico si pocos)
  let minScore = 2;
  if (items.length < 20) minScore = 0; // Relajo si escaso para "siempre mostrar"
  const filtered = items.filter(item => item.score > minScore).sort((a, b) => b.score - a.score);

  // Forzar ratios: 50% pubs, 20% prod, 20% serv, 10% bus
  const total = filtered.length;
  const pubTarget = Math.floor(total * 0.5);
  const prodTarget = Math.floor(total * 0.2);
  const servTarget = Math.floor(total * 0.2);
  const busTarget = Math.floor(total * 0.1);

  const pubs = filtered.filter(i => i.type === 'publication').slice(0, pubTarget);
  const prods = filtered.filter(i => i.type === 'product').slice(0, prodTarget);
  const servs = filtered.filter(i => i.type === 'service').slice(0, servTarget);
  const buses = filtered.filter(i => i.type === 'business').slice(0, busTarget);

  // Fallback relleno: Si tipo bajo target, añade de otros (equilibrio)
  let mixed = [...pubs, ...prods, ...servs, ...buses];
  if (mixed.length < total) mixed = [...mixed, ...filtered.slice(0, total - mixed.length)]; // Rellena con top restantes

  // Shuffle Fisher-Yates para mix natural
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }

  return mixed;
}

// Temporal en helpers.ts - Esta función SÍ podría ser async si necesitas Server Action
export async function testScoring() {
  "use server"; // Solo esta función es Server Action
  
  const items: FeedItem[] = [mockProductItem, mockPublicationItem /* + others */];
  items.forEach(item => {
    const score = calculateScore(item, mockParams);
    item.score = score; // Mutate for test
    console.log(`Item ${item.type} ID ${item.id}: Score = ${score}, isFollowed = ${item.isFollowed}`);
  });
  const diversified = diversifyItems(items);
  console.log("Diversified Items:", diversified.map(i => ({ type: i.type, score: i.score })));
}



