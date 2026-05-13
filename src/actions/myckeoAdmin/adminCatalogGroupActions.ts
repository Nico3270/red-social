"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  buildSlugBase,
  generateShortSlugSuffix,
  hasShortSlugSuffix,
  normalizeUrlSlug,
  withShortSlugSuffix,
} from "@/lib/slug/slugUtils";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

export type AdminCatalogGroupMutationGroup = {
  id: string;
  negocioId: string;
  nombre: string;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAdminCatalogGroupActionInput = {
  businessId: string;
  expectedSlug: string;
  input: {
    nombre: string;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
  };
};

export type UpdateAdminCatalogGroupActionInput = {
  businessId: string;
  expectedSlug: string;
  groupId: string;
  input: {
    nombre?: string;
    description?: string | null;
    isActive?: boolean;
  };
};

export type ToggleAdminCatalogGroupActiveActionInput = {
  businessId: string;
  expectedSlug: string;
  groupId: string;
  isActive: boolean;
};

export type ReorderAdminCatalogGroupsActionInput = {
  businessId: string;
  expectedSlug: string;
  parentId: string | null;
  orderedGroupIds: string[];
};

export type AdminCatalogGroupActionResult =
  | {
      ok: true;
      group: AdminCatalogGroupMutationGroup;
    }
  | {
      ok: false;
      error: string;
    };

export type ReorderAdminCatalogGroupsActionResult =
  | {
      ok: true;
      groups: Array<{
        id: string;
        order: number;
      }>;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type AdminCatalogGroupActionErrorResult = Extract<
  AdminCatalogGroupActionResult,
  { ok: false }
>;

type BusinessContext = {
  id: string;
  slug: string;
};

type GroupContext = {
  id: string;
  negocioId: string;
  nombre: string;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const LOG_PREFIX = "[adminCatalogGroupActions]";
const MAX_SLUG_ATTEMPTS = 40;

function buildTraceId(action: string) {
  return `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRequiredString(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: string | null | undefined) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined;
  return typeof value === "boolean" ? value : null;
}

function normalizeGroupIdList(value: unknown) {
  if (!Array.isArray(value)) return null;

  return value.map((entry) =>
    typeof entry === "string" ? normalizeRequiredString(entry) : ""
  );
}

function mapGroup(group: GroupContext): AdminCatalogGroupMutationGroup {
  return {
    id: group.id,
    negocioId: group.negocioId,
    nombre: group.nombre,
    slug: group.slug,
    parentId: group.parentId,
    order: group.order,
    isActive: group.isActive,
    description: group.description,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function revalidateAdminCatalogGroupSurfaces(businessSlug: string) {
  if (!businessSlug) return;

  revalidatePath("/myckeoAdmin/negocios");
  revalidatePath(`/myckeoAdmin/organizar/${businessSlug}`);
  revalidatePath(`/perfil/${businessSlug}`);
  revalidateTag(`negocio-catalog-${businessSlug}`);
}

function controlledError(
  action: string,
  traceId: string,
  actorUserId: string | null,
  details: {
    businessId?: string;
    expectedSlug?: string;
    groupId?: string;
    reason: string;
  },
  error: string
): AdminCatalogGroupActionErrorResult {
  console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
    action,
    actorUserId,
    businessId: details.businessId,
    expectedSlug: details.expectedSlug,
    groupId: details.groupId,
    reason: details.reason,
  });

  return {
    ok: false,
    error,
  };
}

async function resolveAdminBusinessContext(args: {
  action: string;
  traceId: string;
  actorUserId: string;
  businessId: string;
  expectedSlug: string;
}): Promise<BusinessContext | AdminCatalogGroupActionErrorResult> {
  const businessId = normalizeRequiredString(args.businessId);
  const expectedSlug = normalizeRequiredString(args.expectedSlug);

  if (!businessId || !expectedSlug) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "missing_business_identifiers",
      },
      "El identificador del negocio y el slug esperado son obligatorios."
    );
  }

  const business = await prisma.negocio.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "business_not_found",
      },
      "El negocio no existe o ya no esta disponible."
    );
  }

  if (business.slug !== expectedSlug) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId,
        expectedSlug,
        reason: "business_slug_mismatch",
      },
      "El slug esperado no coincide con el negocio seleccionado. Recarga la vista antes de continuar."
    );
  }

  return business;
}

async function resolveGroupContext(args: {
  action: string;
  traceId: string;
  actorUserId: string;
  businessId: string;
  expectedSlug: string;
  groupId: string;
}): Promise<GroupContext | AdminCatalogGroupActionErrorResult> {
  const groupId = normalizeRequiredString(args.groupId);

  if (!groupId) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "missing_group_id",
      },
      "El identificador del grupo es obligatorio."
    );
  }

  const group = await prisma.catalogGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      negocioId: true,
      nombre: true,
      slug: true,
      parentId: true,
      order: true,
      isActive: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!group) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "group_not_found",
      },
      "El grupo no existe o ya no esta disponible."
    );
  }

  if (group.negocioId !== args.businessId) {
    return controlledError(
      args.action,
      args.traceId,
      args.actorUserId,
      {
        businessId: args.businessId,
        expectedSlug: args.expectedSlug,
        groupId,
        reason: "group_business_mismatch",
      },
      "El grupo no pertenece al negocio seleccionado."
    );
  }

  return group;
}

async function buildUniqueCatalogGroupSlug(
  tx: Prisma.TransactionClient,
  negocioId: string,
  fallbackName: string
) {
  const baseSlug = buildSlugBase("", fallbackName);

  if (!baseSlug) {
    throw new Error("No fue posible construir un slug valido para el grupo.");
  }

  const baseWithoutExistingSuffix = hasShortSlugSuffix(baseSlug)
    ? baseSlug.slice(0, -5)
    : baseSlug;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 0
        ? withShortSlugSuffix(baseSlug)
        : `${normalizeUrlSlug(baseWithoutExistingSuffix, 135)}-${generateShortSlugSuffix()}`;

    const existingGroup = await tx.catalogGroup.findFirst({
      where: {
        negocioId,
        slug: candidate,
      },
      select: { id: true },
    });

    if (!existingGroup) {
      return candidate;
    }
  }

  return `${normalizeUrlSlug(baseSlug, 128)}-${Date.now().toString(36)}`;
}

export async function createAdminCatalogGroupAction(
  rawInput: CreateAdminCatalogGroupActionInput
): Promise<AdminCatalogGroupActionResult> {
  const action = "createAdminCatalogGroupAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para crear grupos de catalogo en esta vista."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const nombre = normalizeRequiredString(rawInput?.input?.nombre);
    const parentId = normalizeNullableString(rawInput?.input?.parentId) ?? null;
    const description = normalizeNullableString(rawInput?.input?.description);
    const normalizedIsActive = normalizeOptionalBoolean(rawInput?.input?.isActive);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId: null,
    });

    if (!nombre) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId,
          expectedSlug,
          reason: "missing_group_name",
        },
        "El nombre del grupo es obligatorio."
      );
    }

    if (normalizedIsActive === null) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId,
          expectedSlug,
          reason: "invalid_is_active",
        },
        "El estado activo del grupo no es valido."
      );
    }

    const isActive = normalizedIsActive ?? true;

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const createdGroup = await prisma.$transaction(async (tx) => {
      if (parentId) {
        const parentGroup = await tx.catalogGroup.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            negocioId: true,
          },
        });

        if (!parentGroup) {
          throw new Error("PARENT_NOT_FOUND");
        }

        if (parentGroup.negocioId !== businessResult.id) {
          throw new Error("PARENT_BUSINESS_MISMATCH");
        }
      }

      const slug = await buildUniqueCatalogGroupSlug(tx, businessResult.id, nombre);
      const lastSibling = await tx.catalogGroup.findFirst({
        where: {
          negocioId: businessResult.id,
          parentId,
        },
        orderBy: {
          order: "desc",
        },
        select: {
          order: true,
        },
      });

      const order = (lastSibling?.order ?? -1) + 1;

      return tx.catalogGroup.create({
        data: {
          negocioId: businessResult.id,
          nombre,
          slug,
          parentId,
          order,
          isActive,
          description: description ?? null,
        },
        select: {
          id: true,
          negocioId: true,
          nombre: true,
          slug: true,
          parentId: true,
          order: true,
          isActive: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    revalidateAdminCatalogGroupSurfaces(businessResult.slug);

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: createdGroup.id,
    });

    return {
      ok: true,
      group: mapGroup(createdGroup),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "PARENT_NOT_FOUND") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId: normalizeRequiredString(rawInput?.businessId),
          expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
          groupId: normalizeNullableString(rawInput?.input?.parentId) ?? undefined,
          reason: "parent_not_found",
        },
        "El grupo padre no existe o ya no esta disponible."
      );
    }

    if (error instanceof Error && error.message === "PARENT_BUSINESS_MISMATCH") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId: normalizeRequiredString(rawInput?.businessId),
          expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
          groupId: normalizeNullableString(rawInput?.input?.parentId) ?? undefined,
          reason: "parent_business_mismatch",
        },
        "El grupo padre no pertenece al negocio seleccionado."
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId: normalizeRequiredString(rawInput?.businessId),
          expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
          reason: "catalog_group_unique_constraint",
        },
        "No fue posible reservar un slug unico para el grupo. Intenta de nuevo."
      );
    }

    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: null,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible crear el grupo de catalogo en este momento.",
    };
  }
}

export async function updateAdminCatalogGroupAction(
  rawInput: UpdateAdminCatalogGroupActionInput
): Promise<AdminCatalogGroupActionResult> {
  const action = "updateAdminCatalogGroupAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para editar grupos de catalogo en esta vista."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const groupId = normalizeRequiredString(rawInput?.groupId);
    const normalizedIsActive = normalizeOptionalBoolean(rawInput?.input?.isActive);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId,
    });

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const groupResult = await resolveGroupContext({
      action,
      traceId,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId,
    });

    if ("ok" in groupResult) {
      return groupResult;
    }

    if (normalizedIsActive === null) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          groupId,
          reason: "invalid_is_active",
        },
        "El estado activo del grupo no es valido."
      );
    }

    const updateData: Prisma.CatalogGroupUncheckedUpdateInput = {};

    if (rawInput.input?.nombre !== undefined) {
      const nombre = normalizeRequiredString(rawInput.input.nombre);

      if (!nombre) {
        return controlledError(
          action,
          traceId,
          actorUserId,
          {
            businessId: businessResult.id,
            expectedSlug: businessResult.slug,
            groupId,
            reason: "invalid_group_name",
          },
          "El nombre del grupo no puede quedar vacio."
        );
      }

      updateData.nombre = nombre;
    }

    if (rawInput.input?.description !== undefined) {
      updateData.description = normalizeNullableString(rawInput.input.description) ?? null;
    }

    if (normalizedIsActive !== undefined) {
      updateData.isActive = normalizedIsActive;
    }

    const updatedGroup =
      Object.keys(updateData).length === 0
        ? groupResult
        : await prisma.catalogGroup.update({
            where: { id: groupResult.id },
            data: updateData,
            select: {
              id: true,
              negocioId: true,
              nombre: true,
              slug: true,
              parentId: true,
              order: true,
              isActive: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            },
          });

    revalidateAdminCatalogGroupSurfaces(businessResult.slug);

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: updatedGroup.id,
    });

    return {
      ok: true,
      group: mapGroup(updatedGroup),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: normalizeRequiredString(rawInput?.groupId),
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible actualizar el grupo de catalogo en este momento.",
    };
  }
}

export async function toggleAdminCatalogGroupActiveAction(
  rawInput: ToggleAdminCatalogGroupActiveActionInput
): Promise<AdminCatalogGroupActionResult> {
  const action = "toggleAdminCatalogGroupActiveAction";
  const traceId = buildTraceId(action);
  let actorUserId: string | null = null;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return controlledError(
        action,
        traceId,
        null,
        { reason: "unauthenticated" },
        "No autorizado."
      );
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return controlledError(
        action,
        traceId,
        actorUserId,
        { reason: "forbidden_role" },
        "No tienes permisos para cambiar el estado de grupos en esta vista."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const groupId = normalizeRequiredString(rawInput?.groupId);
    const normalizedIsActive = normalizeOptionalBoolean(rawInput?.isActive);

    console.info(`${LOG_PREFIX}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      groupId,
    });

    if (normalizedIsActive === null || normalizedIsActive === undefined) {
      return controlledError(
        action,
        traceId,
        actorUserId,
        {
          businessId,
          expectedSlug,
          groupId,
          reason: "invalid_is_active",
        },
        "El estado activo del grupo no es valido."
      );
    }

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return businessResult;
    }

    const groupResult = await resolveGroupContext({
      action,
      traceId,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId,
    });

    if ("ok" in groupResult) {
      return groupResult;
    }

    const updatedGroup = await prisma.catalogGroup.update({
      where: { id: groupResult.id },
      data: {
        isActive: normalizedIsActive,
      },
      select: {
        id: true,
        negocioId: true,
        nombre: true,
        slug: true,
        parentId: true,
        order: true,
        isActive: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidateAdminCatalogGroupSurfaces(businessResult.slug);

    console.info(`${LOG_PREFIX}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      groupId: updatedGroup.id,
    });

    return {
      ok: true,
      group: mapGroup(updatedGroup),
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      groupId: normalizeRequiredString(rawInput?.groupId),
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible cambiar el estado del grupo de catalogo en este momento.",
    };
  }
}

export async function reorderAdminCatalogGroupsAction(
  rawInput: ReorderAdminCatalogGroupsActionInput
): Promise<ReorderAdminCatalogGroupsActionResult> {
  const action = "reorderAdminCatalogGroupsAction";
  const traceId = buildTraceId(action);
  const reorderLogPrefix = `${LOG_PREFIX}[reorder]`;
  let actorUserId: string | null = null;

  const fail = (
    reason: string,
    error: string,
    details?: {
      businessId?: string;
      expectedSlug?: string;
      parentId?: string | null;
      groupsCount?: number;
    }
  ): ReorderAdminCatalogGroupsActionResult => {
    console.warn(`${reorderLogPrefix}[${traceId}] Error controlado`, {
      action,
      actorUserId,
      businessId: details?.businessId,
      expectedSlug: details?.expectedSlug,
      parentId: details?.parentId,
      groupsCount: details?.groupsCount,
      reason,
    });

    return {
      ok: false,
      error,
    };
  };

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return fail("unauthenticated", "No autorizado.");
    }

    actorUserId = session.user.id;

    if (session.user.role !== "super_admin") {
      return fail(
        "forbidden_role",
        "No tienes permisos para reordenar grupos de catalogo en esta vista."
      );
    }

    const businessId = normalizeRequiredString(rawInput?.businessId);
    const expectedSlug = normalizeRequiredString(rawInput?.expectedSlug);
    const rawParentId = rawInput?.parentId;

    if (
      rawParentId !== undefined &&
      rawParentId !== null &&
      typeof rawParentId !== "string"
    ) {
      return fail(
        "invalid_parent_id_type",
        "El identificador del grupo padre no es valido.",
        {
          businessId,
          expectedSlug,
          parentId: null,
          groupsCount: Array.isArray(rawInput?.orderedGroupIds)
            ? rawInput.orderedGroupIds.length
            : 0,
        }
      );
    }

    if (typeof rawParentId === "string" && rawParentId.trim().length === 0) {
      return fail(
        "blank_parent_id",
        "El identificador del grupo padre no es valido.",
        {
          businessId,
          expectedSlug,
          parentId: null,
          groupsCount: Array.isArray(rawInput?.orderedGroupIds)
            ? rawInput.orderedGroupIds.length
            : 0,
        }
      );
    }

    const parentId = normalizeNullableString(rawParentId) ?? null;
    const orderedGroupIds = normalizeGroupIdList(rawInput?.orderedGroupIds);

    console.info(`${reorderLogPrefix}[${traceId}] Action iniciada`, {
      action,
      actorUserId,
      businessId,
      expectedSlug,
      parentId,
      groupsCount: orderedGroupIds?.length ?? 0,
    });

    if (!businessId || !expectedSlug) {
      return fail(
        "missing_business_identifiers",
        "El identificador del negocio y el slug esperado son obligatorios.",
        {
          businessId,
          expectedSlug,
          parentId,
          groupsCount: orderedGroupIds?.length ?? 0,
        }
      );
    }

    if (!orderedGroupIds) {
      return fail(
        "invalid_group_ids_payload",
        "Debes enviar la lista completa de grupos a reordenar.",
        {
          businessId,
          expectedSlug,
          parentId,
        }
      );
    }

    if (orderedGroupIds.length === 0) {
      return fail(
        "empty_group_ids_payload",
        "Debes enviar al menos un grupo para reordenar.",
        {
          businessId,
          expectedSlug,
          parentId,
          groupsCount: 0,
        }
      );
    }

    if (orderedGroupIds.some((groupId) => !groupId)) {
      return fail(
        "blank_group_id",
        "Todos los grupos enviados deben tener un identificador valido.",
        {
          businessId,
          expectedSlug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    if (new Set(orderedGroupIds).size !== orderedGroupIds.length) {
      return fail(
        "duplicated_group_ids",
        "La lista de grupos contiene ids duplicados.",
        {
          businessId,
          expectedSlug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    const businessResult = await resolveAdminBusinessContext({
      action,
      traceId,
      actorUserId,
      businessId,
      expectedSlug,
    });

    if ("ok" in businessResult) {
      return fail(
        "business_context_invalid",
        businessResult.error,
        {
          businessId,
          expectedSlug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    if (parentId) {
      const parentGroupResult = await resolveGroupContext({
        action,
        traceId,
        actorUserId,
        businessId: businessResult.id,
        expectedSlug: businessResult.slug,
        groupId: parentId,
      });

      if ("ok" in parentGroupResult) {
        return fail(
          "parent_context_invalid",
          parentGroupResult.error,
          {
            businessId: businessResult.id,
            expectedSlug: businessResult.slug,
            parentId,
            groupsCount: orderedGroupIds.length,
          }
        );
      }
    }

    const [existingLevelGroups, incomingGroups] = await Promise.all([
      prisma.catalogGroup.findMany({
        where: {
          negocioId: businessResult.id,
          parentId,
        },
        select: {
          id: true,
          parentId: true,
          order: true,
        },
      }),
      prisma.catalogGroup.findMany({
        where: {
          id: {
            in: orderedGroupIds,
          },
        },
        select: {
          id: true,
          negocioId: true,
          parentId: true,
        },
      }),
    ]);

    if (incomingGroups.length !== orderedGroupIds.length) {
      return fail(
        "incoming_group_not_found",
        "Uno o mas grupos del nuevo orden no existen o ya no estan disponibles.",
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    if (incomingGroups.some((group) => group.negocioId !== businessResult.id)) {
      return fail(
        "incoming_group_business_mismatch",
        "Uno o mas grupos no pertenecen al negocio seleccionado.",
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    if (incomingGroups.some((group) => group.parentId !== parentId)) {
      return fail(
        "incoming_group_parent_mismatch",
        "Todos los grupos enviados deben pertenecer exactamente al mismo nivel.",
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    if (existingLevelGroups.length !== orderedGroupIds.length) {
      return fail(
        "incomplete_level_payload",
        "Debes enviar exactamente todos los grupos existentes en ese nivel para reordenarlos.",
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    const existingLevelGroupIds = new Set(
      existingLevelGroups.map((group) => group.id)
    );

    if (orderedGroupIds.some((groupId) => !existingLevelGroupIds.has(groupId))) {
      return fail(
        "level_group_set_mismatch",
        "El nuevo orden no coincide con los grupos existentes en ese nivel.",
        {
          businessId: businessResult.id,
          expectedSlug: businessResult.slug,
          parentId,
          groupsCount: orderedGroupIds.length,
        }
      );
    }

    await prisma.$transaction(
      orderedGroupIds.map((groupId, index) =>
        prisma.catalogGroup.update({
          where: { id: groupId },
          data: {
            order: index,
          },
          select: {
            id: true,
          },
        })
      )
    );

    revalidateAdminCatalogGroupSurfaces(businessResult.slug);

    console.info(`${reorderLogPrefix}[${traceId}] Exito`, {
      action,
      actorUserId,
      businessId: businessResult.id,
      expectedSlug: businessResult.slug,
      parentId,
      groupsCount: orderedGroupIds.length,
    });

    return {
      ok: true,
      groups: orderedGroupIds.map((groupId, index) => ({
        id: groupId,
        order: index,
      })),
      message:
        parentId === null
          ? "El orden de los grupos raiz fue actualizado correctamente."
          : "El orden de los subgrupos fue actualizado correctamente.",
    };
  } catch (error) {
    console.error(`${reorderLogPrefix}[${traceId}] Error inesperado`, {
      action,
      actorUserId,
      businessId: normalizeRequiredString(rawInput?.businessId),
      expectedSlug: normalizeRequiredString(rawInput?.expectedSlug),
      parentId: normalizeNullableString(rawInput?.parentId) ?? null,
      groupsCount: Array.isArray(rawInput?.orderedGroupIds)
        ? rawInput.orderedGroupIds.length
        : 0,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    return {
      ok: false,
      error: "No fue posible reordenar los grupos de catalogo en este momento.",
    };
  }
}
