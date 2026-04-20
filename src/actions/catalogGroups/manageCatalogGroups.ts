"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { CatalogGroupResponse } from "@/interfaces/catalogGroup.interface";

/**
 * Reordena un grupo dentro de su nivel (entre hermanos)
 */
export async function reorderCatalogGroup(
  groupId: string,
  newOrder: number
): Promise<CatalogGroupResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true, parentId: true },
    });

    if (!group) {
      return { ok: false, message: "Grupo no encontrado" };
    }

    if (group.negocioId !== usuario.negocio.id) {
      return { ok: false, message: "No tienes permiso para reordenar este grupo" };
    }

    const updatedGroup = await prisma.catalogGroup.update({
      where: { id: groupId },
      data: { order: newOrder },
    });

    return {
      ok: true,
      message: "Grupo reordenado exitosamente",
      catalogGroup: updatedGroup,
    };
  } catch (error) {
    console.error("Error en reorderCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al reordenar grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Mueve un grupo a un nuevo padre
 */
export async function moveCatalogGroup(
  groupId: string,
  newParentId: string | null
): Promise<CatalogGroupResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true },
    });

    if (!group) {
      return { ok: false, message: "Grupo no encontrado" };
    }

    if (group.negocioId !== usuario.negocio.id) {
      return { ok: false, message: "No tienes permiso para mover este grupo" };
    }

    // Un grupo no puede ser padre de sí mismo
    if (newParentId === groupId) {
      return { ok: false, message: "Un grupo no puede ser padre de sí mismo" };
    }

    // Si hay nuevo padre, validar que pertenence al mismo negocio
    if (newParentId) {
      const newParent = await prisma.catalogGroup.findUnique({
        where: { id: newParentId },
        select: { negocioId: true },
      });

      if (!newParent) {
        return { ok: false, message: "Nuevo padre no encontrado" };
      }

      if (newParent.negocioId !== usuario.negocio.id) {
        return {
          ok: false,
          message: "El nuevo padre no pertenece a tu negocio",
        };
      }
    }

    const updatedGroup = await prisma.catalogGroup.update({
      where: { id: groupId },
      data: { parentId: newParentId },
    });

    return {
      ok: true,
      message: "Grupo movido exitosamente",
      catalogGroup: updatedGroup,
    };
  } catch (error) {
    console.error("Error en moveCatalogGroup:", error);
    return {
      ok: false,
      message: "Error al mover grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Alterna el estado activo/inactivo de un grupo
 */
export async function toggleCatalogGroupActive(
  groupId: string,
  isActive: boolean
): Promise<CatalogGroupResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, message: "No estás autenticado" };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { negocio: { select: { id: true } } },
    });

    if (!usuario?.negocio) {
      return { ok: false, message: "No tienes un negocio asociado" };
    }

    const group = await prisma.catalogGroup.findUnique({
      where: { id: groupId },
      select: { negocioId: true },
    });

    if (!group) {
      return { ok: false, message: "Grupo no encontrado" };
    }

    if (group.negocioId !== usuario.negocio.id) {
      return { ok: false, message: "No tienes permiso para cambiar este grupo" };
    }

    const updatedGroup = await prisma.catalogGroup.update({
      where: { id: groupId },
      data: { isActive },
    });

    return {
      ok: true,
      message: `Grupo ${isActive ? "activado" : "desactivado"} exitosamente`,
      catalogGroup: updatedGroup,
    };
  } catch (error) {
    console.error("Error en toggleCatalogGroupActive:", error);
    return {
      ok: false,
      message: "Error al cambiar estado del grupo",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
