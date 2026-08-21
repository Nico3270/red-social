import { EstadoNegocio, EstadoUsuario } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type BusinessVisibility = "HIDDEN" | "UNLISTED" | "PUBLISHED";

export type BusinessVisibilityInput = {
  estado: EstadoNegocio;
  isTestData: boolean;
  archivedAt: Date | null;
  usuario?: {
    estado: EstadoUsuario;
    isPlaceholder: boolean;
    perfilCompleto: boolean;
  } | null;
};

export function classifyBusinessVisibility(
  business: BusinessVisibilityInput,
): BusinessVisibility {
  if (
    business.estado !== EstadoNegocio.activo ||
    business.isTestData ||
    business.archivedAt !== null ||
    !business.usuario ||
    business.usuario.estado !== EstadoUsuario.activo
  ) {
    return "HIDDEN";
  }

  if (business.usuario.isPlaceholder || !business.usuario.perfilCompleto) {
    return "UNLISTED";
  }

  return "PUBLISHED";
}

export function buildDirectVisibleBusinessWhere(): Prisma.NegocioWhereInput {
  return {
    estado: EstadoNegocio.activo,
    isTestData: false,
    archivedAt: null,
    usuario: {
      is: {
        estado: EstadoUsuario.activo,
      },
    },
  };
}

export function buildPublishedBusinessWhere(): Prisma.NegocioWhereInput {
  return {
    estado: EstadoNegocio.activo,
    isTestData: false,
    archivedAt: null,
    usuario: {
      is: {
        estado: EstadoUsuario.activo,
        isPlaceholder: false,
        perfilCompleto: true,
      },
    },
  };
}

export function buildPublishedBusinessRelationWhere(): Prisma.NegocioScalarRelationFilter {
  return {
    is: buildPublishedBusinessWhere(),
  };
}
