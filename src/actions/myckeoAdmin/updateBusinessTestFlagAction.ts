"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export interface UpdateBusinessTestFlagActionInput {
  businessId: string;
  isTestData: boolean;
}

export interface UpdateBusinessTestFlagActionResult {
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
  return `update-business-test-flag-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBusinessId(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateBusinessTestFlagAction(
  input: UpdateBusinessTestFlagActionInput
): Promise<UpdateBusinessTestFlagActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`[updateBusinessTestFlagAction][${traceId}] Sesión no válida`);
      return {
        ok: false,
        message: "No autorizado.",
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(
        `[updateBusinessTestFlagAction][${traceId}] Acceso denegado por rol`,
        {
          userId: session.user.id,
          role: session.user.role,
        }
      );

      return {
        ok: false,
        message: "No tienes permisos para modificar este negocio.",
        data: null,
        error: "No tienes permisos para modificar este negocio.",
      };
    }

    const businessId = normalizeBusinessId(input.businessId);

    if (!businessId) {
      console.warn(
        `[updateBusinessTestFlagAction][${traceId}] businessId inválido`
      );

      return {
        ok: false,
        message: "El identificador del negocio es obligatorio.",
        data: null,
        error: "El identificador del negocio es obligatorio.",
      };
    }

    if (typeof input.isTestData !== "boolean") {
      console.warn(
        `[updateBusinessTestFlagAction][${traceId}] isTestData inválido`,
        {
          businessId,
          receivedType: typeof input.isTestData,
        }
      );

      return {
        ok: false,
        message: "El valor de prueba debe ser booleano.",
        data: null,
        error: "El valor de prueba debe ser booleano.",
      };
    }

    console.info(`[updateBusinessTestFlagAction][${traceId}] Inicio`, {
      businessId,
      nextIsTestData: input.isTestData,
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
        `[updateBusinessTestFlagAction][${traceId}] Negocio no encontrado`,
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

    if (existingBusiness.isTestData === input.isTestData) {
      console.info(
        `[updateBusinessTestFlagAction][${traceId}] Sin cambios necesarios`,
        {
          businessId,
          currentIsTestData: existingBusiness.isTestData,
        }
      );

      return {
        ok: true,
        message: input.isTestData
          ? "El negocio ya estaba marcado como test."
          : "El negocio ya estaba marcado como real.",
        data: existingBusiness,
        error: null,
      };
    }

    const updatedBusiness = await prisma.negocio.update({
      where: {
        id: businessId,
      },
      data: {
        isTestData: input.isTestData,
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

    console.info(`[updateBusinessTestFlagAction][${traceId}] Update OK`, {
      businessId: updatedBusiness.id,
      nombre: updatedBusiness.nombre,
      previousIsTestData: existingBusiness.isTestData,
      nextIsTestData: updatedBusiness.isTestData,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message: updatedBusiness.isTestData
        ? "Negocio marcado como test correctamente."
        : "Negocio marcado como real correctamente.",
      data: updatedBusiness,
      error: null,
    };
  } catch (error) {
    console.error(
      `[updateBusinessTestFlagAction][${traceId}] Error inesperado`,
      {
        error,
        elapsedMs: Date.now() - startedAt,
      }
    );

    return {
      ok: false,
      message: "No fue posible actualizar el tipo del negocio.",
      data: null,
      error: "No fue posible actualizar el tipo del negocio.",
    };
  }
}