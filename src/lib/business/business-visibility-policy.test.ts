import { EstadoNegocio, EstadoUsuario } from "@prisma/client";

import {
  buildDirectVisibleBusinessWhere,
  buildPublishedBusinessRelationWhere,
  buildPublishedBusinessWhere,
  classifyBusinessVisibility,
  type BusinessVisibilityInput,
} from "./business-visibility-policy";

function visibleBusiness(
  overrides: Partial<BusinessVisibilityInput> = {},
): BusinessVisibilityInput {
  return {
    estado: EstadoNegocio.activo,
    isTestData: false,
    archivedAt: null,
    usuario: {
      estado: EstadoUsuario.activo,
      isPlaceholder: false,
      perfilCompleto: true,
    },
    ...overrides,
  };
}

describe("classifyBusinessVisibility", () => {
  it("classifies an eligible completed business as PUBLISHED", () => {
    expect(classifyBusinessVisibility(visibleBusiness())).toBe("PUBLISHED");
  });

  it.each([
    {
      label: "a PREVIEW_READY placeholder",
      isPlaceholder: true,
      perfilCompleto: false,
    },
    {
      label: "a CLAIMED incomplete business",
      isPlaceholder: false,
      perfilCompleto: false,
    },
    {
      label: "a defensive placeholder/completed combination",
      isPlaceholder: true,
      perfilCompleto: true,
    },
  ])("classifies $label as UNLISTED", ({ isPlaceholder, perfilCompleto }) => {
    expect(
      classifyBusinessVisibility(
        visibleBusiness({
          usuario: {
            estado: EstadoUsuario.activo,
            isPlaceholder,
            perfilCompleto,
          },
        }),
      ),
    ).toBe("UNLISTED");
  });

  it.each([EstadoNegocio.suspendido, EstadoNegocio.eliminado])(
    "classifies a %s business as HIDDEN",
    (estado) => {
      expect(classifyBusinessVisibility(visibleBusiness({ estado }))).toBe(
        "HIDDEN",
      );
    },
  );

  it("classifies test data as HIDDEN", () => {
    expect(
      classifyBusinessVisibility(visibleBusiness({ isTestData: true })),
    ).toBe("HIDDEN");
  });

  it("classifies archived data as HIDDEN", () => {
    expect(
      classifyBusinessVisibility(
        visibleBusiness({ archivedAt: new Date("2026-08-15T00:00:00.000Z") }),
      ),
    ).toBe("HIDDEN");
  });

  it.each([EstadoUsuario.suspendido, EstadoUsuario.eliminado])(
    "classifies a business with a %s user as HIDDEN",
    (estado) => {
      expect(
        classifyBusinessVisibility(
          visibleBusiness({
            usuario: {
              estado,
              isPlaceholder: false,
              perfilCompleto: true,
            },
          }),
        ),
      ).toBe("HIDDEN");
    },
  );

  it.each([null, undefined])(
    "classifies a missing user (%s) as HIDDEN",
    (usuario) => {
      expect(classifyBusinessVisibility(visibleBusiness({ usuario }))).toBe(
        "HIDDEN",
      );
    },
  );

  it("gives HIDDEN precedence over placeholder visibility", () => {
    expect(
      classifyBusinessVisibility(
        visibleBusiness({
          archivedAt: new Date("2026-08-15T00:00:00.000Z"),
          usuario: {
            estado: EstadoUsuario.activo,
            isPlaceholder: true,
            perfilCompleto: false,
          },
        }),
      ),
    ).toBe("HIDDEN");
  });

  it("gives HIDDEN precedence over incomplete profile visibility", () => {
    expect(
      classifyBusinessVisibility(
        visibleBusiness({
          usuario: {
            estado: EstadoUsuario.suspendido,
            isPlaceholder: false,
            perfilCompleto: false,
          },
        }),
      ),
    ).toBe("HIDDEN");
  });

  it("does not mutate its input", () => {
    const input = visibleBusiness();
    const snapshot = structuredClone(input);

    classifyBusinessVisibility(input);

    expect(input).toEqual(snapshot);
  });
});

describe("business visibility Prisma builders", () => {
  it("builds direct visibility without placeholder or completion filters", () => {
    expect(buildDirectVisibleBusinessWhere()).toEqual({
      estado: EstadoNegocio.activo,
      isTestData: false,
      archivedAt: null,
      usuario: {
        is: {
          estado: EstadoUsuario.activo,
        },
      },
    });
  });

  it("builds published visibility with every canonical constraint", () => {
    expect(buildPublishedBusinessWhere()).toEqual({
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
    });
  });

  it("composes the published relation filter from the published builder", () => {
    expect(buildPublishedBusinessRelationWhere()).toEqual({
      is: buildPublishedBusinessWhere(),
    });
  });

  it("returns fresh objects that cannot contaminate later calls", () => {
    const first = buildPublishedBusinessWhere();
    const second = buildPublishedBusinessWhere();

    expect(first).not.toBe(second);
    expect(first.usuario).not.toBe(second.usuario);

    first.isTestData = true;

    expect(second.isTestData).toBe(false);
    expect(buildPublishedBusinessWhere().isTestData).toBe(false);
  });
});
