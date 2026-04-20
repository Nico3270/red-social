"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export interface AvailableProduct {
  id: string;
  nombre: string;
  slug: string;
  descripcionCorta?: string | null;
  precio: number;
  status: string;
  imagenes: Array<{ url: string }>;
  isAssignedToGroup: boolean;
}

export interface GetAvailableProductsResponse {
  ok: boolean;
  message: string;
  products?: AvailableProduct[];
  total?: number;
  error?: string;
}

/**
 * Obtiene productos disponibles del negocio actual para asignar a grupos
 * 
 * Validaciones:
 * - Usuario debe estar autenticado
 * - Solo devuelve productos del negocio autenticado
 * - Permite búsqueda por nombre
 * - Indica si cada producto ya está asignado al grupo especificado
 */
export async function getAvailableProducts(
  groupId: string,
  searchQuery?: string,
  take: number = 50,
  skip: number = 0
): Promise<GetAvailableProductsResponse> {
  try {
    // Validar sesión
    const session = await auth();
    if (!session?.user?.id) {
      return {
        ok: false,
        message: "No estás autenticado",
      };
    }

    // Obtener negocio del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true } } },
    });

    if (!usuario?.negocio) {
      return {
        ok: false,
        message: "No tienes un negocio asociado",
      };
    }

    const negocioId = usuario.negocio.id;

    // Validar que el grupo pertenece al negocio
    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true, id: true },
    });

    if (!group || group.negocioId !== negocioId) {
      return {
        ok: false,
        message: "Grupo no encontrado o no pertenece a tu negocio",
      };
    }

    // Construir filtro de búsqueda
    const searchFilter = searchQuery
      ? {
          nombre: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        }
      : {};

    // Obtener todos los productos del negocio
    const products = await prisma.product.findMany({
      where: {
        negocioId,
        status: "disponible", // Solo productos disponibles
        ...searchFilter,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        descripcionCorta: true,
        precio: true,
        status: true,
        imagenes: {
          select: { url: true },
          take: 1,
        },
        catalogGroupProducts: {
          where: { catalogGroupId: groupId },
          select: { id: true },
        },
      },
      orderBy: { nombre: "asc" },
      take,
      skip,
    });

    // Transformar respuesta
    const mappedProducts: AvailableProduct[] = products.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      descripcionCorta: p.descripcionCorta,
      precio: p.precio,
      status: p.status,
      imagenes: p.imagenes,
      isAssignedToGroup: p.catalogGroupProducts.length > 0,
    }));

    return {
      ok: true,
      message: "Productos obtenidos exitosamente",
      products: mappedProducts,
      total: mappedProducts.length,
    };
  } catch (error) {
    console.error("Error en getAvailableProducts:", error);
    return {
      ok: false,
      message: "Error al obtener productos",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
