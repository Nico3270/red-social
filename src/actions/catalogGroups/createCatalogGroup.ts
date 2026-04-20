"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  CreateCatalogGroupInput,
  CatalogGroupResponse,
} from "@/interfaces/catalogGroup.interface";

/**
 * Crea un nuevo grupo de catálogo para el negocio del usuario autenticado
 * 
 * Validaciones:
 * - Usuario debe estar autenticado
 * - El slug debe ser único dentro del negocio
 * - Si hay parentId, debe pertenecer al mismo negocio
 * - Sin validar parentId si es jerarquía inválida (eso lo valida DB)
 */
export async function createCatalogGroup(
  input: CreateCatalogGroupInput
): Promise<CatalogGroupResponse> {
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

    // Validaciones del input
    if (!input.nombre || input.nombre.trim().length === 0) {
      return {
        ok: false,
        message: "El nombre del grupo es requerido",
      };
    }

    if (!input.slug || input.slug.trim().length === 0) {
      return {
        ok: false,
        message: "El slug es requerido",
      };
    }

    // Normalizar slug
    const normalizedSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (normalizedSlug.length === 0) {
      return {
        ok: false,
        message: "El slug debe contener caracteres válidos",
      };
    }

    // Verificar que el slug sea único en este negocio
    const existingGroup = await prisma.catalogGroup.findFirst({
      where: {
        negocioId,
        slug: normalizedSlug,
      },
    });

    if (existingGroup) {
      return {
        ok: false,
        message: "Ya existe un grupo con ese slug en tu negocio",
      };
    }

    // Si hay parentId, validar que pertenece al mismo negocio
    if (input.parentId) {
      const parentGroup = await prisma.catalogGroup.findUnique({
        where: { id: input.parentId },
        select: { negocioId: true },
      });

      if (!parentGroup) {
        return {
          ok: false,
          message: "Grupo padre no encontrado",
        };
      }

      if (parentGroup.negocioId !== negocioId) {
        return {
          ok: false,
          message: "El grupo padre no pertenece a tu negocio",
        };
      }
    }

    // Obtener el próximo order disponible si no se especifica
    let order = input.order ?? 0;
    if (order === 0) {
      const lastGroup = await prisma.catalogGroup.findFirst({
        where: { negocioId, parentId: input.parentId || null },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (lastGroup?.order ?? -1) + 1;
    }

    // Crear el grupo
    const catalogGroup = await prisma.catalogGroup.create({
      data: {
        negocioId,
        nombre: input.nombre.trim(),
        slug: normalizedSlug,
        parentId: input.parentId || null,
        order,
        isActive: true,
        description: input.description?.trim() || null,
      },
    });

    return {
      ok: true,
      message: "Grupo de catálogo creado exitosamente",
      catalogGroup,
    };
  } catch (error) {
    console.error("Error en createCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al crear grupo de catálogo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
