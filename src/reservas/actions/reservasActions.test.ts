import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma, ReservationStatus, Role } from "@prisma/client";

const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockDirectFindUnique = jest.fn();
const mockDirectFindFirst = jest.fn();
const mockDeleteReservation = jest.fn();
const mockDeleteManyReservations = jest.fn();
const mockDirectUpdate = jest.fn();
const mockTxFindFirst = jest.fn();
const mockTxUpdate = jest.fn();
const mockRevokeCapabilities = jest.fn();
const mockGetInformacionReserva = jest.fn();
const mockNotifyReserva = jest.fn();

const transactionClient = {
  reservation: {
    findFirst: mockTxFindFirst,
    update: mockTxUpdate,
  },
};

jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    $transaction: mockTransaction,
    reservation: {
      findUnique: mockDirectFindUnique,
      findFirst: mockDirectFindFirst,
      delete: mockDeleteReservation,
      deleteMany: mockDeleteManyReservations,
      update: mockDirectUpdate,
      create: jest.fn(),
    },
    negocio: { findUnique: jest.fn() },
  },
}));
jest.mock("./getInfoNegocioWhatsapp", () => ({
  getInformacionReserva: mockGetInformacionReserva,
}));
jest.mock("../helpers/notifyReserva", () => ({
  notifyReservaConfirmadaCliente: mockNotifyReserva,
}));
jest.mock("../lib/reservation-capability", () => ({
  revokeActiveReservationCapabilitiesInTx: mockRevokeCapabilities,
}));

import { changeStatusReservations, deleteReserva } from "./reservasActions";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

const ownerUserId = "owner-user-1";
const ownerBusinessId = "negocio-1";
const reservationId = "reserva-1";
const clientPhone = "+573001112233";
const reservationStart = new Date("2026-08-12T15:00:00.000Z");

type ReservationRow = {
  id: string;
  estado: ReservationStatus;
  nombre: string;
  telefono: string;
  fechaHoraInicio: Date;
};

let currentReservation: ReservationRow;
let transactionActive = false;
let events: string[] = [];

function reservationRow(
  overrides: Partial<ReservationRow> = {},
): ReservationRow {
  return {
    id: reservationId,
    estado: ReservationStatus.PENDIENTE,
    nombre: "Cliente autorizado",
    telefono: clientPhone,
    fechaHoraInicio: reservationStart,
    ...overrides,
  };
}

function changeInput(
  nuevoStatus: string = ReservationStatus.CONFIRMADA,
  overrides: Record<string, unknown> = {},
) {
  return {
    negocioId: ownerBusinessId,
    reservaId: reservationId,
    nuevoStatus,
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

const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

beforeEach(() => {
  jest.clearAllMocks();
  transactionActive = false;
  events = [];
  currentReservation = reservationRow();

  mockAuth.mockResolvedValue({
    user: {
      id: ownerUserId,
      role: Role.negocio,
      negocioId: ownerBusinessId,
    },
  });
  mockTransaction.mockImplementation(successfulTransactionImplementation());
  mockTxFindFirst.mockImplementation(async () => {
    events.push("reservation:lookup");
    expect(transactionActive).toBe(true);
    return currentReservation;
  });
  mockTxUpdate.mockImplementation(async ({ data }) => {
    events.push("reservation:update");
    expect(transactionActive).toBe(true);
    return {
      ...currentReservation,
      estado: data.estado,
    };
  });
  mockRevokeCapabilities.mockImplementation(async () => {
    events.push("capability:revoke");
    expect(transactionActive).toBe(true);
    return { revokedCount: 1, revokedAt: new Date() };
  });
  mockNotifyReserva.mockImplementation(async () => {
    events.push("notification");
    expect(transactionActive).toBe(false);
    return { ok: true, message: "enviada" };
  });

  mockDirectFindUnique.mockResolvedValue({
    id: reservationId,
    negocioId: ownerBusinessId,
    nombre: "Cliente autorizado",
    telefono: clientPhone,
    fechaHoraInicio: reservationStart,
  });
  mockGetInformacionReserva.mockResolvedValue({
    ok: true,
    message: "Información obtenida",
    nombre_cliente: "Cliente autorizado",
    telefono_cliente: clientPhone,
    fecha_hora: reservationStart,
    negocioId: ownerBusinessId,
  });
  mockDeleteReservation.mockResolvedValue({ id: reservationId });
});

afterAll(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  logSpy.mockRestore();
});

describe("changeStatusReservations owner boundary", () => {
  it("falla UNAUTHENTICATED antes de Prisma y cualquier efecto", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await changeStatusReservations(changeInput());

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Debes iniciar sesión para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it.each([
    [
      "role user",
      { id: ownerUserId, role: Role.user, negocioId: ownerBusinessId },
    ],
    [
      "role creador",
      { id: ownerUserId, role: Role.creador, negocioId: ownerBusinessId },
    ],
    ["sin negocioId", { id: ownerUserId, role: Role.negocio, negocioId: null }],
    [
      "negocioId vacío",
      { id: ownerUserId, role: Role.negocio, negocioId: "  " },
    ],
  ])("niega sesión sin autoridad owner: %s", async (_label, user) => {
    mockAuth.mockResolvedValue({ user });

    const result = await changeStatusReservations(changeInput());

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it("hace lookup conjunto por reserva y negocio autoritativo de sesión", async () => {
    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CONFIRMADA, {
        negocioId: "negocio-controlado-por-caller",
      }),
    );

    expect(result.ok).toBe(true);
    expect(mockTxFindFirst).toHaveBeenCalledWith({
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
      },
    });
  });

  it.each(["cross-business", "inexistente"])(
    "oculta existencia para Reservation %s",
    async () => {
      mockTxFindFirst.mockResolvedValue(null);

      const result = await changeStatusReservations(
        changeInput(ReservationStatus.CANCELADA, {
          negocioId: "negocio-ajeno",
        }),
      );

      expect(result).toEqual({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
        message: "No tienes permiso para realizar esta acción.",
      });
      expect(mockTxUpdate).not.toHaveBeenCalled();
      expect(mockRevokeCapabilities).not.toHaveBeenCalled();
      expect(mockNotifyReserva).not.toHaveBeenCalled();
    },
  );

  it.each([
    [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
    [ReservationStatus.CONFIRMADA, ReservationStatus.PENDIENTE],
  ])(
    "permite transición no terminal %s → %s sin tocar capability",
    async (currentStatus, newStatus) => {
      currentReservation = reservationRow({ estado: currentStatus });

      const result = await changeStatusReservations(changeInput(newStatus));

      expect(result.ok).toBe(true);
      expect(mockTxUpdate).toHaveBeenCalledWith({
        where: { id: reservationId },
        data: { estado: newStatus },
        select: {
          id: true,
          estado: true,
          nombre: true,
          telefono: true,
          fechaHoraInicio: true,
        },
      });
      expect(mockRevokeCapabilities).not.toHaveBeenCalled();
      expect(mockNotifyReserva).not.toHaveBeenCalled();
    },
  );

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "permite %s → CANCELADA, revoca y notifica con datos autorizados",
    async (currentStatus) => {
      currentReservation = reservationRow({
        estado: currentStatus,
        nombre: "Cliente desde DB",
        telefono: "+573009998877",
      });

      const result = await changeStatusReservations(
        changeInput(ReservationStatus.CANCELADA, {
          negocioId: "negocio-spoof",
        }),
      );

      expect(result.ok).toBe(true);
      expect(mockRevokeCapabilities).toHaveBeenCalledWith(
        transactionClient,
        reservationId,
      );
      expect(mockNotifyReserva).toHaveBeenCalledTimes(1);
      expect(mockNotifyReserva).toHaveBeenCalledWith({
        to: "+573009998877",
        nombre_cliente: "Cliente desde DB",
        fechaHora: expect.any(String),
        template: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
        negocioId: ownerBusinessId,
      });
      expect(events.indexOf("reservation:update")).toBeLessThan(
        events.indexOf("capability:revoke"),
      );
      expect(events.indexOf("capability:revoke")).toBeLessThan(
        events.indexOf("transaction:end"),
      );
      expect(events.indexOf("transaction:end")).toBeLessThan(
        events.indexOf("notification"),
      );
    },
  );

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "permite %s → COMPLETADA y revoca sin inventar notificación",
    async (currentStatus) => {
      currentReservation = reservationRow({ estado: currentStatus });

      const result = await changeStatusReservations(
        changeInput(ReservationStatus.COMPLETADA),
      );

      expect(result.ok).toBe(true);
      expect(mockTxUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { estado: ReservationStatus.COMPLETADA },
        }),
      );
      expect(mockRevokeCapabilities).toHaveBeenCalledWith(
        transactionClient,
        reservationId,
      );
      expect(mockNotifyReserva).not.toHaveBeenCalled();
    },
  );

  it.each([
    ReservationStatus.PENDIENTE,
    ReservationStatus.CONFIRMADA,
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
  ])("trata %s → mismo estado como éxito idempotente", async (status) => {
    currentReservation = reservationRow({ estado: status });

    const result = await changeStatusReservations(changeInput(status));

    expect(result).toEqual({
      ok: true,
      message: `La reserva ya se encuentra en estado ${status}.`,
    });
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it.each([
    [ReservationStatus.CANCELADA, ReservationStatus.PENDIENTE],
    [ReservationStatus.CANCELADA, ReservationStatus.CONFIRMADA],
    [ReservationStatus.CANCELADA, ReservationStatus.COMPLETADA],
    [ReservationStatus.COMPLETADA, ReservationStatus.PENDIENTE],
    [ReservationStatus.COMPLETADA, ReservationStatus.CONFIRMADA],
    [ReservationStatus.COMPLETADA, ReservationStatus.CANCELADA],
  ])("impide reabrir/cambiar terminal %s → %s", async (current, target) => {
    currentReservation = reservationRow({ estado: current });

    const result = await changeStatusReservations(changeInput(target));

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_NOT_AVAILABLE",
      message: "La reserva no está disponible para esta acción.",
    });
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it("rechaza nuevo estado BLOQUEADA como INVALID_INPUT", async () => {
    const result = await changeStatusReservations(
      changeInput(ReservationStatus.BLOQUEADA),
    );

    expect(result).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: "Los datos para cambiar el estado no son válidos.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("no gestiona una Reservation BLOQUEADA", async () => {
    currentReservation = reservationRow({
      estado: ReservationStatus.BLOQUEADA,
    });

    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CONFIRMADA),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
  });

  it("rechaza input malformado o metadata adicional", async () => {
    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CONFIRMADA, {
        nombre: "metadata controlada",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_INPUT" }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("acepta transición terminal legacy aunque revokedCount sea cero", async () => {
    mockRevokeCapabilities.mockResolvedValue({
      revokedCount: 0,
      revokedAt: new Date(),
    });

    const result = await changeStatusReservations(
      changeInput(ReservationStatus.COMPLETADA),
    );

    expect(result.ok).toBe(true);
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).toHaveBeenCalledTimes(1);
  });

  it("falla atómicamente y no notifica cuando revoke falla", async () => {
    mockRevokeCapabilities.mockRejectedValue(new Error("revoke failed"));

    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CANCELADA),
    );

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible cambiar el estado de la reserva.",
    });
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).toHaveBeenCalledTimes(1);
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it("usa Serializable en cada intento", async () => {
    await changeStatusReservations(changeInput());

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("reintenta P2034 y permite éxito en el segundo intento", async () => {
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2034"));

    const result = await changeStatusReservations(changeInput());

    expect(result.ok).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("termina con error controlado después de tres P2034", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2034"));

    const result = await changeStatusReservations(changeInput());

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it("no reintenta otros errores Prisma", async () => {
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2002"));

    const result = await changeStatusReservations(changeInput());

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("mantiene éxito committed cuando falla la notificación", async () => {
    mockNotifyReserva.mockRejectedValue(new Error("provider unavailable"));

    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CANCELADA),
    );

    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).toHaveBeenCalledTimes(1);
    expect(mockNotifyReserva).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it("omite notificación de cancelación sin teléfono pero conserva commit", async () => {
    currentReservation = reservationRow({ telefono: "" });

    const result = await changeStatusReservations(
      changeInput(ReservationStatus.CANCELADA),
    );

    expect(result.ok).toBe(true);
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).toHaveBeenCalledTimes(1);
    expect(mockNotifyReserva).not.toHaveBeenCalled();
  });

  it("no contiene policy pública, hard-delete, links, capability create ni logs en el boundary", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/reservasActions.ts"),
      "utf8",
    );
    const actionStart = source.indexOf(
      "export async function changeStatusReservations",
    );
    const actionEnd = source.indexOf("// Schema para bloquear", actionStart);
    const actionSource = source.slice(actionStart, actionEnd);

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("business-visibility-policy");
    expect(actionSource).not.toMatch(/reservation\.(delete|deleteMany)/);
    expect(actionSource).not.toContain("/reservas/eliminar/");
    expect(actionSource).not.toContain("/reservas/gestionar/");
    expect(actionSource).not.toContain("rotateReservationCapabilityInTx");
    expect(actionSource).not.toMatch(/reservationCapability\.create/);
    expect(actionSource).not.toMatch(/console\.(log|warn|error)/);
  });
});

describe("deleteReserva exposed but inert", () => {
  const unavailableResult = {
    ok: false,
    message: "La eliminación directa de reservas ya no está disponible.",
  };

  it("falla cerrado con IDs sintéticos válidos", async () => {
    await expect(
      deleteReserva({
        negocioId: ownerBusinessId,
        reservaId: reservationId,
      }),
    ).resolves.toEqual(unavailableResult);
  });

  it("devuelve el mismo resultado para llamadas repetidas e IDs distintos", async () => {
    const first = await deleteReserva({
      negocioId: ownerBusinessId,
      reservaId: reservationId,
    });
    const repeated = await deleteReserva({
      negocioId: ownerBusinessId,
      reservaId: reservationId,
    });
    const different = await deleteReserva({
      negocioId: "business-b",
      reservaId: "reservation-b",
    });

    expect(first).toEqual(unavailableResult);
    expect(repeated).toEqual(unavailableResult);
    expect(different).toEqual(unavailableResult);
  });

  it.each([null, undefined, {}, "payload", { negocioId: "", reservaId: "" }])(
    "no crea un oráculo para payload %p",
    async (payload) => {
      await expect(deleteReserva(payload)).resolves.toEqual(unavailableResult);
    },
  );

  it("no ejecuta auth, Prisma, loaders, notificaciones ni logs", async () => {
    await deleteReserva({
      negocioId: "business-b",
      reservaId: "reservation-b",
    });

    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockDirectFindUnique).not.toHaveBeenCalled();
    expect(mockDirectFindFirst).not.toHaveBeenCalled();
    expect(mockDeleteReservation).not.toHaveBeenCalled();
    expect(mockDeleteManyReservations).not.toHaveBeenCalled();
    expect(mockDirectUpdate).not.toHaveBeenCalled();
    expect(mockGetInformacionReserva).not.toHaveBeenCalled();
    expect(mockNotifyReserva).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("conserva la exportación sin ninguna operación funcional", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/reservasActions.ts"),
      "utf8",
    );
    const actionStart = source.indexOf("export async function deleteReserva");
    const actionEnd = source.indexOf(
      "type StatusChangeTransactionResult",
      actionStart,
    );
    const actionSource = source.slice(actionStart, actionEnd);

    expect(actionStart).toBeGreaterThanOrEqual(0);
    expect(actionSource).not.toContain("auth(");
    expect(actionSource).not.toContain("deleteSchema");
    expect(actionSource).not.toContain("prisma.");
    expect(actionSource).not.toMatch(/reservation\.(find|delete|update)/);
    expect(actionSource).not.toContain("getInformacionReserva");
    expect(actionSource).not.toContain("notifyReserva");
    expect(actionSource).not.toContain("ReservationCapability");
    expect(actionSource).not.toContain("buildPublishedBusinessWhere");
    expect(actionSource).not.toMatch(/console\.(log|warn|error)/);
    expect(actionSource).toContain(
      "La eliminación directa de reservas ya no está disponible.",
    );
  });
});
