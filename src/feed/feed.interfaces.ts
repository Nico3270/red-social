import { ProductStatus, Currency, ServicioStatus, EstadoNegocio } from "@prisma/client";
import { RawBusiness, RawData, RawProduct, RawPublication, RawService } from "./actions/selects";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";




export interface BusinessCardData {
  id: string;
  nombre: string;
  slug: string;
  negocioId: string;
  descripcion?: string; // Truncar en UI a 100 chars para elegancia
  ciudad: string;
  departamento: string;
  imagenPerfil?: string; // Para avatar en card
  imagenPortada?: string; // Para background o header
  telefonoContacto?: string; // Para botón WhatsApp/llamada
  urlGoogleMaps?: string; // Para enlace "Ver en mapa"
  categorias: string[]; // Slugs de categorías para badges (e.g., ["moda", "tecnologia"])
  secciones: string[]; // Ids de secciones para filtros/badges
  estado: EstadoNegocio; // Para filtrar solo 'activo' en feed
  createdAt: Date; // Para recency en sorting
}



// Interface para ProductCard
export interface ProductRedSocial {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  prioridad: number;
  status: ProductStatus;
  tags: string[];
  categoriaId: string;
  imagenes: string[];
  componentes: string[];
  sections: string[];
  slugNegocio?: string;
  nombreNegocio?: string;
  negocioId: string;
  telefonoContacto?: string;
  negocioFotoPerfil: string;
  ciudad?: string; // De negocio
  departamento?: string;
}
// Interface para publicaciones en componentes como ShowTestimonioPublicacion y SocialMediaPublicacion
// Solo tenemos publicaciones del tipo TESTIMONIO que se muestran en ShowTestimonioPublicacion
// y publicaciones del tipo CARRUSEL_IMAGENES que se muestran en SocialMediaPublicacion



export interface Media {
  id: string;
  url: string;
  tipo: "IMAGEN" | "VIDEO";
  formato?: string;
  orden: number;
}


export type FeedItemType = 'product' | 'publication' | 'service' | 'business';

export interface FeedItem {
  id: string;
  type: FeedItemType; // Discriminator para switch
  score: number; // Para ranking (calculado en query: matches con preferencias + recency)
  createdAt: Date; // Para sorting/decay
  // Campos comunes normalizados (para UI consistente: e.g., todas cards tienen title/image)
  title: string;
  descriptionShort: string; // Truncada para previews
  imageUrl: string; // Primera imagen/multimedia
  businessSlug: string; // Enlace a perfil de negocio
  isFollowed: boolean; // Boost visual (badge como en Instagram)
  // Data específica por tipo
  data: ProductRedSocial | EnhancedPublicacion | ServicioData | BusinessCardData;
  // Opcionales: price para products/services, numLikes para publications
  price?: number;
  numLikes?: number; // Para hotness en sorting
  status?: ProductStatus | ServicioStatus | EstadoNegocio; // Filtrar activos
}

export interface FeedQueryParams {
  ciudad: string;
  departamento: string;
  preferencias?: string[];  // Opcional: para futuro dinamismo
  secciones?: string[];     // Opcional: para futuro dinamismo
  page?: number;           // Opcional (ya lo es)
  limit: number; 
  seenIds: string[]; 
  followedBusinessIds?: string[]; 
  cursor?: string;         // Opcional
}



export interface FeedResponse {
  items: FeedItem[];
  nextCursor?: string; // Simplificado a string | undefined
}


// src/interfaces/feed.interfaces.ts (al final)

// Type Guards para narrowing elegante
export function isProductItem(item: FeedItem): item is FeedItem & { data: ProductRedSocial } {
  return item.type === 'product';
}

export function isPublicationItem(item: FeedItem): item is FeedItem & { data: EnhancedPublicacion } {
  // CAMBIO: Ahora usa EnhancedPublicacion en lugar de PublicacionSencilla
  return item.type === 'publication';
}

export function isServiceItem(item: FeedItem): item is FeedItem & { data: ServicioData } {
  return item.type === 'service';
}

export function isBusinessItem(item: FeedItem): item is FeedItem & { data: BusinessCardData } {
  return item.type === 'business';
}

// Helpers para narrowing (añade a interfaces.ts)
export function isRawProduct(raw: RawData): raw is RawProduct {
  return (
    'nombre' in raw &&                        // Productos usan "nombre"
    Array.isArray((raw as any).imagenes)      // y tienen imágenes
  );
}

export function isRawPublication(raw: RawData): raw is RawPublication {
  return (
    'multimedia' in raw &&
    'usuario' in raw
  );
}

export function isRawService(raw: RawData): raw is RawService {
  return (
    'titulo' in raw &&                        // Servicios usan "titulo"
    Array.isArray((raw as any).multimedia)    // y tienen multimedia
  );
}

export function isRawBusiness(raw: RawData): raw is RawBusiness {
  return (
    'estado' in raw &&
    'categorias' in raw
  );
}

