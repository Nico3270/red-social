import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReservationStatus } from "@prisma/client";

const mockBusinessFindFirst = jest.fn();
const mockReservationFindMany = jest.fn();
const publishedWhere = { published: true };
const mockBuildPublishedBusinessWhere = jest.fn(() => publishedWhere);
const mockNextResponseJson = jest.fn(
  (body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => body,
  })
);

jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      negocio: { findFirst: mockBusinessFindFirst },
      reservation: { findMany: mockReservationFindMany },
    },
  }),
  { virtual: true }
);
jest.mock(
  "@/lib/business/business-visibility-policy",
  () => ({
    buildPublishedBusinessWhere: mockBuildPublishedBusinessWhere,
  }),
  { virtual: true }
);
jest.mock(
  "next/server",
  () => ({ NextResponse: { json: mockNextResponseJson } }),
  { virtual: true }
);

import { GET } from "./route";

const negocioId = "business-published";
const date = "2026-08-20";
const start1400 = new Date("2026-08-20T19:00:00.000Z");
const end1430 = new Date("2026-08-20T19:30:00.000Z");

function request(
  requestedDate = date,
  requestedBusinessId = negocioId
): Request {
  return new Request(
    `http://localhost/api/reservasConfigUser?date=${encodeURIComponent(
      requestedDate
    )}&negocioId=${encodeURIComponent(requestedBusinessId)}`
  );
}

async function bodyOf(response: Awaited<ReturnType<typeof GET>>) {
  return (response as unknown as { json: () => Promise<unknown> }).json();
}

function row(
  estado: ReservationStatus,
  fechaHoraInicio = start1400,
  fechaHoraFin: Date | null = end1430,
  extras: Record<string, unknown> = {}
) {
  return {
    fechaHoraInicio,
    fechaHoraFin,
    estado,
    ...extras,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBusinessFindFirst.mockResolvedValue({ id: negocioId });
  mockReservationFindMany.mockResolvedValue([]);
});

describe("GET /api/reservasConfigUser secure occupancy", () => {
  it.each([
    ["date ausente", `http://localhost/api/reservasConfigUser?negocioId=${negocioId}`],
    ["negocioId ausente", `http://localhost/api/reservasConfigUser?date=${date}`],
    ["date inválida", `http://localhost/api/reservasConfigUser?date=2026-02-31&negocioId=${negocioId}`],
    ["negocioId vacío", `http://localhost/api/reservasConfigUser?date=${date}&negocioId=%20%20`],
  ])("rechaza %s sin consultar Prisma", async (_label, url) => {
    const response = await GET(new Request(url));

    expect(response.status).toBe(400);
    expect(mockBusinessFindFirst).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
  });

  it("resuelve el locator exclusivamente mediante la policy PUBLISHED", async () => {
    await GET(request());

    expect(mockBuildPublishedBusinessWhere).toHaveBeenCalledTimes(1);
    expect(mockBusinessFindFirst).toHaveBeenCalledWith({
      where: {
        AND: [publishedWhere, { id: negocioId }],
      },
      select: { id: true },
    });
  });

  it.each(["PREVIEW_READY", "CLAIMED_INCOMPLETE", "HIDDEN", "INEXISTENTE"])(
    "responde uniformemente para %s sin consultar reservas",
    async () => {
      mockBusinessFindFirst.mockResolvedValue(null);

      const response = await GET(request());

      expect(response.status).toBe(409);
      await expect(bodyOf(response)).resolves.toEqual({
        ok: false,
        code: "BUSINESS_NOT_AVAILABLE",
        message: "Este negocio no está disponible para esta acción.",
      });
      expect(mockReservationFindMany).not.toHaveBeenCalled();
    }
  );

  it("usa rango diario, estados relevantes y un select sin PII ni IDs", async () => {
    await GET(request());

    expect(mockReservationFindMany).toHaveBeenCalledTimes(1);
    const query = mockReservationFindMany.mock.calls[0][0];
    expect(query.where).toEqual(
      expect.objectContaining({
        negocioId,
        estado: {
          in: [
            ReservationStatus.PENDIENTE,
            ReservationStatus.CONFIRMADA,
            ReservationStatus.BLOQUEADA,
          ],
        },
        fechaHoraInicio: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      })
    );
    expect(query.select).toEqual({
      fechaHoraInicio: true,
      fechaHoraFin: true,
      estado: true,
    });
    for (const forbidden of [
      "id",
      "nombre",
      "telefono",
      "notas",
      "usuarioId",
      "negocioId",
      "createdAt",
      "updatedAt",
    ]) {
      expect(query.select).not.toHaveProperty(forbidden);
    }
  });

  it("agrega PENDIENTE y CONFIRMADA del mismo slot", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.PENDIENTE),
      row(ReservationStatus.CONFIRMADA),
    ]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(bodyOf(response)).resolves.toEqual({
      ok: true,
      date,
      occupancy: [
        {
          start: start1400.toISOString(),
          end: end1430.toISOString(),
          count: 2,
          blocked: false,
        },
      ],
    });
  });

  it("representa BLOQUEADA sin incrementar count", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.BLOQUEADA),
    ]);

    const response = await GET(request());

    await expect(bodyOf(response)).resolves.toEqual({
      ok: true,
      date,
      occupancy: [
        {
          start: start1400.toISOString(),
          end: end1430.toISOString(),
          count: 0,
          blocked: true,
        },
      ],
    });
  });

  it("combina ocupación y bloqueo para el mismo slot", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.PENDIENTE),
      row(ReservationStatus.BLOQUEADA),
    ]);

    const response = await GET(request());

    await expect(bodyOf(response)).resolves.toEqual({
      ok: true,
      date,
      occupancy: [
        expect.objectContaining({ count: 1, blocked: true }),
      ],
    });
  });

  it("omite CANCELADA y COMPLETADA incluso ante un mock defensivo", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.CANCELADA),
      row(ReservationStatus.COMPLETADA),
    ]);

    const response = await GET(request());

    await expect(bodyOf(response)).resolves.toEqual({
      ok: true,
      date,
      occupancy: [],
    });
  });

  it("agrupa slots independientemente y los ordena por start/end", async () => {
    const start1500 = new Date("2026-08-20T20:00:00.000Z");
    const end1530 = new Date("2026-08-20T20:30:00.000Z");
    const start1600 = new Date("2026-08-20T21:00:00.000Z");
    const end1630 = new Date("2026-08-20T21:30:00.000Z");
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.CONFIRMADA, start1600, end1630),
      row(ReservationStatus.PENDIENTE, start1400, end1430),
      row(ReservationStatus.BLOQUEADA, start1500, end1530),
    ]);

    const response = await GET(request());
    const body = (await bodyOf(response)) as { occupancy: Array<{ start: string }> };

    expect(body.occupancy.map((slot) => slot.start)).toEqual([
      start1400.toISOString(),
      start1500.toISOString(),
      start1600.toISOString(),
    ]);
  });

  it("no serializa PII, IDs ni el contrato reservas", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.PENDIENTE, start1400, end1430, {
        id: "secret-reservation-id",
        nombre: "Cliente privado",
        telefono: "3000000000",
        notas: "nota privada",
        usuarioId: "secret-user-id",
        negocioId: "secret-business-id",
      }),
    ]);

    const response = await GET(request());
    const body = await bodyOf(response);
    const serialized = JSON.stringify(body);

    expect(body).not.toHaveProperty("reservas");
    for (const forbidden of [
      "secret-reservation-id",
      "Cliente privado",
      "3000000000",
      "nota privada",
      "secret-user-id",
      "secret-business-id",
      '"reservas"',
      '"nombre"',
      '"telefono"',
      '"notas"',
      '"usuarioId"',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("preserva un error 500 genérico sin filtrar detalles", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockReservationFindMany.mockRejectedValue(new Error("secret database detail"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(bodyOf(response)).resolves.toEqual({
      ok: false,
      message: "Error interno al consultar disponibilidad",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Error al consultar disponibilidad pública de reservas"
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("secret database detail")
    );
    errorSpy.mockRestore();
  });

  it("no reintroduce helpers DIRECT ni campos sensibles en el source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/reservasConfigUser/route.ts"),
      "utf8"
    );

    expect(source).toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("buildPublicBusinessByIdWhere");
    expect(source).not.toContain("buildDirectVisibleBusinessWhere");
    expect(source).not.toMatch(/\b(nombre|telefono|notas|usuarioId)\s*:\s*true/);
    expect(source.match(/\bid\s*:\s*true/g)).toHaveLength(1);
  });
});
