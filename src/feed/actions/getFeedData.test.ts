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
import { getFeedDataByType } from "./getFeedData";

const params = {
  ciudad: "Tunja",
  departamento: "Boyacá",
  limit: 10,
  seenIds: [],
  followedBusinessIds: [],
};

describe("getFeedDataByType PUBLISHED visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicacionFindMany.mockResolvedValue([]);
    mockProductFindMany.mockResolvedValue([]);
    mockServicioFindMany.mockResolvedValue([]);
    mockNegocioFindMany.mockResolvedValue([]);
    mockInteraccionFindMany.mockResolvedValue([]);
  });

  it("applies PUBLISHED to every business publication query", async () => {
    await getFeedDataByType("publications", params);

    expect(mockPublicacionFindMany).toHaveBeenCalledTimes(3);
    expect(mockPublicacionFindMany.mock.calls[0][0].where).toEqual({
      tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
      visibilidad: "PUBLICA",
      id: { notIn: [] },
      negocio: {
        is: {
          AND: [buildPublishedBusinessWhere(), { ciudad: params.ciudad }],
        },
      },
    });
    expect(mockPublicacionFindMany.mock.calls[1][0].where.negocio).toEqual({
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
    expect(mockPublicacionFindMany.mock.calls[2][0].where.negocio).toEqual(
      buildPublishedBusinessRelationWhere(),
    );
  });

  it("applies PUBLISHED to every product query", async () => {
    await getFeedDataByType("products", params);

    expect(mockProductFindMany).toHaveBeenCalledTimes(3);
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

  it("applies PUBLISHED to every service query", async () => {
    await getFeedDataByType("services", params);

    expect(mockServicioFindMany).toHaveBeenCalledTimes(3);
    expect(mockServicioFindMany.mock.calls[0][0].where.negocio).toEqual({
      is: {
        AND: [buildPublishedBusinessWhere(), { ciudad: params.ciudad }],
      },
    });
    expect(mockServicioFindMany.mock.calls[1][0].where.negocio).toEqual({
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
    expect(mockServicioFindMany.mock.calls[2][0].where.negocio).toEqual(
      buildPublishedBusinessRelationWhere(),
    );
  });

  it("applies PUBLISHED safely to every direct business query", async () => {
    await getFeedDataByType("businesses", params);

    expect(mockNegocioFindMany).toHaveBeenCalledTimes(3);
    expect(mockNegocioFindMany.mock.calls[0][0].where).toEqual({
      AND: [
        buildPublishedBusinessWhere(),
        { id: { notIn: [] }, ciudad: params.ciudad },
      ],
    });
    expect(mockNegocioFindMany.mock.calls[1][0].where).toEqual({
      AND: [
        buildPublishedBusinessWhere(),
        {
          id: { notIn: [] },
          departamento: params.departamento,
          ciudad: { not: params.ciudad },
        },
      ],
    });
    expect(mockNegocioFindMany.mock.calls[2][0].where).toEqual({
      AND: [buildPublishedBusinessWhere(), { id: { notIn: [] } }],
    });
  });

  it("excludes PREVIEW_READY and CLAIMED incomplete fixtures from discovery", () => {
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

  it("keeps PUBLISHED eligible and HIDDEN excluded", () => {
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.activo,
        isTestData: false,
        archivedAt: null,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: false,
          perfilCompleto: true,
        },
      }),
    ).toBe("PUBLISHED");
    expect(
      classifyBusinessVisibility({
        estado: EstadoNegocio.suspendido,
        isTestData: false,
        archivedAt: null,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: false,
          perfilCompleto: true,
        },
      }),
    ).toBe("HIDDEN");
  });

  it("preserves response shape, paging and ordering", async () => {
    const result = await getFeedDataByType("businesses", {
      ...params,
      cursor: "cursor-1",
    });

    expect(result).toEqual({ items: [], nextCursor: undefined });
    for (const [index, call] of mockNegocioFindMany.mock.calls.entries()) {
      expect(call[0]).toMatchObject({
        orderBy:
          index === 0
            ? [{ orden: "desc" }]
            : [{ orden: "desc" }, { createdAt: "desc" }],
        take: 20,
        cursor: { id: "cursor-1" },
        skip: 1,
      });
    }
  });

  it("preserves the existing business-publication branch without filtering ordinary users globally", async () => {
    await getFeedDataByType("publications", params);

    expect(mockPublicacionFindMany.mock.calls[0][0].where).toMatchObject({
      tipo: { in: ["TESTIMONIO", "CARRUSEL_IMAGENES"] },
      visibilidad: "PUBLICA",
    });
    expect(mockInteraccionFindMany).not.toHaveBeenCalled();
  });
});
