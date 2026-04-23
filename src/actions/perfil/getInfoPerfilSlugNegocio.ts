// src/types/api.ts
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { PublicacionTipo } from "@prisma/client";
import { EstadoNegocio } from "@prisma/client";
import { buildPublicBusinessBySlugWhere } from "@/lib/business/publicBusinessVisibility";
import { reportOperationalError } from "@/lib/observability/operationalLogger";
import prisma from "@/lib/prisma";

export interface ProductosNegocioBySlug {
  ok: boolean;
  products?: ProductRedSocial[];
  message?: string;
}

export interface PublicacionesResult {
  ok: boolean;
  message: string;
  publicaciones: EnhancedPublicacion[];
}

export interface PublicacionesNegocioProps {
  slug: string;
  tipo?: PublicacionTipo;
  skip?: number;
  take?: number;
  userId?: string; // ID del usuario autenticado para verificar reacciones
}

export interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
  descripcionNegocio: string;
  telefonoNegocio: string;
  ciudadNegocio: string;
  departamentoNegocio: string;
  direccionNegocio?: string;
  telefonoContacto?: string;
  imagenPerfil?: string;
  imagenPortada?: string;
  sitioWeb?: string;
  urlGoogleMaps?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  latitudNegocio: number;
  longitudNegocio: number;
  categoriaIds: string[];
  seccionesIds: string[];
  estadoNegocio: EstadoNegocio;
  configReservation: boolean; // Indica si el negocio tiene reservas configuradas
  configEncuestas: boolean; // Indica si el negocio tiene encuestas configuradas
  negocioId:string
}

export interface DatosPerfilNegocio {
  ok: boolean;
  message: string;
  negocio?: InformacionInicialNegocio;
}


export const getInfoPerfilBySlugNegocio = async (slugNegocio: string): Promise<DatosPerfilNegocio> => {
  try {
    const negocio = await prisma.negocio.findFirst({
      where: buildPublicBusinessBySlugWhere(slugNegocio),
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const result = await prisma.usuario.findUnique({
      where: {
        id: negocio.usuarioId,
      },
      select: {
        id: true,
        facebook: true,
        instagram: true,
        twitter: true,
        tiktok: true,
        youtube: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            descripcion: true,
            ciudad: true,
            departamento: true,
            direccion: true,
            telefonoContacto: true,
            fotoPerfil: true,
            fotoPortada: true,
            sitioWeb: true,
            urlGoogleMaps: true,
            latitud: true,
            longitud: true,
            secciones: {
              select: {
                sectionId: true,
              },
            },
            categorias: {
              select: {
                categoryId: true,
              },
            },
            estado: true,
          },
        },
      },
    });

    if (!result || !result.negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const negocioId = result.negocio.id;
    let configReservation = false;
    const availabilityCount = await prisma.businessAvailability.count({
      where: { negocioId },
    });
    configReservation = availabilityCount > 0;

    let configEncuestas = false;
    const encuestaCount = await prisma.encuesta.count({
      where: { negocioId },
    });
    configEncuestas = encuestaCount > 0;


    const negocioFormateado: InformacionInicialNegocio = {
      nombreNegocio: result.negocio.nombre || "",
      slugNegocio: result.negocio.slug || "",
      descripcionNegocio: result.negocio.descripcion || "",
      telefonoNegocio: result.negocio.telefonoContacto || "",
      ciudadNegocio: result.negocio.ciudad || "",
      departamentoNegocio: result.negocio.departamento || "",
      direccionNegocio: result.negocio.direccion || "",
      telefonoContacto: result.negocio.telefonoContacto || "",
      imagenPerfil: result.negocio.fotoPerfil || "",
      imagenPortada: result.negocio.fotoPortada || "",
      sitioWeb: result.negocio.sitioWeb || "",
      urlGoogleMaps: result.negocio.urlGoogleMaps || "",
      facebook: result.facebook || "",
      instagram: result.instagram || "",
      twitter: result.twitter || "",
      tiktok: result.tiktok || "",
      youtube: result.youtube || "",
      latitudNegocio: result.negocio.latitud || 4.710839303719267,
      longitudNegocio: result.negocio.longitud || -74.07215437301636,
      categoriaIds: result.negocio.categorias.map((categoria) => categoria.categoryId) || [],
      seccionesIds: result.negocio.secciones.map((seccion) => seccion.sectionId) || [],
      estadoNegocio: result.negocio.estado || EstadoNegocio.activo,
      configReservation, 
      configEncuestas,
      negocioId: result.negocio.id
    };

    return {
      ok: true,
      message: "Perfil del negocio obtenido correctamente",
      negocio: negocioFormateado,
    };
  } catch (error) {
    reportOperationalError({
      area: "public-profile",
      event: "profile_business_query_failed",
      message: "Fallo la carga del perfil publico del negocio.",
      context: { slugNegocio },
      error,
      dedupeKey: `profile-business-query-failed:${slugNegocio}`,
    });

    return {
      ok: false,
      message: "Error al obtener el perfil del negocio",
    };
  }
};
