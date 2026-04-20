"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  UpdateCatalogGroupInput,
  CatalogGroupResponse,
} from "@/interfaces/catalogGroup.interface";

/**
 * Actualiza un grupo de catálogo
 * Solo puede actualizar grupos propios
 */
export async function updateCatalogGroup(
  groupId: string,
  input: UpdateCatalogGroupInput
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

    // Verificar que el grupo pertenece al negocio
    const existingGroup = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true, slug: true },
    });

    if (!existingGroup) {
      return {
        ok: false,
        message: "Grupo no encontrado",
      };
    }

    if (existingGroup.negocioId !== usuario.negocio.id) {
      return {
        ok: false,
        message: "No tienes permiso para actualizar este grupo",
      };
    }

    // Preparar data a actualizar
    const updateData: Prisma.CatalogGroupUncheckedUpdateInput = {};

    if (input.nombre) {
      updateData.nombre = input.nombre.trim();
    }

    if (input.slug) {
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

      // Verificar que el nuevo slug sea único (excepto el del grupo actual)
      if (normalizedSlug !== existingGroup.slug) {
        const conflictingGroup = await prisma.catalogGroup.findFirst({
          where: {
            negocioId: usuario.negocio.id,
            slug: normalizedSlug,
            id: { not: groupId },
          },
        });

        if (conflictingGroup) {
          return {
            ok: false,
            message: "Ya existe otro grupo con ese slug",
          };
        }
      }

      updateData.slug = normalizedSlug;
    }

    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }

    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    if (input.order !== undefined) {
      updateData.order = input.order;
    }

    // Validar parentId si se proporciona
    if (input.parentId !== undefined) {
      if (input.parentId) {
        const parentGroup = await prisma.catalogGroup.findUnique({
          where: { id: input.parentId },
          select: { negocioId: true, id: true },
        });

        if (!parentGroup) {
          return {
            ok: false,
            message: "Grupo padre no encontrado",
          };
        }

        if (parentGroup.negocioId !== usuario.negocio.id) {
          return {
            ok: false,
            message: "El grupo padre no pertenece a tu negocio",
          };
        }

        // Evitar que un grupo sea padre de sí mismo
        if (parentGroup.id === groupId) {
          return {
            ok: false,
            message: "Un grupo no puede ser padre de sí mismo",
          };
        }
      }

      updateData.parentId = input.parentId || null;
    }

    if (Object.keys(updateData).length === 0) {
      return {
        ok: true,
        message: "No hay cambios para actualizar",
      };
    }

    // Actualizar
    const catalogGroup = await prisma.catalogGroup.update({
      where: { id: groupId },
      data: updateData,
    });

    return {
      ok: true,
      message: "Grupo actualizado exitosamente",
      catalogGroup,
    };
  } catch (error) {
    console.error("Error en updateCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al actualizar grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Elimina un grupo de catálogo y todos sus productos asociados
 * Si el grupo tiene hijos, los desvincula (pone parentId en null)
 */
export async function deleteCatalogGroup(groupId: string): Promise<CatalogGroupResponse> {
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

    // Verificar que el grupo pertenece al negocio
    const existingGroup = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true },
    });

    if (!existingGroup) {
      return {
        ok: false,
        message: "Grupo no encontrado",
      };
    }

    if (existingGroup.negocioId !== usuario.negocio.id) {
      return {
        ok: false,
        message: "No tienes permiso para eliminar este grupo",
      };
    }

    // Usar transacción para garantizar consistencia
    await prisma.$transaction(async (tx) => {
      // Desvinc hijos (poner parentId en null)
      await tx.catalogGroup.updateMany({
        where: { parentId: groupId },
        data: { parentId: null },
      });

      // Eliminar asignaciones de productos
      await tx.catalogGroupProduct.deleteMany({
        where: { catalogGroupId: groupId },
      });

      // Eliminar el grupo
      await tx.catalogGroup.delete({
        where: { id: groupId },
      });
    });

    return {
      ok: true,
      message: "Grupo eliminado exitosamente",
    };
  } catch (error) {
    console.error("Error en deleteCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al eliminar grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
