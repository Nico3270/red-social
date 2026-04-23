import { EstadoNegocio, Prisma } from "@prisma/client";

export function buildPublicBusinessVisibilityWhere(): Prisma.NegocioWhereInput {
  return {
    estado: EstadoNegocio.activo,
    isTestData: false,
    archivedAt: null,
  };
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
