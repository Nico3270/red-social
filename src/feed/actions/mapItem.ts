import { 
  FeedItem,
  FeedItemType,
  ProductRedSocial,
  PublicacionSencilla,
  ServicioData,
  BusinessCardData,
  isRawProduct,
  isRawPublication,
  isRawService,
  isRawBusiness
} from "../feed.interfaces";
import { RawBusiness, RawData, RawProduct, RawPublication, RawService } from "./selects";

// Overloads (sin cambios)
export function mapToFeedItem(raw: RawProduct, type: 'product'): FeedItem;
export function mapToFeedItem(raw: RawPublication, type: 'publication'): FeedItem;
export function mapToFeedItem(raw: RawService, type: 'service'): FeedItem;
export function mapToFeedItem(raw: RawBusiness, type: 'business'): FeedItem;

export function mapToFeedItem(raw: RawData, type: FeedItemType): FeedItem {
  switch (type) {
    case 'product':
      if (!isRawProduct(raw)) throw new Error('Raw no matcha Product');
      
      // Fix: Validación robusta para imageUrl (evita crash si imagenes es undefined/null)
      let imageUrlProduct = '';
      if (raw.imagenes && Array.isArray(raw.imagenes) && raw.imagenes.length > 0) {
        imageUrlProduct = raw.imagenes[0].url || ''; // Acceso seguro post-validación
      } else {
        // Fallback elegante: Placeholder responsive de tu app (ajusta la ruta según tu assets)
        imageUrlProduct = '/imgs/placeholder-producto.png'; // O raw.negocio?.fotoPerfil si aplica para negocio
      }

      return {
        id: raw.id,
        type,
        score: 0,
        createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt ?? Date.now()),
        title: raw.nombre,
        descriptionShort: raw.descripcionCorta || (raw.descripcion ? raw.descripcion.slice(0, 100) : ''),
        imageUrl: imageUrlProduct,
        businessSlug: raw.negocio?.slug || '',
        isFollowed: false,
        data: {
          id: raw.id,
          nombre: raw.nombre,
          precio: raw.precio,
          descripcion: raw.descripcion || "",
          descripcionCorta: raw.descripcionCorta || "",
          slug: raw.slug,
          prioridad: raw.prioridad || 1,
          status: raw.status,
          tags: raw.tags,
          categoriaId: raw.categoryId,
          imagenes: raw.imagenes ? raw.imagenes.map(img => img.url) : [], // Guard para map (evita crash en data)
          componentes: raw.componentes || [],
          sections: raw.secciones ? raw.secciones.map(s => s.section.id) : [], // Similar guard
          slugNegocio: raw.negocio?.slug || '',
          nombreNegocio: raw.negocio?.nombre || '',
          telefonoContacto: raw.negocio?.telefonoContacto || "",
          negocioId: raw.negocio?.id || '',
          negocioFotoPerfil: raw.negocio?.fotoPerfil || "/imgs/admin-avatar.webp",
          ciudad: raw.negocio?.ciudad ?? '',
          departamento: raw.negocio?.departamento ?? '',
        } as ProductRedSocial,
        price: raw.precio,
        status: raw.status,
      };
    case 'publication':
      if (!isRawPublication(raw)) throw new Error('Raw no matcha Publication');
      
      // Fix: Validación robusta para imageUrl (evita crash si multimedia es undefined/null)
      let imageUrlPublication = '';
      if (raw.multimedia && Array.isArray(raw.multimedia) && raw.multimedia.length > 0) {
        imageUrlPublication = raw.multimedia[0].url || '';
      } else {
        imageUrlPublication = '/imgs/placeholder-publicacion.png'; // Placeholder para publicaciones sin media
      }

      return {
        id: raw.id,
        type,
        score: 0,
        createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
        title: raw.titulo || 'Publicación',
        descriptionShort: raw.descripcion ? raw.descripcion.slice(0, 100) : '',
        imageUrl: imageUrlPublication,
        businessSlug: raw.negocio?.slug || '',
        isFollowed: false,
        data: {
          id: raw.id,
          usuario: raw.usuario,
          tipo: raw.tipo,
          titulo: raw.titulo,
          descripcion: raw.descripcion,
          multimedia: raw.multimedia ? raw.multimedia.map(m => ({
            id: m.id || '',
            url: m.url,
            tipo: m.tipo || 'IMAGEN',
            formato: m.formato,
            orden: m.orden || 0,
          })) : [], // Guard para map (evita crash en data)
          visibilidad: raw.visibilidad,
          createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
          numLikes: raw.numLikes,
          numComentarios: raw.numComentarios,
          negocio: raw.negocio ? {
            id: raw.negocio.id,
            nombre: raw.negocio.nombre || '',
            fotoPerfil: raw.negocio.fotoPerfil,
            slug: raw.negocio.slug,
            ciudad: raw.negocio.ciudad,
            departamento: raw.negocio.departamento,
          } : undefined,
        } as PublicacionSencilla,
        numLikes: raw.numLikes,
      };
    case 'service':
      if (!isRawService(raw)) throw new Error('Raw no matcha Service');
      
      // Fix: Validación robusta para imageUrl (evita crash si multimedia es undefined/null)
      let imageUrlService = '';
      if (raw.multimedia && Array.isArray(raw.multimedia) && raw.multimedia.length > 0) {
        imageUrlService = raw.multimedia[0].url || '';
      } else {
        imageUrlService = '/imgs/placeholder-servicio.png'; // Placeholder para servicios sin media
      }

      return {
        id: raw.id || '',
        type,
        score: 0,
        createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt ?? Date.now()),
        title: raw.titulo,
        descriptionShort: raw.descripcion[0]?.slice(0, 100) || '',
        imageUrl: imageUrlService,
        businessSlug: raw.negocio?.slug || '',
        isFollowed: false,
        data: {
          id: raw.id,
          titulo: raw.titulo,
          descripcion: raw.descripcion,
          slug: raw.slug,
          precio: raw.precio,
          currency: raw.currency,
          status: raw.status,
          tags: raw.tags,
          multimedia: raw.multimedia || [], // Array vacío si undefined
          negocioId: raw.negocio.id,
          negocioSlug: raw.negocio.slug,
          nombreNegocio: raw.negocio.nombre,
          telefonoNegocio: raw.negocio.telefonoContacto || '',
          negocioFotoPerfil: raw.negocio.fotoPerfil || 'imgs/admin-avatar.webp',
        } as ServicioData,
        price: raw.precio || 0,
        status: raw.status,
      };
    case 'business':
      if (!isRawBusiness(raw)) throw new Error('Raw no matcha Business');
      
      // Para negocios: fotoPerfil es string directo, pero agregar guard opcional por consistencia
      const imageUrlBusiness = raw.fotoPerfil || '/imgs/placeholder-negocio.png';

      return {
        id: raw.id,
        type,
        score: 0,
        createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
        title: raw.nombre,
        descriptionShort: raw.descripcion ? raw.descripcion.slice(0, 100) : '',
        imageUrl: imageUrlBusiness,
        businessSlug: raw.slug,
        isFollowed: false,
        data: {
          id: raw.id,
          nombre: raw.nombre,
          slug: raw.slug,
          negocioId: raw.id,
          descripcion: raw.descripcion,
          ciudad: raw.ciudad,
          departamento: raw.departamento,
          imagenPerfil: raw.fotoPerfil,
          imagenPortada: raw.fotoPortada,
          telefonoContacto: raw.telefonoContacto,
          urlGoogleMaps: raw.urlGoogleMaps,
          categorias: raw.categorias ? raw.categorias.map(c => c.category.slug) : [], // Guard para map
          secciones: raw.secciones ? raw.secciones.map(s => s.section.id) : [], // Similar
          estado: raw.estado,
          createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
        } as BusinessCardData,
        status: raw.estado,
      };
    default:
      throw new Error(`Unknown FeedItemType: ${type}`);
  }
}