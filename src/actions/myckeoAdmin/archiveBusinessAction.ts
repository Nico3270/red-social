"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export interface ArchiveBusinessActionInput {
  businessId: string;
}

export interface ArchiveBusinessActionResult {
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
  return `archive-business-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBusinessId(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function archiveBusinessAction(
  input: ArchiveBusinessActionInput
): Promise<ArchiveBusinessActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`[archiveBusinessAction][${traceId}] Sesión no válida`);

      return {
        ok: false,
        message: "No autorizado.",
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`[archiveBusinessAction][${traceId}] Acceso denegado por rol`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        message: "No tienes permisos para archivar este negocio.",
        data: null,
        error: "No tienes permisos para archivar este negocio.",
      };
    }

    const businessId = normalizeBusinessId(input.businessId);

    if (!businessId) {
      console.warn(`[archiveBusinessAction][${traceId}] businessId inválido`);

      return {
        ok: false,
        message: "El identificador del negocio es obligatorio.",
        data: null,
        error: "El identificador del negocio es obligatorio.",
      };
    }

    console.info(`[archiveBusinessAction][${traceId}] Inicio`, {
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
      console.warn(`[archiveBusinessAction][${traceId}] Negocio no encontrado`, {
        businessId,
      });

      return {
        ok: false,
        message: "El negocio no existe o ya no está disponible.",
        data: null,
        error: "El negocio no existe o ya no está disponible.",
      };
    }

    if (existingBusiness.archivedAt) {
      console.info(
        `[archiveBusinessAction][${traceId}] El negocio ya estaba archivado`,
        {
          businessId,
          archivedAt: existingBusiness.archivedAt,
        }
      );

      return {
        ok: true,
        message: "El negocio ya estaba archivado.",
        data: existingBusiness,
        error: null,
      };
    }

    const now = new Date();

    const updatedBusiness = await prisma.negocio.update({
      where: {
        id: businessId,
      },
      data: {
        archivedAt: now,
        ...(existingBusiness.estado !== "eliminado" ? { estado: "eliminado" } : {}),
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

    console.info(`[archiveBusinessAction][${traceId}] Archivo OK`, {
      businessId: updatedBusiness.id,
      nombre: updatedBusiness.nombre,
      previousEstado: existingBusiness.estado,
      nextEstado: updatedBusiness.estado,
      archivedAt: updatedBusiness.archivedAt,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message: "Negocio archivado correctamente.",
      data: updatedBusiness,
      error: null,
    };
  } catch (error) {
    console.error(`[archiveBusinessAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      message: "No fue posible archivar el negocio.",
      data: null,
      error: "No fue posible archivar el negocio.",
    };
  }
}