import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma, ReservationStatus } from "@prisma/client";

const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockBusinessFindFirst = jest.fn();
const mockReservationFindMany = jest.fn();
const mockReservationCreate = jest.fn();
const mockRotateCapability = jest.fn();
const mockNotify = jest.fn();
const TEST_SITE_ORIGIN = "https://reservas.staging.test";
const publishedWhere = { visibility: "PUBLISHED" };
const mockBuildPublishedBusinessWhere = jest.fn(() => publishedWhere);

const transactionClient = {
  negocio: {
    findFirst: mockBusinessFindFirst,
  },
  reservation: {
    findMany: mockReservationFindMany,
    create: mockReservationCreate,
  },
};

jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
jest.mock(
  "@/lib/business/business-visibility-policy",
  () => ({ buildPublishedBusinessWhere: mockBuildPublishedBusinessWhere }),
  { virtual: true },
);
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      $transaction: mockTransaction,
    },
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-capability",
  () => ({ rotateReservationCapabilityInTx: mockRotateCapability }),
  { virtual: true },
);
jest.mock(
  "@/reservas/helpers/notifyReserva",
  () => ({ notifyReservaConfirmadaCliente: mockNotify }),
  { virtual: true },
);
jest.mock(
  "@/reservas/interfaces/interfaces.whatsapp",
  () => jest.requireActual("../interfaces/interfaces.whatsapp"),
  { virtual: true },
);

import { createPublicReservation } from "./createPublicReservation";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

const now = new Date("2026-08-18T12:00:00.000Z");
const userId = "customer-user-1";
const businessId = "published-business-1";
const slug = "negocio-publicado";
const reservationId = "reservation-created-1";
const capabilityToken = "SECRET_CAPABILITY_TOKEN";
const start0815 = new Date("2026-08-20T13:15:00.000Z");
const end0845 = new Date("2026-08-20T13:45:00.000Z");

let transactionActive = false;
let events: string[] = [];

function availability(overrides: Record<string, unknown> = {}) {
  return {
    diasAtencion: ["Jueves"],
    franjaMananaInicio: "08:15",
    franjaMananaFin: "12:00",
    franjaTardeInicio: "14:00",
    franjaTardeFin: "18:00",
    intervaloMinutos: 30,
    capacidadPorIntervalo: 2,
    duracionMinimaIntervalos: 1,
    ...overrides,
  };
}

function publishedBusiness(
  availabilityOverrides: Record<string, unknown> = {},
) {
  return {
    id: businessId,
    telefonoContacto: "+573004445566",
    availability: availability(availabilityOverrides),
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    slug,
    nombre: "Cliente Reserva",
    telefono: "3001112233",
    fechaHoraInicio: start0815.toISOString(),
    fechaHoraFin: end0845.toISOString(),
    notas: "Mesa tranquila",
    ...overrides,
  };
}

function row(
  estado: ReservationStatus,
  fechaHoraInicio: Date,
  fechaHoraFin: Date | null,
) {
  return { estado, fechaHoraInicio, fechaHoraFin };
}

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.18.0",
  });
}

function successfulTransactionImplementation() {
  return async (
    callback: (tx: typeof transactionClient) => Promise<unknown>,
  ) => {
    transactionActive = true;
    events.push("transaction:start");
    try {
      return await callback(transactionClient);
    } finally {
      transactionActive = false;
      events.push("transaction:end");
    }
  };
}

async function expectSiteConfigurationFailure(): Promise<void> {
  const result = await createPublicReservation(validInput());

  expect(result).toEqual({
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible crear la reserva.",
  });
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockBusinessFindFirst).not.toHaveBeenCalled();
  expect(mockReservationFindMany).not.toHaveBeenCalled();
  expect(mockReservationCreate).not.toHaveBeenCalled();
  expect(mockRotateCapability).not.toHaveBeenCalled();
  expect(mockNotify).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(now);
  jest.clearAllMocks();
  transactionActive = false;
  events = [];
  process.env.SITE_URL = TEST_SITE_ORIGIN;

  mockAuth.mockResolvedValue({ user: { id: userId, role: "user" } });
  mockBusinessFindFirst.mockResolvedValue(publishedBusiness());
  mockReservationFindMany.mockResolvedValue([]);
  mockReservationCreate.mockImplementation(async ({ data }) => {
    events.push("reservation:create");
    expect(transactionActive).toBe(true);
    return {
      id: reservationId,
      nombre: data.nombre,
      telefono: data.telefono,
      fechaHoraInicio: data.fechaHoraInicio,
      fechaHoraFin: data.fechaHoraFin,
      notas: data.notas,
    };
  });
  mockRotateCapability.mockImplementation(async () => {
    events.push("capability:rotate");
    expect(transactionActive).toBe(true);
    return {
      capabilityId: "capability-1",
      token: capabilityToken,
      expiresAt: new Date("2026-08-21T13:45:00.000Z"),
    };
  });
  mockNotify.mockImplementation(async () => {
    events.push("notification");
    expect(transactionActive).toBe(false);
    return { ok: true };
  });
  mockBuildPublishedBusinessWhere.mockImplementation(() => {
    events.push("published:where");
    expect(transactionActive).toBe(true);
    return publishedWhere;
  });
  mockTransaction.mockImplementation(successfulTransactionImplementation());
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.SITE_URL;
});

describe("createPublicReservation", () => {
  it("falla UNAUTHENTICATED antes de Prisma, capability y notificaciones", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createPublicReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Debes iniciar sesión para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("trata cualquier sesión con user.id bajo semántica public/customer", async () => {
    mockAuth.mockResolvedValue({
      user: { id: userId, role: "negocio", negocioId: "otro-negocio" },
    });

    const result = await createPublicReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockReservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          negocioId: businessId,
          usuarioId: userId,
          estado: ReservationStatus.PENDIENTE,
        }),
      }),
    );
  });

  it.each([
    ["ausente", undefined],
    ["vacía", ""],
    ["con whitespace exterior", ` ${TEST_SITE_ORIGIN} `],
    ["con path", `${TEST_SITE_ORIGIN}/foo`],
    ["con query", `${TEST_SITE_ORIGIN}?x=1`],
    ["con hash", `${TEST_SITE_ORIGIN}/#x`],
    ["con userinfo", "https://user:pass@reservas.staging.test"],
    ["con protocolo no HTTP", "ftp://reservas.staging.test"],
    ["no parseable", "not-a-valid-url"],
  ])(
    "falla cerrado con SITE_URL %s antes de cualquier transacción",
    async (_caseName, siteUrl) => {
      if (siteUrl === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = siteUrl;
      }

      await expectSiteConfigurationFailure();
    },
  );

  it.each([
    [TEST_SITE_ORIGIN, TEST_SITE_ORIGIN],
    [`${TEST_SITE_ORIGIN}/`, TEST_SITE_ORIGIN],
    ["https://myckeo.com", "https://myckeo.com"],
  ])(
    "acepta SITE_URL explícita %s y entrega su management URL exacta",
    async (siteUrl, expectedOrigin) => {
      process.env.SITE_URL = siteUrl;

      const result = await createPublicReservation(validInput());

      expect(result.ok).toBe(true);
      expect(mockNotify).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          enlace_cancelar: `${expectedOrigin}/reservas/gestionar/${capabilityToken}`,
        }),
      );
    },
  );

  it("permite loopback explícito fuera de producción", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    process.env.SITE_URL = "http://localhost:3000";

    const result = await createPublicReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockNotify).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        enlace_cancelar:
          "http://localhost:3000/reservas/gestionar/SECRET_CAPABILITY_TOKEN",
      }),
    );
  });

  it("rechaza loopback en producción antes de cualquier transacción", async () => {
    const replacedNodeEnv = jest.replaceProperty(
      process.env,
      "NODE_ENV",
      "production",
    );
    process.env.SITE_URL = "http://127.0.0.1:3000";

    try {
      await expectSiteConfigurationFailure();
    } finally {
      replacedNodeEnv.restore();
    }
  });

  it("resuelve slug + PUBLISHED dentro del transaction client con select mínimo", async () => {
    await createPublicReservation(validInput());

    expect(mockBusinessFindFirst).toHaveBeenCalledWith({
      where: {
        AND: [publishedWhere, { slug }],
      },
      select: {
        id: true,
        telefonoContacto: true,
        availability: {
          select: {
            diasAtencion: true,
            franjaMananaInicio: true,
            franjaMananaFin: true,
            franjaTardeInicio: true,
            franjaTardeFin: true,
            intervaloMinutos: true,
            capacidadPorIntervalo: true,
            duracionMinimaIntervalos: true,
          },
        },
      },
    });
    expect(events.indexOf("transaction:start")).toBeLessThan(
      events.indexOf("published:where"),
    );
  });

  it.each(["UNLISTED", "HIDDEN", "INEXISTENTE"])(
    "bloquea %s uniformemente y sin efectos",
    async () => {
      mockBusinessFindFirst.mockResolvedValue(null);

      const result = await createPublicReservation(validInput());

      expect(result).toEqual({
        ok: false,
        code: "BUSINESS_NOT_AVAILABLE",
        message: "Este negocio no está disponible para esta acción.",
      });
      expect(mockReservationFindMany).not.toHaveBeenCalled();
      expect(mockReservationCreate).not.toHaveBeenCalled();
      expect(mockRotateCapability).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    },
  );

  it("falla cerrado cuando el Negocio PUBLISHED no tiene configuración", async () => {
    mockBusinessFindFirst.mockResolvedValue({
      id: businessId,
      telefonoContacto: "+573004445566",
      availability: null,
    });

    const result = await createPublicReservation(validInput());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("rechaza propiedades de autoridad adicionales y usa sólo autoridades server-side", async () => {
    const rejected = await createPublicReservation(
      validInput({
        negocioId: "attacker-business",
        usuarioId: "attacker-user",
        estado: ReservationStatus.CONFIRMADA,
      }),
    );

    expect(rejected).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();

    const accepted = await createPublicReservation(validInput());
    expect(accepted.ok).toBe(true);
    expect(mockReservationCreate).toHaveBeenCalledWith({
      data: {
        negocioId: businessId,
        usuarioId: userId,
        nombre: "Cliente Reserva",
        telefono: "+573001112233",
        fechaHoraInicio: start0815,
        fechaHoraFin: end0845,
        notas: "Mesa tranquila",
        estado: ReservationStatus.PENDIENTE,
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        notas: true,
      },
    });
  });

  it.each([
    ["inicio inválido", { fechaHoraInicio: "invalid" }],
    ["fin inválido", { fechaHoraFin: "invalid" }],
    [
      "inicio sin timezone explícito",
      { fechaHoraInicio: "2026-08-20T08:15:00" },
    ],
    ["inicio igual a fin", { fechaHoraFin: start0815.toISOString() }],
    [
      "inicio posterior a fin",
      {
        fechaHoraInicio: end0845.toISOString(),
        fechaHoraFin: start0815.toISOString(),
      },
    ],
  ])("rechaza %s antes de escribir", async (_label, overrides) => {
    const result = await createPublicReservation(validInput(overrides));

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["fecha pasada", "2026-08-17T13:15:00.000Z", "2026-08-17T13:45:00.000Z"],
    [
      "días Colombia distintos",
      "2026-08-20T04:45:00.000Z",
      "2026-08-20T05:15:00.000Z",
    ],
  ])(
    "rechaza %s dentro de la validación transaccional",
    async (_label, start, end) => {
      const result = await createPublicReservation(
        validInput({ fechaHoraInicio: start, fechaHoraFin: end }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          code: "RESERVATION_NOT_AVAILABLE",
        }),
      );
      expect(mockReservationCreate).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    },
  );

  it("valida el día de atención en America/Bogota", async () => {
    mockBusinessFindFirst.mockResolvedValue(
      publishedBusiness({ diasAtencion: ["Viernes"] }),
    );

    const result = await createPublicReservation(validInput());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockReservationCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["comienza antes", "2026-08-20T13:00:00.000Z", "2026-08-20T13:30:00.000Z"],
    ["termina después", "2026-08-20T16:45:00.000Z", "2026-08-20T17:15:00.000Z"],
    ["cruza el hueco", "2026-08-20T16:45:00.000Z", "2026-08-20T19:15:00.000Z"],
  ])(
    "rechaza una reserva que %s de las franjas",
    async (_label, start, end) => {
      const result = await createPublicReservation(
        validInput({ fechaHoraInicio: start, fechaHoraFin: end }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          code: "RESERVATION_NOT_AVAILABLE",
        }),
      );
      expect(mockReservationCreate).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["08:15", "2026-08-20T13:15:00.000Z", "2026-08-20T13:45:00.000Z", true],
    ["08:45", "2026-08-20T13:45:00.000Z", "2026-08-20T14:15:00.000Z", true],
    ["08:30", "2026-08-20T13:30:00.000Z", "2026-08-20T14:00:00.000Z", false],
  ])(
    "alinea %s respecto al inicio 08:15",
    async (_label, start, end, expectedOk) => {
      const result = await createPublicReservation(
        validInput({ fechaHoraInicio: start, fechaHoraFin: end }),
      );

      expect(result.ok).toBe(expectedOk);
      expect(mockReservationCreate).toHaveBeenCalledTimes(expectedOk ? 1 : 0);
    },
  );

  it.each([
    [30, false],
    [60, true],
    [90, true],
  ])(
    "aplica duración mínima de dos intervalos a %i minutos",
    async (minutes, expectedOk) => {
      mockBusinessFindFirst.mockResolvedValue(
        publishedBusiness({ duracionMinimaIntervalos: 2 }),
      );
      const end = new Date(start0815.getTime() + minutes * 60_000);

      const result = await createPublicReservation(
        validInput({ fechaHoraFin: end.toISOString() }),
      );

      expect(result.ok).toBe(expectedOk);
    },
  );

  it("deriva el fin desde la duración mínima cuando fechaHoraFin es null", async () => {
    mockBusinessFindFirst.mockResolvedValue(
      publishedBusiness({ duracionMinimaIntervalos: 2 }),
    );

    const result = await createPublicReservation(
      validInput({ fechaHoraFin: null }),
    );

    expect(result.ok).toBe(true);
    expect(mockReservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fechaHoraFin: new Date("2026-08-20T14:15:00.000Z"),
        }),
      }),
    );
  });

  it.each([
    ["intervalo cero", { intervaloMinutos: 0 }],
    ["capacidad cero", { capacidadPorIntervalo: 0 }],
    ["duración mínima cero", { duracionMinimaIntervalos: 0 }],
  ])(
    "falla cerrado ante configuración inválida: %s",
    async (_label, overrides) => {
      mockBusinessFindFirst.mockResolvedValue(publishedBusiness(overrides));

      const result = await createPublicReservation(validInput());

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          code: "RESERVATION_NOT_AVAILABLE",
        }),
      );
      expect(mockReservationFindMany).not.toHaveBeenCalled();
      expect(mockReservationCreate).not.toHaveBeenCalled();
    },
  );

  it("bloquea overlaps BLOQUEADA y permite filas sin overlap", async () => {
    mockReservationFindMany.mockResolvedValueOnce([
      row(
        ReservationStatus.BLOQUEADA,
        new Date("2026-08-20T13:30:00.000Z"),
        new Date("2026-08-20T14:00:00.000Z"),
      ),
    ]);

    const blocked = await createPublicReservation(validInput());
    expect(blocked).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );

    mockReservationFindMany.mockResolvedValueOnce([
      row(
        ReservationStatus.BLOQUEADA,
        new Date("2026-08-20T14:15:00.000Z"),
        new Date("2026-08-20T14:45:00.000Z"),
      ),
    ]);
    const available = await createPublicReservation(validInput());
    expect(available.ok).toBe(true);
  });

  it("trata BLOQUEADA legacy sin fin como bloqueo de su intervalo", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.BLOQUEADA, start0815, null),
    ]);

    const result = await createPublicReservation(validInput());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
  });

  it("cuenta sólo PENDIENTE/CONFIRMADA y excluye estados terminales", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.PENDIENTE, start0815, end0845),
      row(ReservationStatus.CANCELADA, start0815, end0845),
      row(ReservationStatus.COMPLETADA, start0815, end0845),
    ]);

    const oneActive = await createPublicReservation(validInput());
    expect(oneActive.ok).toBe(true);

    mockReservationFindMany.mockResolvedValue([
      row(ReservationStatus.PENDIENTE, start0815, end0845),
      row(ReservationStatus.CONFIRMADA, start0815, end0845),
    ]);
    const full = await createPublicReservation(validInput());
    expect(full).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
  });

  it("aborta una solicitud multi-intervalo si cualquiera está lleno", async () => {
    mockReservationFindMany.mockResolvedValue([
      row(
        ReservationStatus.PENDIENTE,
        new Date("2026-08-20T13:45:00.000Z"),
        new Date("2026-08-20T14:15:00.000Z"),
      ),
      row(
        ReservationStatus.CONFIRMADA,
        new Date("2026-08-20T13:45:00.000Z"),
        new Date("2026-08-20T14:15:00.000Z"),
      ),
    ]);

    const result = await createPublicReservation(
      validInput({ fechaHoraFin: "2026-08-20T14:15:00.000Z" }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
  });

  it("consulta sólo estados relevantes y campos temporales mínimos", async () => {
    await createPublicReservation(validInput());

    expect(mockReservationFindMany).toHaveBeenCalledWith({
      where: {
        negocioId: businessId,
        estado: {
          in: [
            ReservationStatus.PENDIENTE,
            ReservationStatus.CONFIRMADA,
            ReservationStatus.BLOQUEADA,
          ],
        },
        fechaHoraInicio: { lt: end0845 },
        OR: [
          { fechaHoraFin: { gt: start0815 } },
          {
            fechaHoraFin: null,
            fechaHoraInicio: { gte: start0815 },
          },
        ],
      },
      select: {
        fechaHoraInicio: true,
        fechaHoraFin: true,
        estado: true,
      },
    });
  });

  it("crea Reservation y luego capability dentro del mismo tx", async () => {
    const result = await createPublicReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledWith(transactionClient, {
      reservationId,
      fechaHoraInicio: start0815,
      fechaHoraFin: end0845,
    });
    expect(events.indexOf("reservation:create")).toBeLessThan(
      events.indexOf("capability:rotate"),
    );
    expect(events.indexOf("capability:rotate")).toBeLessThan(
      events.indexOf("transaction:end"),
    );
    expect(events.indexOf("transaction:end")).toBeLessThan(
      events.indexOf("notification"),
    );
  });

  it("no notifica cuando falla capability y devuelve error controlado", async () => {
    mockRotateCapability.mockRejectedValue(new Error("capability failed"));

    const result = await createPublicReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible crear la reserva.",
    });
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("usa el capability link sólo post-commit y nunca lo retorna al browser", async () => {
    const result = await createPublicReservation(validInput());

    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "+573001112233",
        enlace_cancelar:
          "https://reservas.staging.test/reservas/gestionar/SECRET_CAPABILITY_TOKEN",
        template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
        negocioId: businessId,
      }),
    );
    expect(JSON.stringify(result)).not.toContain(capabilityToken);
    expect(JSON.stringify(result)).not.toContain(reservationId);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("notifica al owner con datos autoritativos y omite esa notificación sin canal", async () => {
    await createPublicReservation(validInput());

    expect(mockNotify).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "+573004445566",
        telefono_cliente: "+573001112233",
        template: PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA,
        negocioId: businessId,
      }),
    );

    mockBusinessFindFirst.mockResolvedValue({
      ...publishedBusiness(),
      telefonoContacto: null,
    });
    mockNotify.mockClear();
    await createPublicReservation(validInput());
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
      }),
    );
  });

  it("mantiene éxito committed si las notificaciones arrojan error", async () => {
    mockNotify.mockRejectedValue(new Error("provider unavailable"));

    const result = await createPublicReservation(validInput());

    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("mantiene éxito committed si el notifier retorna fallo", async () => {
    mockNotify.mockResolvedValue({ ok: false, errorMessage: "remote failure" });

    const result = await createPublicReservation(validInput());

    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("usa Serializable y reintenta una vez ante P2034", async () => {
    mockTransaction
      .mockRejectedValueOnce(knownPrismaError("P2034"))
      .mockImplementation(successfulTransactionImplementation());

    const result = await createPublicReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockTransaction).toHaveBeenNthCalledWith(2, expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("termina controladamente después de tres P2034", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2034"));

    const result = await createPublicReservation(validInput());

    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INTERNAL_ERROR",
      }),
    );
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("no reintenta otros errores Prisma", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2002"));

    const result = await createPublicReservation(validInput());

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INTERNAL_ERROR",
      }),
    );
  });

  it("no contiene enlace legacy ni console.* en el nuevo boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/createPublicReservation.ts"),
      "utf8",
    );

    expect(source).not.toContain("/reservas/eliminar/");
    expect(source).not.toMatch(/console\.(log|warn|error)/);
    expect(source).not.toContain("createEditarReserva");
  });
});
