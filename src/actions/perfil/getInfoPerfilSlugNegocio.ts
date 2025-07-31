// src/types/api.ts
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { PublicacionTipo } from "@prisma/client";
import { EstadoNegocio } from "@prisma/client";
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
}

export interface DatosPerfilNegocio {
  ok: boolean;
  message: string;
  negocio?: InformacionInicialNegocio;
}


export const getInfoPerfilBySlugNegocio = async (slugNegocio: string): Promise<DatosPerfilNegocio> => {
  try {
    const usuarioId = await prisma.negocio.findUnique({
      where: {
        slug: slugNegocio,
      },
      select: {
        usuarioId: true,
      },
    });

    if (!usuarioId) {
      return {
        ok: false,
        message: "Negocio no encontrado",
      };
    }

    const result = await prisma.usuario.findUnique({
      where: {
        id: usuarioId.usuarioId,
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
    };

    return {
      ok: true,
      message: "Perfil del negocio obtenido correctamente",
      negocio: negocioFormateado,
    };
  } catch (error) {
    console.error("Error al obtener el perfil del negocio:", error);
    return {
      ok: false,
      message: "Error al obtener el perfil del negocio",
    };
  }
};