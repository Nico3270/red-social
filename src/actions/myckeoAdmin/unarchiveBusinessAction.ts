"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export interface UnarchiveBusinessActionInput {
  businessId: string;
}

export interface UnarchiveBusinessActionResult {
  ok: boolean;
  message: string;
  data: {
    id: string;
    nombre: string;
    slug: string | null;
    estado: string;
    isTestData: boolean;
    archivedAt: Date | null;
    updatedAt: Date;
  } | null;
  error: string | null;
}

function buildTraceId(): string {
  return `unarchive-business-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBusinessId(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function unarchiveBusinessAction(
  input: UnarchiveBusinessActionInput
): Promise<UnarchiveBusinessActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`[unarchiveBusinessAction][${traceId}] Sesión no válida`);

      return {
        ok: false,
        message: "No autorizado.",
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`[unarchiveBusinessAction][${traceId}] Acceso denegado por rol`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        message: "No tienes permisos para desarchivar este negocio.",
        data: null,
        error: "No tienes permisos para desarchivar este negocio.",
      };
    }

    const businessId = normalizeBusinessId(input.businessId);

    if (!businessId) {
      console.warn(`[unarchiveBusinessAction][${traceId}] businessId inválido`);

      return {
        ok: false,
        message: "El identificador del negocio es obligatorio.",
        data: null,
        error: "El identificador del negocio es obligatorio.",
      };
    }

    console.info(`[unarchiveBusinessAction][${traceId}] Inicio`, {
      businessId,
      actorUserId: session.user.id,
    });

    const existingBusiness = await prisma.negocio.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        isTestData: true,
        archivedAt: true,
        updatedAt: true,
      },
    });

    if (!existingBusiness) {
      console.warn(
        `[unarchiveBusinessAction][${traceId}] Negocio no encontrado`,
        {
          businessId,
        }
      );

      return {
        ok: false,
        message: "El negocio no existe o ya no está disponible.",
        data: null,
        error: "El negocio no existe o ya no está disponible.",
      };
    }

    if (!existingBusiness.archivedAt) {
      console.info(
        `[unarchiveBusinessAction][${traceId}] El negocio no estaba archivado`,
        {
          businessId,
        }
      );

      return {
        ok: true,
        message: "El negocio ya estaba activo o no estaba archivado.",
        data: existingBusiness,
        error: null,
      };
    }

    const updatedBusiness = await prisma.negocio.update({
      where: {
        id: businessId,
      },
      data: {
        archivedAt: null,
        ...(existingBusiness.estado === "eliminado" ? { estado: "activo" } : {}),
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        isTestData: true,
        archivedAt: true,
        updatedAt: true,
      },
    });

    console.info(`[unarchiveBusinessAction][${traceId}] Desarchivo OK`, {
      businessId: updatedBusiness.id,
      nombre: updatedBusiness.nombre,
      previousEstado: existingBusiness.estado,
      nextEstado: updatedBusiness.estado,
      previousArchivedAt: existingBusiness.archivedAt,
      nextArchivedAt: updatedBusiness.archivedAt,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message: "Negocio desarchivado correctamente.",
      data: updatedBusiness,
      error: null,
    };
  } catch (error) {
    console.error(`[unarchiveBusinessAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      message: "No fue posible desarchivar el negocio.",
      data: null,
      error: "No fue posible desarchivar el negocio.",
    };
  }
}