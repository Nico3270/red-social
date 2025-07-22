

import prisma from "@/lib/prisma";
import { EstadoNegocio } from "@prisma/client";

interface InformacionInicialNegocio {
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

interface DatosPerfilNegocio {
  ok: boolean;
  message: string;
  negocio?: InformacionInicialNegocio;
}

export const getInfoPerfilBySlugNegocio = async (slugNegocio: string):Promise<DatosPerfilNegocio> => {
  console.log("Datos de negocio");
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
      } as DatosPerfilNegocio;
    }
    
    console.log("Se encontro negocio");
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
          }, // 👈 Cierre correcto del select de negocio
        },
      }, // 👈 Cierre correcto del select general
    }); // 👈 Cierre correcto de findUnique

    // Verificar si se encontró el negocio
    if (!result || !result.negocio) {
      return {
        ok: false,
        message: "Negocio no encontrado",
      } as DatosPerfilNegocio;
    }


    // Transformar los datos del negocio para que cumplan con la interface InformacionInicialNegocio
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
    }
    return {
      ok: true,
      message: "Perfil del negocio editado correctamente",
      negocio: negocioFormateado,
    } as DatosPerfilNegocio;

  } catch (error) {
    console.error("Error al editar el perfil del negocio:", error);
    return {
      ok: false,
      message: "Error al editar el perfil del negocio",
    } as DatosPerfilNegocio;
  }
};

