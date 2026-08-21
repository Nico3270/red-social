import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EstadoNegocio, EstadoUsuario } from "@prisma/client";

import { buildDirectVisibleBusinessWhere } from "./business-visibility-policy";
import * as legacyVisibility from "./publicBusinessVisibility";

const {
  buildPublicBusinessByIdWhere,
  buildPublicBusinessBySlugWhere,
  buildPublicBusinessRelationWhere,
  buildPublicBusinessVisibilityWhere,
} = legacyVisibility;

describe("publicBusinessVisibility compatibility", () => {
  it("preserves every public export", () => {
    expect(Object.keys(legacyVisibility).sort()).toEqual([
      "buildPublicBusinessByIdWhere",
      "buildPublicBusinessBySlugWhere",
      "buildPublicBusinessRelationWhere",
      "buildPublicBusinessVisibilityWhere",
    ]);
  });

  it("delegates its base contract to the canonical direct builder", () => {
    expect(buildPublicBusinessVisibilityWhere()).toEqual(
      buildDirectVisibleBusinessWhere(),
    );
  });

  it("allows a directly visible active business with an active user", () => {
    expect(buildPublicBusinessVisibilityWhere()).toEqual({
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

  it("excludes a suspended user", () => {
    const where = buildPublicBusinessVisibilityWhere();

    expect(where.usuario).toEqual({
      is: { estado: EstadoUsuario.activo },
    });
    expect(where.usuario).not.toEqual({
      is: { estado: EstadoUsuario.suspendido },
    });
  });

  it("excludes an eliminated user", () => {
    const where = buildPublicBusinessVisibilityWhere();

    expect(where.usuario).not.toEqual({
      is: { estado: EstadoUsuario.eliminado },
    });
  });

  it("excludes a suspended business", () => {
    expect(buildPublicBusinessVisibilityWhere().estado).toBe(
      EstadoNegocio.activo,
    );
    expect(buildPublicBusinessVisibilityWhere().estado).not.toBe(
      EstadoNegocio.suspendido,
    );
  });

  it("excludes an eliminated business", () => {
    expect(buildPublicBusinessVisibilityWhere().estado).not.toBe(
      EstadoNegocio.eliminado,
    );
  });

  it("excludes test data", () => {
    expect(buildPublicBusinessVisibilityWhere().isTestData).toBe(false);
  });

  it("excludes archived data", () => {
    expect(buildPublicBusinessVisibilityWhere().archivedAt).toBeNull();
  });

  it("does not filter placeholders yet", () => {
    expect(JSON.stringify(buildPublicBusinessVisibilityWhere())).not.toContain(
      "isPlaceholder",
    );
  });

  it("does not filter incomplete profiles yet", () => {
    expect(JSON.stringify(buildPublicBusinessVisibilityWhere())).not.toContain(
      "perfilCompleto",
    );
  });

  it("preserves an exact slug alongside direct visibility", () => {
    expect(buildPublicBusinessBySlugWhere("business-slug")).toEqual({
      slug: "business-slug",
      ...buildDirectVisibleBusinessWhere(),
    });
  });

  it("keeps an UNLISTED business eligible by slug", () => {
    const where = buildPublicBusinessBySlugWhere("preview-slug");

    expect(where.slug).toBe("preview-slug");
    expect(JSON.stringify(where)).not.toContain("isPlaceholder");
    expect(JSON.stringify(where)).not.toContain("perfilCompleto");
  });

  it("adds a slug without overwriting any direct policy constraint", () => {
    const direct = buildDirectVisibleBusinessWhere();
    const bySlug = buildPublicBusinessBySlugWhere("exact-slug");

    expect(bySlug).toMatchObject(direct);
    expect(bySlug).toHaveProperty("slug", "exact-slug");
  });

  it("preserves an exact id alongside direct visibility", () => {
    expect(buildPublicBusinessByIdWhere("business-id")).toEqual({
      id: "business-id",
      ...buildDirectVisibleBusinessWhere(),
    });
  });

  it("wraps direct visibility for legacy relation callers", () => {
    expect(buildPublicBusinessRelationWhere()).toEqual({
      is: buildDirectVisibleBusinessWhere(),
    });
  });

  it("returns fresh objects without shared mutation", () => {
    const first = buildPublicBusinessVisibilityWhere();
    const second = buildPublicBusinessVisibilityWhere();

    expect(first).not.toBe(second);
    expect(first.usuario).not.toBe(second.usuario);

    first.isTestData = true;

    expect(second.isTestData).toBe(false);
  });

  it("does not import or use the PUBLISHED builders", () => {
    const source = readFileSync(
      join(__dirname, "publicBusinessVisibility.ts"),
      "utf8",
    );

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("buildPublishedBusinessRelationWhere");
  });
});
