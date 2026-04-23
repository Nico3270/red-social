"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export interface AdminProductCreationBusiness {
  id: string;
  nombre: string;
  slug: string | null;
  descripcion: string | null;
  estado: string;
  isTestData: boolean;
  archivedAt: string | null;
}

export interface GetBusinessesForProductCreationActionInput {
  limit?: number;
}

export interface GetBusinessesForProductCreationActionResult {
  ok: boolean;
  data: {
    items: AdminProductCreationBusiness[];
    totalReturned: number;
    limit: number;
    truncated: boolean;
  } | null;
  error: string | null;
}

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function normalizeLimit(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

function buildTraceId() {
  return `get-businesses-for-product-creation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function getBusinessesForProductCreationAction(
  input: GetBusinessesForProductCreationActionInput = {}
): Promise<GetBusinessesForProductCreationActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(
        `[getBusinessesForProductCreationAction][${traceId}] Sesión no válida`
      );

      return {
        ok: false,
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(
        `[getBusinessesForProductCreationAction][${traceId}] Acceso denegado`,
        {
          userId: session.user.id,
          role: session.user.role,
        }
      );

      return {
        ok: false,
        data: null,
        error: "No tienes permisos para consultar negocios para este flujo.",
      };
    }

    const limit = normalizeLimit(input.limit);

    const items = await prisma.negocio.findMany({
      orderBy: [{ nombre: "asc" }, { createdAt: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        nombre: true,
        slug: true,
        descripcion: true,
        estado: true,
        isTestData: true,
        archivedAt: true,
      },
    });

    const truncated = items.length > limit;
    const returnedItems = (truncated ? items.slice(0, limit) : items).map(
      (business) => ({
        ...business,
        archivedAt: business.archivedAt?.toISOString() ?? null,
      })
    );

    console.info(
      `[getBusinessesForProductCreationAction][${traceId}] Consulta OK`,
      {
        actorUserId: session.user.id,
        returnedItems: returnedItems.length,
        truncated,
        elapsedMs: Date.now() - startedAt,
      }
    );

    return {
      ok: true,
      data: {
        items: returnedItems,
        totalReturned: returnedItems.length,
        limit,
        truncated,
      },
      error: null,
    };
  } catch (error) {
    console.error(
      `[getBusinessesForProductCreationAction][${traceId}] Error inesperado`,
      {
        error,
        elapsedMs: Date.now() - startedAt,
      }
    );

    return {
      ok: false,
      data: null,
      error: "No fue posible obtener los negocios para crear productos.",
    };
  }
}
