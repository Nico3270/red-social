import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ReservationStatus, Role } from "@prisma/client";

const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockBusinessFindUnique = jest.fn();
const mockReservationCreate = jest.fn();
const mockRotateCapability = jest.fn();
const mockNotify = jest.fn();
const TEST_SITE_ORIGIN = "https://reservas.staging.test";

const transactionClient = {
  negocio: {
    findUnique: mockBusinessFindUnique,
  },
  reservation: {
    create: mockReservationCreate,
  },
};

jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
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

import { createOwnerReservation } from "./createOwnerReservation";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

const ownerId = "owner-user-1";
const ownerBusinessId = "owner-business-1";
const reservationId = "owner-reservation-1";
const capabilityToken = "SECRET_OWNER_CAPABILITY";
const start = new Date("2026-08-20T13:15:00.000Z");
const end = new Date("2026-08-20T13:45:00.000Z");

let transactionActive = false;
let events: string[] = [];

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    nombre: "Cliente Externo",
    telefono: "3001112233",
    fechaHoraInicio: start.toISOString(),
    fechaHoraFin: end.toISOString(),
    notas: "Reserva telefónica",
    ...overrides,
  };
}

function transactionImplementation() {
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
  const result = await createOwnerReservation(validInput());

  expect(result).toEqual({
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible crear la reserva.",
  });
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockBusinessFindUnique).not.toHaveBeenCalled();
  expect(mockReservationCreate).not.toHaveBeenCalled();
  expect(mockRotateCapability).not.toHaveBeenCalled();
  expect(mockNotify).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  transactionActive = false;
  events = [];
  process.env.SITE_URL = TEST_SITE_ORIGIN;

  mockAuth.mockResolvedValue({
    user: {
      id: ownerId,
      role: Role.negocio,
      negocioId: ownerBusinessId,
    },
  });
  mockBusinessFindUnique.mockResolvedValue({ id: ownerBusinessId });
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
      capabilityId: "owner-capability-1",
      token: capabilityToken,
      expiresAt: new Date("2026-08-21T13:45:00.000Z"),
    };
  });
  mockNotify.mockImplementation(async () => {
    events.push("notification");
    expect(transactionActive).toBe(false);
    return { ok: true };
  });
  mockTransaction.mockImplementation(transactionImplementation());
});

afterEach(() => {
  delete process.env.SITE_URL;
});

describe("createOwnerReservation", () => {
  it("falla UNAUTHENTICATED antes de Prisma y cualquier efecto", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await createOwnerReservation(validInput());

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

  it.each([
    ["role user", { id: ownerId, role: Role.user, negocioId: ownerBusinessId }],
    [
      "role creador",
      { id: ownerId, role: Role.creador, negocioId: ownerBusinessId },
    ],
    ["sin negocioId", { id: ownerId, role: Role.negocio, negocioId: null }],
    ["negocioId vacío", { id: ownerId, role: Role.negocio, negocioId: "  " }],
  ])("niega sesión sin autoridad owner: %s", async (_label, user) => {
    mockAuth.mockResolvedValue({ user });

    const result = await createOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
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

      const result = await createOwnerReservation(validInput());

      expect(result.ok).toBe(true);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          enlace_cancelar: `${expectedOrigin}/reservas/gestionar/${capabilityToken}`,
        }),
      );
    },
  );

  it("permite loopback explícito fuera de producción", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    process.env.SITE_URL = "http://localhost:3000";

    const result = await createOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        enlace_cancelar:
          "http://localhost:3000/reservas/gestionar/SECRET_OWNER_CAPABILITY",
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

  it("resuelve exclusivamente el Negocio indicado por la sesión", async () => {
    const result = await createOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockBusinessFindUnique).toHaveBeenCalledWith({
      where: { id: ownerBusinessId },
      select: { id: true },
    });
    expect(mockReservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ negocioId: ownerBusinessId }),
      }),
    );
  });

  it("falla RESERVATION_ACCESS_DENIED si el Negocio de sesión no existe", async () => {
    mockBusinessFindUnique.mockResolvedValue(null);

    const result = await createOwnerReservation(validInput());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("permite un Negocio UNLISTED sin consultar flags de publicación", async () => {
    mockBusinessFindUnique.mockResolvedValue({
      id: ownerBusinessId,
      usuario: { isPlaceholder: false, perfilCompleto: false },
    });

    const result = await createOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockBusinessFindUnique).toHaveBeenCalledWith({
      where: { id: ownerBusinessId },
      select: { id: true },
    });
  });

  it.each([
    ["negocioId", { negocioId: "attacker-business" }],
    ["usuarioId", { usuarioId: "attacker-user" }],
    ["slug", { slug: "otro-negocio" }],
    ["reservationId", { reservationId: "reservation-target" }],
    ["role", { role: Role.super_admin }],
  ])(
    "rechaza authority extra controlada por caller: %s",
    async (_label, extra) => {
      const result = await createOwnerReservation(validInput(extra));

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          code: "INVALID_INPUT",
        }),
      );
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockReservationCreate).not.toHaveBeenCalled();
    },
  );

  it.each([
    [undefined, ReservationStatus.PENDIENTE, true],
    [ReservationStatus.PENDIENTE, ReservationStatus.PENDIENTE, true],
    [ReservationStatus.CONFIRMADA, ReservationStatus.CONFIRMADA, true],
    [ReservationStatus.CANCELADA, null, false],
    [ReservationStatus.COMPLETADA, null, false],
    [ReservationStatus.BLOQUEADA, null, false],
  ])(
    "procesa estado %s con autoridad owner",
    async (inputState, expectedState, expectedOk) => {
      const input = validInput(
        inputState === undefined ? {} : { estado: inputState },
      );

      const result = await createOwnerReservation(input);

      expect(result.ok).toBe(expectedOk);
      if (expectedOk) {
        expect(mockReservationCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ estado: expectedState }),
          }),
        );
      } else {
        expect(result).toEqual(
          expect.objectContaining({
            code: "INVALID_INPUT",
          }),
        );
        expect(mockReservationCreate).not.toHaveBeenCalled();
      }
    },
  );

  it("persiste usuarioId=null y datos normalizados", async () => {
    await createOwnerReservation(validInput());

    expect(mockReservationCreate).toHaveBeenCalledWith({
      data: {
        negocioId: ownerBusinessId,
        usuarioId: null,
        nombre: "Cliente Externo",
        telefono: "+573001112233",
        fechaHoraInicio: start,
        fechaHoraFin: end,
        notas: "Reserva telefónica",
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
    ["fecha sin timezone", { fechaHoraInicio: "2026-08-20T08:15:00" }],
    ["inicio igual al fin", { fechaHoraFin: start.toISOString() }],
    [
      "inicio posterior al fin",
      {
        fechaHoraInicio: end.toISOString(),
        fechaHoraFin: start.toISOString(),
      },
    ],
  ])("rechaza %s como INVALID_INPUT", async (_label, overrides) => {
    const result = await createOwnerReservation(validInput(overrides));

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("conserva fechaHoraFin=null para una reserva manual", async () => {
    const result = await createOwnerReservation(
      validInput({ fechaHoraFin: null }),
    );

    expect(result.ok).toBe(true);
    expect(mockReservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fechaHoraFin: null }),
      }),
    );
  });

  it("permite una fecha histórica para carga administrativa", async () => {
    const result = await createOwnerReservation(
      validInput({
        fechaHoraInicio: "2025-08-20T13:15:00.000Z",
        fechaHoraFin: "2025-08-20T13:45:00.000Z",
      }),
    );

    expect(result.ok).toBe(true);
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
  });

  it("crea Reservation y capability en ese orden dentro de una transacción normal", async () => {
    const result = await createOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
    expect(mockRotateCapability).toHaveBeenCalledWith(transactionClient, {
      reservationId,
      fechaHoraInicio: start,
      fechaHoraFin: end,
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

  it("no notifica cuando capability falla dentro de la transacción", async () => {
    mockRotateCapability.mockRejectedValue(new Error("capability failed"));

    const result = await createOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible crear la reserva.",
    });
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("notifica sólo al cliente con capability link y no retorna secretos", async () => {
    const result = await createOwnerReservation(validInput());

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith({
      to: "+573001112233",
      nombre_cliente: "Cliente Externo",
      fechaHora: expect.any(String),
      enlace_cancelar:
        "https://reservas.staging.test/reservas/gestionar/SECRET_OWNER_CAPABILITY",
      descripcion: "Reserva telefónica",
      template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
      negocioId: ownerBusinessId,
    });
    expect(JSON.stringify(result)).not.toContain(capabilityToken);
    expect(JSON.stringify(result)).not.toContain(reservationId);
    expect(JSON.stringify(result)).not.toContain(ownerBusinessId);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("mantiene éxito committed cuando falla la notificación", async () => {
    mockNotify.mockRejectedValue(new Error("provider unavailable"));

    const result = await createOwnerReservation(validInput());

    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("mantiene éxito committed cuando el notifier retorna fallo", async () => {
    mockNotify.mockResolvedValue({ ok: false, errorMessage: "remote failure" });

    const result = await createOwnerReservation(validInput());

    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      message: "Reserva creada exitosamente.",
    });
  });

  it("no contiene policy pública, availability, enlace legacy ni logs", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/createOwnerReservation.ts"),
      "utf8",
    );

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("business-visibility-policy");
    expect(source).not.toContain("BusinessAvailability");
    expect(source).not.toContain("capacidadPorIntervalo");
    expect(source).not.toContain("/reservas/eliminar/");
    expect(source).not.toMatch(/console\.(log|warn|error)/);
    expect(source).not.toContain("createEditarReserva");
  });
});
