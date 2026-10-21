import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma, ReservationStatus, Role } from "@prisma/client";

const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockReservationFindFirst = jest.fn();
const mockReservationUpdate = jest.fn();
const mockRotateCapability = jest.fn();
const mockNotify = jest.fn();
const TEST_SITE_ORIGIN = "https://reservas.staging.test";

const transactionClient = {
  reservation: {
    findFirst: mockReservationFindFirst,
    update: mockReservationUpdate,
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

import { updateOwnerReservation } from "./updateOwnerReservation";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

const ownerId = "owner-user-1";
const ownerBusinessId = "owner-business-1";
const reservationId = "owner-reservation-1";
const capabilityToken = "SECRET_UPDATED_CAPABILITY";
const oldStart = new Date("2026-08-20T13:15:00.000Z");
const oldEnd = new Date("2026-08-20T13:45:00.000Z");
const newStart = new Date("2026-08-21T14:15:00.000Z");
const newEnd = new Date("2026-08-21T15:15:00.000Z");

type ReservationRow = {
  id: string;
  estado: ReservationStatus;
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date | null;
  notas: string | null;
};

let existingReservation: ReservationRow;
let transactionActive = false;
let events: string[] = [];

function reservationRow(
  overrides: Partial<ReservationRow> = {},
): ReservationRow {
  return {
    id: reservationId,
    estado: ReservationStatus.PENDIENTE,
    nombre: "Cliente Original",
    telefono: "+573001112233",
    fechaHoraInicio: oldStart,
    fechaHoraFin: oldEnd,
    notas: "Nota original",
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    id: reservationId,
    nombre: "Cliente Original",
    telefono: "3001112233",
    fechaHoraInicio: oldStart.toISOString(),
    fechaHoraFin: oldEnd.toISOString(),
    notas: "Nota original",
    ...overrides,
  };
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
  const result = await updateOwnerReservation(validInput());

  expect(result).toEqual({
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No fue posible actualizar la reserva.",
  });
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockReservationFindFirst).not.toHaveBeenCalled();
  expect(mockReservationUpdate).not.toHaveBeenCalled();
  expect(mockRotateCapability).not.toHaveBeenCalled();
  expect(mockNotify).not.toHaveBeenCalled();
}

beforeEach(() => {
  jest.clearAllMocks();
  transactionActive = false;
  events = [];
  existingReservation = reservationRow();
  process.env.SITE_URL = TEST_SITE_ORIGIN;

  mockAuth.mockResolvedValue({
    user: {
      id: ownerId,
      role: Role.negocio,
      negocioId: ownerBusinessId,
    },
  });
  mockReservationFindFirst.mockImplementation(async () => {
    events.push("reservation:find");
    expect(transactionActive).toBe(true);
    return existingReservation;
  });
  mockReservationUpdate.mockImplementation(async ({ data }) => {
    events.push("reservation:update");
    expect(transactionActive).toBe(true);
    return {
      id: existingReservation.id,
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
      capabilityId: "updated-capability-1",
      token: capabilityToken,
      expiresAt: new Date("2026-08-22T15:15:00.000Z"),
    };
  });
  mockNotify.mockImplementation(async () => {
    events.push("notification");
    expect(transactionActive).toBe(false);
    return { ok: true };
  });
  mockTransaction.mockImplementation(successfulTransactionImplementation());
});

afterEach(() => {
  delete process.env.SITE_URL;
});

describe("updateOwnerReservation", () => {
  it("falla UNAUTHENTICATED antes de Prisma y cualquier efecto", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Debes iniciar sesión para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
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

    const result = await updateOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
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
    "falla cerrado con SITE_URL %s antes de cualquier transacción, incluso para update no temporal",
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

      const result = await updateOwnerReservation(
        validInput({
          fechaHoraInicio: newStart.toISOString(),
          fechaHoraFin: newEnd.toISOString(),
        }),
      );

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

    const result = await updateOwnerReservation(
      validInput({ telefono: "3011112233" }),
    );

    expect(result.ok).toBe(true);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        enlace_cancelar:
          "http://localhost:3000/reservas/gestionar/SECRET_UPDATED_CAPABILITY",
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

  it("busca la Reservation con id y negocioId de sesión en una sola query scoped", async () => {
    const result = await updateOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: reservationId,
        negocioId: ownerBusinessId,
      },
      select: {
        id: true,
        estado: true,
        nombre: true,
        telefono: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        notas: true,
      },
    });
  });

  it.each(["cross-business", "inexistente"])(
    "oculta existencia para Reservation %s",
    async () => {
      mockReservationFindFirst.mockResolvedValue(null);

      const result = await updateOwnerReservation(validInput());

      expect(result).toEqual({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
        message: "No tienes permiso para realizar esta acción.",
      });
      expect(mockReservationUpdate).not.toHaveBeenCalled();
      expect(mockRotateCapability).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    },
  );

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "permite editar Reservation %s",
    async (estado) => {
      existingReservation = reservationRow({ estado });

      const result = await updateOwnerReservation(validInput());

      expect(result.ok).toBe(true);
      expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
    ReservationStatus.BLOQUEADA,
  ])("rechaza Reservation terminal/no cliente %s", async (estado) => {
    existingReservation = reservationRow({ estado });

    const result = await updateOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_NOT_AVAILABLE",
      message: "La reserva no está disponible para esta acción.",
    });
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it.each([
    ["estado", { estado: ReservationStatus.CANCELADA }],
    ["negocioId", { negocioId: "attacker-business" }],
    ["usuarioId", { usuarioId: "attacker-user" }],
    ["slug", { slug: "otro-negocio" }],
    ["reservationId", { reservationId: "otro-id" }],
    ["role", { role: Role.super_admin }],
    ["capabilityId", { capabilityId: "capability-id" }],
    ["token", { token: "secret" }],
  ])("rechaza propiedad no autorizada: %s", async (_label, extra) => {
    const result = await updateOwnerReservation(validInput(extra));

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["id vacío", { id: "  " }],
    ["inicio inválido", { fechaHoraInicio: "invalid" }],
    ["fin inválido", { fechaHoraFin: "invalid" }],
    ["fecha sin timezone", { fechaHoraInicio: "2026-08-20T08:15:00" }],
    ["inicio igual al fin", { fechaHoraFin: oldStart.toISOString() }],
    [
      "inicio posterior al fin",
      {
        fechaHoraInicio: oldEnd.toISOString(),
        fechaHoraFin: oldStart.toISOString(),
      },
    ],
  ])("rechaza %s como INVALID_INPUT", async (_label, overrides) => {
    const result = await updateOwnerReservation(validInput(overrides));

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("actualiza únicamente los cinco campos autorizados", async () => {
    await updateOwnerReservation(
      validInput({
        nombre: "  Cliente Actualizado  ",
        telefono: "301 111 22 33",
        notas: "  Nota actualizada  ",
      }),
    );

    expect(mockReservationUpdate).toHaveBeenCalledWith({
      where: { id: reservationId },
      data: {
        nombre: "Cliente Actualizado",
        telefono: "+573011112233",
        fechaHoraInicio: oldStart,
        fechaHoraFin: oldEnd,
        notas: "Nota actualizada",
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
    const updateData = mockReservationUpdate.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty("estado");
    expect(updateData).not.toHaveProperty("negocioId");
    expect(updateData).not.toHaveProperty("usuarioId");
  });

  it("cambia sólo nombre sin rotar capability ni notificar", async () => {
    const result = await updateOwnerReservation(
      validInput({ nombre: "Cliente Renombrado" }),
    );

    expect(result.ok).toBe(true);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("cambia sólo notas sin rotar capability ni notificar", async () => {
    const result = await updateOwnerReservation(
      validInput({ notas: "Nueva nota interna" }),
    );

    expect(result.ok).toBe(true);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("no rota cuando los valores son iguales después de normalizar", async () => {
    existingReservation = reservationRow({ telefono: "300 111 22 33" });

    const result = await updateOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("rota una vez cuando cambia fechaHoraInicio y notifica post-commit", async () => {
    const result = await updateOwnerReservation(
      validInput({
        fechaHoraInicio: newStart.toISOString(),
        fechaHoraFin: newEnd.toISOString(),
      }),
    );

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledWith(transactionClient, {
      reservationId,
      fechaHoraInicio: newStart,
      fechaHoraFin: newEnd,
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+573001112233",
        template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
        enlace_cancelar:
          "https://reservas.staging.test/reservas/gestionar/SECRET_UPDATED_CAPABILITY",
        fecha_anterior: expect.any(String),
        fecha_nueva: expect.any(String),
        negocioId: ownerBusinessId,
      }),
    );
    expect(events.indexOf("reservation:update")).toBeLessThan(
      events.indexOf("capability:rotate"),
    );
    expect(events.indexOf("capability:rotate")).toBeLessThan(
      events.indexOf("transaction:end"),
    );
    expect(events.indexOf("transaction:end")).toBeLessThan(
      events.indexOf("notification"),
    );
  });

  it("rota y notifica reprogramación cuando cambia sólo fechaHoraFin", async () => {
    const result = await updateOwnerReservation(
      validInput({ fechaHoraFin: newEnd.toISOString() }),
    );

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledWith(transactionClient, {
      reservationId,
      fechaHoraInicio: oldStart,
      fechaHoraFin: newEnd,
    });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
        fecha_anterior: expect.any(String),
        fecha_nueva: expect.any(String),
      }),
    );
    const notification = mockNotify.mock.calls[0][0];
    expect(notification.fecha_anterior).not.toBe(notification.fecha_nueva);
  });

  it("rota capability cuando fechaHoraFin cambia a null", async () => {
    const result = await updateOwnerReservation(
      validInput({ fechaHoraFin: null }),
    );

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledWith(transactionClient, {
      reservationId,
      fechaHoraInicio: oldStart,
      fechaHoraFin: null,
    });
  });

  it("rota por cambio de teléfono y entrega confirmación al teléfono nuevo", async () => {
    const result = await updateOwnerReservation(
      validInput({ telefono: "3011112233" }),
    );

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith({
      to: "+573011112233",
      nombre_cliente: "Cliente Original",
      fechaHora: expect.any(String),
      enlace_cancelar:
        "https://reservas.staging.test/reservas/gestionar/SECRET_UPDATED_CAPABILITY",
      descripcion: "Nota original",
      template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
      negocioId: ownerBusinessId,
    });
  });

  it("rota una sola vez para cambios simultáneos de inicio, fin y teléfono", async () => {
    const result = await updateOwnerReservation(
      validInput({
        telefono: "3011112233",
        fechaHoraInicio: newStart.toISOString(),
        fechaHoraFin: newEnd.toISOString(),
      }),
    );

    expect(result.ok).toBe(true);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+573011112233",
        template: PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO,
      }),
    );
  });

  it("falla atómicamente y no notifica si la rotación falla", async () => {
    mockRotateCapability.mockRejectedValue(new Error("capability failed"));

    const result = await updateOwnerReservation(
      validInput({ fechaHoraInicio: newStart, fechaHoraFin: newEnd }),
    );

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible actualizar la reserva.",
    });
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("no retorna token, id, negocioId ni PII al browser", async () => {
    const result = await updateOwnerReservation(
      validInput({ fechaHoraInicio: newStart, fechaHoraFin: newEnd }),
    );
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(capabilityToken);
    expect(serialized).not.toContain(reservationId);
    expect(serialized).not.toContain(ownerBusinessId);
    expect(serialized).not.toContain("Cliente Original");
    expect(serialized).not.toContain("+573001112233");
    expect(result).toEqual({
      ok: true,
      message: "Reserva actualizada exitosamente.",
    });
  });

  it("usa Serializable en cada intento", async () => {
    await updateOwnerReservation(validInput());

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("reintenta un P2034 y permite éxito en el segundo intento", async () => {
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2034"));

    const result = await updateOwnerReservation(validInput());

    expect(result.ok).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("termina con error controlado después de tres P2034", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2034"));

    const result = await updateOwnerReservation(validInput());

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible actualizar la reserva.",
    });
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("no reintenta otros errores Prisma", async () => {
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2002"));

    const result = await updateOwnerReservation(validInput());

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("mantiene éxito committed cuando falla la notificación", async () => {
    mockNotify.mockRejectedValue(new Error("provider unavailable"));

    const result = await updateOwnerReservation(
      validInput({ telefono: "3011112233" }),
    );

    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      message: "Reserva actualizada exitosamente.",
    });
  });

  it("mantiene éxito committed cuando el notifier retorna fallo", async () => {
    mockNotify.mockResolvedValue({ ok: false, errorMessage: "remote failure" });

    const result = await updateOwnerReservation(
      validInput({ telefono: "3011112233" }),
    );

    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockRotateCapability).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      message: "Reserva actualizada exitosamente.",
    });
  });

  it("no contiene estado mutable, policy pública, availability, enlace legacy ni logs", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/updateOwnerReservation.ts"),
      "utf8",
    );

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("business-visibility-policy");
    expect(source).not.toContain("BusinessAvailability");
    expect(source).not.toContain("capacidadPorIntervalo");
    expect(source).not.toContain("/reservas/eliminar/");
    expect(source).not.toMatch(/console\.(log|warn|error)/);
    expect(source).not.toContain("createEditarReserva");
    expect(source).not.toContain("changeStatusReservations");
  });
});
