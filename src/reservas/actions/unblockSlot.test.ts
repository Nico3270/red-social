import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ReservationStatus, Role } from "@prisma/client";

const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockReservationDeleteMany = jest.fn();

const transactionClient = {
  reservation: {
    deleteMany: mockReservationDeleteMany,
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

import { unblockSlot } from "./unblockSlot";

const ownerId = "owner-user-1";
const ownerBusinessId = "owner-business-1";
const reservationId = "blocked-reservation-1";

function successfulTransactionImplementation() {
  return async (
    callback: (tx: typeof transactionClient) => Promise<unknown>,
  ) => callback(transactionClient);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: {
      id: ownerId,
      role: Role.negocio,
      negocioId: ownerBusinessId,
    },
  });
  mockReservationDeleteMany.mockResolvedValue({ count: 1 });
  mockTransaction.mockImplementation(successfulTransactionImplementation());
});

describe("unblockSlot", () => {
  it("falla UNAUTHENTICATED antes de Prisma", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await unblockSlot({ reservationId });

    expect(result).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Debes iniciar sesión para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ["role user", { id: ownerId, role: Role.user, negocioId: ownerBusinessId }],
    [
      "role creador",
      { id: ownerId, role: Role.creador, negocioId: ownerBusinessId },
    ],
    ["sin negocioId", { id: ownerId, role: Role.negocio, negocioId: null }],
    ["negocioId vacío", { id: ownerId, role: Role.negocio, negocioId: "   " }],
  ])("niega sesión sin autoridad owner: %s", async (_label, user) => {
    mockAuth.mockResolvedValue({ user });

    const result = await unblockSlot({ reservationId });

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  });

  it("elimina exactamente una BLOQUEADA del Negocio de sesión", async () => {
    const result = await unblockSlot({ reservationId });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
    expect(mockReservationDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockReservationDeleteMany).toHaveBeenCalledWith({
      where: {
        id: reservationId,
        negocioId: ownerBusinessId,
        estado: ReservationStatus.BLOQUEADA,
      },
    });
    expect(result).toEqual({
      ok: true,
      message: "Intervalo desbloqueado exitosamente.",
    });
  });

  it("usa sólo el negocioId derivado de la sesión", async () => {
    await unblockSlot({ reservationId });

    expect(mockReservationDeleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ negocioId: ownerBusinessId }),
    });
  });

  it("no crea un oracle para una BLOQUEADA cross-business", async () => {
    mockReservationDeleteMany.mockResolvedValue({ count: 0 });

    const result = await unblockSlot({ reservationId: "blocked-business-b" });

    expect(mockReservationDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "blocked-business-b",
        negocioId: ownerBusinessId,
        estado: ReservationStatus.BLOQUEADA,
      },
    });
    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
  });

  it.each([
    ReservationStatus.PENDIENTE,
    ReservationStatus.CONFIRMADA,
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
  ])("no elimina una Reservation real en estado %s", async (estado) => {
    mockReservationDeleteMany.mockResolvedValue({ count: 0 });

    const result = await unblockSlot({ reservationId });

    expect(estado).not.toBe(ReservationStatus.BLOQUEADA);
    expect(mockReservationDeleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        estado: ReservationStatus.BLOQUEADA,
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
  });

  it("mantiene un segundo intento sin efectos y con resultado uniforme", async () => {
    mockReservationDeleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await unblockSlot({ reservationId });
    const second = await unblockSlot({ reservationId });

    expect(first.ok).toBe(true);
    expect(second).toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(mockReservationDeleteMany).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["reservationId vacío", { reservationId: "" }],
    ["reservationId whitespace", { reservationId: "   " }],
    ["reservationId no string", { reservationId: 123 }],
    ["input null", null],
  ])("rechaza input inválido: %s", async (_label, input) => {
    const result = await unblockSlot(input);

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ["negocioId", { negocioId: "attacker-business" }],
    ["estado", { estado: ReservationStatus.BLOQUEADA }],
    ["usuarioId", { usuarioId: "attacker-user" }],
    ["role", { role: Role.negocio }],
    ["nombre", { nombre: "Bloqueado" }],
    ["telefono", { telefono: "N/A" }],
    ["capability", { capability: "secret" }],
  ])("rechaza metadata extra controlada por caller: %s", async (_label, extra) => {
    const result = await unblockSlot({ reservationId, ...extra });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "INVALID_INPUT",
      }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  });

  it("convierte un fallo inesperado en INTERNAL_ERROR sin efectos externos", async () => {
    mockReservationDeleteMany.mockRejectedValue(new Error("database failure"));

    const result = await unblockSlot({ reservationId });

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No fue posible desbloquear el intervalo.",
    });
  });

  it("no importa policies públicas, capability, notifiers, revalidation ni logs", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/unblockSlot.ts"),
      "utf8",
    );

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("business-visibility-policy");
    expect(source).not.toContain("reservation-capability");
    expect(source).not.toContain("notifyReserva");
    expect(source).not.toContain("WhatsApp");
    expect(source).not.toContain("revalidatePath");
    expect(source).not.toMatch(/console\.(log|warn|error)/);
    expect(source).not.toMatch(/reservation\.(delete|update)\s*\(/);
    expect(source).toMatch(/reservation\.deleteMany\s*\(/);
  });
});
