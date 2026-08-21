import { EstadoNegocio, EstadoUsuario } from "@prisma/client";

const mockPublicacionFindMany = jest.fn();
const mockProductFindMany = jest.fn();
const mockServicioFindMany = jest.fn();
const mockNegocioFindMany = jest.fn();
const mockInteraccionFindMany = jest.fn();
const mockMapToFeedItem = jest.fn();

jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      publicacion: { findMany: mockPublicacionFindMany },
      product: { findMany: mockProductFindMany },
      servicio: { findMany: mockServicioFindMany },
      negocio: { findMany: mockNegocioFindMany },
      interaccion: { findMany: mockInteraccionFindMany },
    },
  }),
  { virtual: true },
);

jest.mock(
  "@/lib/business/business-visibility-policy",
  () => jest.requireActual("../../lib/business/business-visibility-policy"),
  { virtual: true },
);

jest.mock("./mapItem", () => ({
  mapToFeedItem: mockMapToFeedItem,
}));

import {
  buildPublishedBusinessRelationWhere,
  buildPublishedBusinessWhere,
  classifyBusinessVisibility,
} from "../../lib/business/business-visibility-policy";
import { getFeedDataByCategory } from "./getFeedDataByCategory";

const params = {
  ciudad: "Tunja",
  departamento: "Boyacá",
  categoriaSlug: "restaurantes",
  limit: 10,
  seenIds: [],
  followedBusinessIds: [],
};

const categoryCondition = {
  categorias: { some: { category: { slug: params.categoriaSlug } } },
};

describe("getFeedDataByCategory PUBLISHED visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicacionFindMany.mockResolvedValue([]);
    mockProductFindMany.mockResolvedValue([]);
    mockServicioFindMany.mockResolvedValue([]);
    mockNegocioFindMany.mockResolvedValue([]);
    mockInteraccionFindMany.mockResolvedValue([]);
  });

  it("applies PUBLISHED and the existing category filter to every product query", async () => {
    await getFeedDataByCategory("products", params);

    expect(mockProductFindMany).toHaveBeenCalledTimes(3);
    for (const call of mockProductFindMany.mock.calls) {
      expect(call[0].where.category).toEqual({ slug: params.categoriaSlug });
    }
    expect(mockProductFindMany.mock.calls[0][0].where.negocio).toEqual({
      is: {
        AND: [buildPublishedBusinessWhere(), { ciudad: params.ciudad }],
      },
    });
    expect(mockProductFindMany.mock.calls[1][0].where.negocio).toEqual({
      is: {
        AND: [
          buildPublishedBusinessWhere(),
          {
            departamento: params.departamento,
            ciudad: { not: params.ciudad },
          },
        ],
      },
    });
    expect(mockProductFindMany.mock.calls[2][0].where.negocio).toEqual(
      buildPublishedBusinessRelationWhere(),
    );
  });

  it("applies PUBLISHED to every service query without changing service filters", async () => {
    await getFeedDataByCategory("services", params);

    expect(mockServicioFindMany).toHaveBeenCalledTimes(3);
    expect(mockServicioFindMany.mock.calls[0][0].where).toEqual({
      status: "disponible",
      id: { notIn: [] },
      negocio: {
        is: {
          AND: [
            buildPublishedBusinessWhere(),
            { ciudad: params.ciudad, ...categoryCondition },
          ],
        },
      },
    });
    expect(mockServicioFindMany.mock.calls[1][0].where.negocio).toEqual({
      is: {
        AND: [
          buildPublishedBusinessWhere(),
          {
            departamento: params.departamento,
            ciudad: { not: params.ciudad },
            ...categoryCondition,
          },
        ],
      },
    });
    expect(mockServicioFindMany.mock.calls[2][0].where.negocio).toEqual({
      is: {
        AND: [buildPublishedBusinessWhere(), categoryCondition],
      },
    });
  });

  it("applies PUBLISHED to every business publication query", async () => {
    await getFeedDataByCategory("publications", params);

    expect(mockPublicacionFindMany).toHaveBeenCalledTimes(3);
    for (const call of mockPublicacionFindMany.mock.calls) {
      expect(call[0].where).toMatchObject({
        tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
        visibilidad: "PUBLICA",
      });
      expect(call[0].where.negocio.is.AND[0]).toEqual(
        buildPublishedBusinessWhere(),
      );
      expect(call[0].where.negocio.is.AND[1]).toMatchObject(categoryCondition);
    }
  });

  it("applies PUBLISHED safely to every direct business query", async () => {
    await getFeedDataByCategory("businesses", params);

    expect(mockNegocioFindMany).toHaveBeenCalledTimes(3);
    expect(mockNegocioFindMany.mock.calls[0][0].where).toEqual({
      AND: [
        buildPublishedBusinessWhere(),
        {
          id: { notIn: [] },
          ciudad: params.ciudad,
          ...categoryCondition,
        },
      ],
    });
    expect(mockNegocioFindMany.mock.calls[1][0].where).toEqual({
      AND: [
        buildPublishedBusinessWhere(),
        {
          id: { notIn: [] },
          departamento: params.departamento,
          ciudad: { not: params.ciudad },
          ...categoryCondition,
        },
      ],
    });
    expect(mockNegocioFindMany.mock.calls[2][0].where).toEqual({
      AND: [
        buildPublishedBusinessWhere(),
        { id: { notIn: [] }, ...categoryCondition },
      ],
    });
  });

  it("keeps PREVIEW_READY and CLAIMED incomplete out even when category matches", () => {
    const base = {
      estado: EstadoNegocio.activo,
      isTestData: false,
      archivedAt: null,
    };

    expect(
      classifyBusinessVisibility({
        ...base,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: true,
          perfilCompleto: false,
        },
      }),
    ).toBe("UNLISTED");
    expect(
      classifyBusinessVisibility({
        ...base,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: false,
          perfilCompleto: false,
        },
      }),
    ).toBe("UNLISTED");
    expect(buildPublishedBusinessWhere()).toMatchObject({
      usuario: {
        is: {
          isPlaceholder: false,
          perfilCompleto: true,
        },
      },
    });
  });

  it("keeps PUBLISHED eligible and every HIDDEN state excluded", () => {
    const user = {
      estado: EstadoUsuario.activo,
      isPlaceholder: false,
      perfilCompleto: true,
    };

    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.activo,
        isTestData: false,
        archivedAt: null,
        usuario: user,
      }),
    ).toBe("PUBLISHED");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.suspendido,
        isTestData: false,
        archivedAt: null,
        usuario: user,
      }),
    ).toBe("HIDDEN");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.eliminado,
        isTestData: false,
        archivedAt: null,
        usuario: user,
      }),
    ).toBe("HIDDEN");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.activo,
        isTestData: true,
        archivedAt: null,
        usuario: user,
      }),
    ).toBe("HIDDEN");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.activo,
        isTestData: false,
        archivedAt: new Date("2026-08-15T00:00:00.000Z"),
        usuario: user,
      }),
    ).toBe("HIDDEN");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.activo,
        isTestData: false,
        archivedAt: null,
        usuario: { ...user, estado: EstadoUsuario.suspendido },
      }),
    ).toBe("HIDDEN");
  });

  it("keeps PUBLISHED inside every AND branch so category and geography cannot bypass it", async () => {
    await getFeedDataByCategory("services", params);
    await getFeedDataByCategory("publications", params);
    await getFeedDataByCategory("businesses", params);

    for (const call of [
      ...mockServicioFindMany.mock.calls,
      ...mockPublicacionFindMany.mock.calls,
    ]) {
      expect(call[0].where.negocio.is.AND).toHaveLength(2);
      expect(call[0].where.negocio.is.AND[0]).toEqual(
        buildPublishedBusinessWhere(),
      );
    }
    for (const call of mockNegocioFindMany.mock.calls) {
      expect(call[0].where.AND).toHaveLength(2);
      expect(call[0].where.AND[0]).toEqual(buildPublishedBusinessWhere());
    }
  });

  it("preserves geography, ranking inputs, pagination and response shape", async () => {
    const result = await getFeedDataByCategory("businesses", {
      ...params,
      cursor: "cursor-1",
    });

    expect(result).toEqual({ items: [], nextCursor: undefined });
    expect(mockNegocioFindMany.mock.calls[0][0].where.AND[1]).toMatchObject({
      ciudad: params.ciudad,
      ...categoryCondition,
    });
    expect(mockNegocioFindMany.mock.calls[1][0].where.AND[1]).toMatchObject({
      departamento: params.departamento,
      ciudad: { not: params.ciudad },
      ...categoryCondition,
    });
    for (const call of mockNegocioFindMany.mock.calls) {
      expect(call[0]).toMatchObject({
        orderBy: [{ orden: "desc" }, { createdAt: "desc" }],
        take: 20,
        cursor: { id: "cursor-1" },
        skip: 1,
      });
    }
  });

  it("does not add an ordinary-user branch or load reactions for empty results", async () => {
    await getFeedDataByCategory("publications", {
      ...params,
      userId: "ordinary-user",
    });

    for (const call of mockPublicacionFindMany.mock.calls) {
      expect(call[0].where.negocio).toBeDefined();
    }
    expect(mockInteraccionFindMany).not.toHaveBeenCalled();
  });
});
