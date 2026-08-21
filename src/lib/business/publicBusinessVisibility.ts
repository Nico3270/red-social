import type { Prisma } from "@prisma/client";

import { buildDirectVisibleBusinessWhere } from "./business-visibility-policy";

export function buildPublicBusinessVisibilityWhere(): Prisma.NegocioWhereInput {
  return buildDirectVisibleBusinessWhere();
}

export function buildPublicBusinessBySlugWhere(
  slug: string
): Prisma.NegocioWhereInput {
  return {
    slug,
    ...buildPublicBusinessVisibilityWhere(),
  };
}

export function buildPublicBusinessByIdWhere(
  id: string
): Prisma.NegocioWhereInput {
  return {
    id,
    ...buildPublicBusinessVisibilityWhere(),
  };
}

export function buildPublicBusinessRelationWhere(): Prisma.NegocioScalarRelationFilter {
  return {
    is: buildPublicBusinessVisibilityWhere(),
  };
}
