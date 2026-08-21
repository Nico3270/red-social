import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockRandomBytes = jest.fn();
const mockTransaction = jest.fn();
const mockReservationFindUnique = jest.fn();
const mockCapabilityUpdateMany = jest.fn();
const mockCapabilityCreate = jest.fn();

const transactionClient = {
  reservation: {
    findUnique: mockReservationFindUnique,
  },
  reservationCapability: {
    updateMany: mockCapabilityUpdateMany,
    create: mockCapabilityCreate,
  },
};

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("node:crypto", () => ({
  ...jest.requireActual("node:crypto"),
  randomBytes: mockRandomBytes,
}));
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

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  getReservationCapabilityTokenHash,
  isReservationCapabilityActive,
  isValidReservationCapabilityToken,
  reissueReservationCapability,
  revokeActiveReservationCapabilitiesInTx,
  rotateReservationCapabilityInTx,
} from "./reservation-capability";

const now = new Date("2026-08-18T15:00:00.000Z");
const reservationId = "reservation-1";
const start = new Date("2026-09-01T14:00:00.000Z");
const end = new Date("2026-09-01T16:00:00.000Z");
const validToken = "A".repeat(43);

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.18.0",
  });
}

describe("reservation-capability", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();

    mockRandomBytes.mockReturnValue(Buffer.alloc(32, 7));
    mockCapabilityUpdateMany.mockResolvedValue({ count: 0 });
    mockCapabilityCreate.mockResolvedValue({ id: "capability-1" });
    mockReservationFindUnique.mockResolvedValue({
      id: reservationId,
      fechaHoraInicio: start,
      fechaHoraFin: end,
    });
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("ingress token", () => {
    it("acepta exactamente 43 caracteres base64url sin padding", () => {
      expect(isValidReservationCapabilityToken(validToken)).toBe(true);
      expect(
        isValidReservationCapabilityToken(
          "abcdefghijklmnopqrstuvwxyzABCDEFGH0123456_-",
        ),
      ).toBe(true);
    });

    it.each(["", "A".repeat(42), "A".repeat(44)])(
      "rechaza una longitud distinta de 43: %j",
      (value) => {
        expect(isValidReservationCapabilityToken(value)).toBe(false);
      },
    );

    it.each([
      `${"A".repeat(42)}=`,
      `${"A".repeat(42)}+`,
      `${"A".repeat(42)}/`,
      `${"A".repeat(42)} `,
      `${"A".repeat(42)}\n`,
      `${"A".repeat(42)}ñ`,
      `${"A".repeat(42)}😀`,
    ])("rechaza caracteres fuera de base64url: %j", (value) => {
      expect(isValidReservationCapabilityToken(value)).toBe(false);
      expect(getReservationCapabilityTokenHash(value)).toBeNull();
    });

    it("no recorta ni normaliza el token", () => {
      expect(isValidReservationCapabilityToken(` ${validToken}`)).toBe(false);
      expect(isValidReservationCapabilityToken(`${validToken} `)).toBe(false);
      expect(getReservationCapabilityTokenHash(` ${validToken} `)).toBeNull();
    });

    it.each([null, undefined, 43, {}, [], true])(
      "rechaza valores no string: %p",
      (value) => {
        expect(isValidReservationCapabilityToken(value)).toBe(false);
        expect(getReservationCapabilityTokenHash(value)).toBeNull();
      },
    );

    it("retorna el SHA-256 hexadecimal lowercase exacto", () => {
      const expectedHash = createHash("sha256")
        .update(validToken)
        .digest("hex");

      expect(getReservationCapabilityTokenHash(validToken)).toBe(expectedHash);
      expect(getReservationCapabilityTokenHash(validToken)).toMatch(
        /^[a-f0-9]{64}$/,
      );
    });

    it("produce hashes deterministas y distintos para tokens distintos", () => {
      const otherToken = "B".repeat(43);

      expect(getReservationCapabilityTokenHash(validToken)).toBe(
        getReservationCapabilityTokenHash(validToken),
      );
      expect(getReservationCapabilityTokenHash(validToken)).not.toBe(
        getReservationCapabilityTokenHash(otherToken),
      );
    });
  });

  describe("capability lifecycle", () => {
    const activeLifecycle = {
      expiresAt: new Date("2026-08-19T13:00:00.000Z"),
      usedAt: null,
      revokedAt: null,
    };
    const lifecycleNow = new Date("2026-08-19T12:00:00.000Z");

    it("considera activa una capability vigente, no usada y no revocada", () => {
      expect(
        isReservationCapabilityActive(activeLifecycle, lifecycleNow),
      ).toBe(true);
    });

    it("usa la hora actual por defecto", () => {
      expect(isReservationCapabilityActive(activeLifecycle)).toBe(true);
    });

    it("rechaza una capability expirada", () => {
      expect(
        isReservationCapabilityActive(
          {
            ...activeLifecycle,
            expiresAt: new Date("2026-08-19T11:59:59.999Z"),
          },
          lifecycleNow,
        ),
      ).toBe(false);
    });

    it("considera inactiva la expiración exactamente igual a now", () => {
      expect(
        isReservationCapabilityActive(
          { ...activeLifecycle, expiresAt: lifecycleNow },
          lifecycleNow,
        ),
      ).toBe(false);
    });

    it("rechaza una capability usada aunque siga vigente", () => {
      expect(
        isReservationCapabilityActive(
          { ...activeLifecycle, usedAt: new Date("2026-08-19T11:00:00.000Z") },
          lifecycleNow,
        ),
      ).toBe(false);
    });

    it("rechaza una capability revocada aunque siga vigente", () => {
      expect(
        isReservationCapabilityActive(
          {
            ...activeLifecycle,
            revokedAt: new Date("2026-08-19T11:00:00.000Z"),
          },
          lifecycleNow,
        ),
      ).toBe(false);
    });

    it("rechaza una capability usada y revocada", () => {
      const inactiveAt = new Date("2026-08-19T11:00:00.000Z");

      expect(
        isReservationCapabilityActive(
          {
            ...activeLifecycle,
            usedAt: inactiveAt,
            revokedAt: inactiveAt,
          },
          lifecycleNow,
        ),
      ).toBe(false);
    });

    it("falla cerrado con expiresAt o now inválidos", () => {
      expect(
        isReservationCapabilityActive(
          { ...activeLifecycle, expiresAt: new Date(Number.NaN) },
          lifecycleNow,
        ),
      ).toBe(false);
      expect(
        isReservationCapabilityActive(activeLifecycle, new Date(Number.NaN)),
      ).toBe(false);
    });

    it("no usa Prisma ni genera randomness para validar, hashear o evaluar lifecycle", () => {
      expect(isValidReservationCapabilityToken(validToken)).toBe(true);
      expect(getReservationCapabilityTokenHash(validToken)).not.toBeNull();
      expect(
        isReservationCapabilityActive(activeLifecycle, lifecycleNow),
      ).toBe(true);

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockReservationFindUnique).not.toHaveBeenCalled();
      expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
      expect(mockCapabilityCreate).not.toHaveBeenCalled();
      expect(mockRandomBytes).not.toHaveBeenCalled();
    });
  });

  it("genera tokens CSPRNG base64url de 32 bytes y tokens sucesivos distintos", async () => {
    mockRandomBytes
      .mockReturnValueOnce(Buffer.alloc(32, 1))
      .mockReturnValueOnce(Buffer.alloc(32, 2));
    mockCapabilityCreate
      .mockResolvedValueOnce({ id: "capability-1" })
      .mockResolvedValueOnce({ id: "capability-2" });

    const first = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: null },
    );
    const second = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: null },
    );

    expect(mockRandomBytes).toHaveBeenNthCalledWith(1, 32);
    expect(mockRandomBytes).toHaveBeenNthCalledWith(2, 32);
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
  });

  it("persiste sólo SHA-256 hexadecimal y nunca el token plaintext", async () => {
    const bytes = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
    mockRandomBytes.mockReturnValue(bytes);

    const result = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: null },
    );
    const expectedToken = bytes.toString("base64url");
    const expectedHash = createHash("sha256")
      .update(expectedToken)
      .digest("hex");
    const createData = mockCapabilityCreate.mock.calls[0][0].data;

    expect(result.token).toBe(expectedToken);
    expect(createData).toEqual({
      reservationId,
      tokenHash: expectedHash,
      expiresAt: new Date("2026-09-02T14:00:00.000Z"),
    });
    expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createData).not.toHaveProperty("token");
    expect(createData).not.toHaveProperty("usedAt");
    expect(createData).not.toHaveProperty("revokedAt");
    expect(createData).not.toHaveProperty("createdAt");
  });

  it("expira 24 horas después del inicio cuando no existe fecha fin", async () => {
    const result = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: null },
    );

    expect(result.expiresAt).toEqual(new Date("2026-09-02T14:00:00.000Z"));
  });

  it("expira 24 horas después del fin cuando es posterior al inicio", async () => {
    const result = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: end },
    );

    expect(result.expiresAt).toEqual(new Date("2026-09-02T16:00:00.000Z"));
  });

  it("usa el inicio como base cuando el fin legacy es anterior", async () => {
    const result = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      {
        reservationId,
        fechaHoraInicio: start,
        fechaHoraFin: new Date("2026-09-01T12:00:00.000Z"),
      },
    );

    expect(result.expiresAt).toEqual(new Date("2026-09-02T14:00:00.000Z"));
  });

  it.each([
    [new Date("invalid"), null],
    [start, new Date("invalid")],
    [new Date(8.64e15), null],
  ])(
    "rechaza fechas inválidas antes de escribir",
    async (startDate, endDate) => {
      await expect(
        rotateReservationCapabilityInTx(
          transactionClient as unknown as Prisma.TransactionClient,
          {
            reservationId,
            fechaHoraInicio: startDate,
            fechaHoraFin: endDate,
          },
        ),
      ).rejects.toMatchObject({
        name: "ReservationCapabilityError",
        code: "INVALID_RESERVATION_DATES",
      });

      expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
      expect(mockCapabilityCreate).not.toHaveBeenCalled();
      expect(mockRandomBytes).not.toHaveBeenCalled();
    },
  );

  it("revoca únicamente capabilities activas previas con el mismo now", async () => {
    await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: end },
    );

    expect(mockCapabilityUpdateMany).toHaveBeenCalledWith({
      where: {
        reservationId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
  });

  it("revoca antes de crear y conserva las filas históricas por filtro", async () => {
    const events: string[] = [];
    mockCapabilityUpdateMany.mockImplementation(async () => {
      events.push("revoke");
      return { count: 1 };
    });
    mockCapabilityCreate.mockImplementation(async () => {
      events.push("create");
      return { id: "capability-1" };
    });

    await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: end },
    );

    expect(events).toEqual(["revoke", "create"]);
    const where = mockCapabilityUpdateMany.mock.calls[0][0].where;
    expect(where.usedAt).toBeNull();
    expect(where.revokedAt).toBeNull();
    expect(where.expiresAt).toEqual({ gt: now });
  });

  it("revoke-only revoca exactamente las capabilities activas", async () => {
    mockCapabilityUpdateMany.mockResolvedValue({ count: 1 });

    const result = await revokeActiveReservationCapabilitiesInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      reservationId,
    );

    expect(mockCapabilityUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockCapabilityUpdateMany).toHaveBeenCalledWith({
      where: {
        reservationId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
    expect(result).toEqual({
      revokedCount: 1,
      revokedAt: now,
    });
  });

  it("revoke-only es idempotente cuando no existe capability activa", async () => {
    mockCapabilityUpdateMany.mockResolvedValue({ count: 0 });

    const result = await revokeActiveReservationCapabilitiesInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      reservationId,
    );

    expect(result).toEqual({
      revokedCount: 0,
      revokedAt: now,
    });
    expect(mockCapabilityUpdateMany).toHaveBeenCalledTimes(1);
  });

  it.each(["", "   "])(
    "revoke-only rechaza reservationId inválido antes de Prisma: %j",
    async (invalidReservationId) => {
      await expect(
        revokeActiveReservationCapabilitiesInTx(
          transactionClient as unknown as Prisma.TransactionClient,
          invalidReservationId,
        ),
      ).rejects.toMatchObject({
        name: "ReservationCapabilityError",
        code: "INVALID_RESERVATION_ID",
      });

      expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
      expect(mockCapabilityCreate).not.toHaveBeenCalled();
      expect(mockRandomBytes).not.toHaveBeenCalled();
    },
  );

  it("revoke-only normaliza reservationId y no genera crypto ni filas nuevas", async () => {
    const result = await revokeActiveReservationCapabilitiesInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      `  ${reservationId}  `,
    );

    expect(result.revokedCount).toBe(0);
    expect(mockCapabilityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reservationId }),
      }),
    );
    expect(mockCapabilityCreate).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("token");
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("retorna sólo capabilityId, token y expiresAt", async () => {
    const result = await rotateReservationCapabilityInTx(
      transactionClient as unknown as Prisma.TransactionClient,
      { reservationId, fechaHoraInicio: start, fechaHoraFin: end },
    );

    expect(result).toEqual({
      capabilityId: "capability-1",
      token: Buffer.alloc(32, 7).toString("base64url"),
      expiresAt: new Date("2026-09-02T16:00:00.000Z"),
    });
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("reissue usa lookup mínimo, Serializable y emite dentro del tx", async () => {
    const result = await reissueReservationCapability(reservationId);

    expect(mockReservationFindUnique).toHaveBeenCalledWith({
      where: { id: reservationId },
      select: {
        id: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
      },
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mockCapabilityUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockCapabilityCreate).toHaveBeenCalledTimes(1);
    expect(result.capabilityId).toBe("capability-1");
  });

  it("no crea capability cuando Reservation no existe", async () => {
    mockReservationFindUnique.mockResolvedValue(null);

    await expect(
      reissueReservationCapability("missing-reservation"),
    ).rejects.toMatchObject({
      name: "ReservationCapabilityError",
      code: "RESERVATION_CAPABILITY_UNAVAILABLE",
    });

    expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
    expect(mockCapabilityCreate).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("reintenta P2034 y permite éxito en el segundo intento", async () => {
    mockTransaction
      .mockRejectedValueOnce(knownPrismaError("P2034"))
      .mockImplementationOnce(
        async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
          callback(transactionClient),
      );

    const result = await reissueReservationCapability(reservationId);

    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(result.capabilityId).toBe("capability-1");
  });

  it("termina después de tres P2034 sin loop infinito", async () => {
    const conflict = knownPrismaError("P2034");
    mockTransaction.mockRejectedValue(conflict);

    await expect(reissueReservationCapability(reservationId)).rejects.toBe(
      conflict,
    );
    expect(mockTransaction).toHaveBeenCalledTimes(3);
  });

  it("no reintenta P2002 ni otros errores", async () => {
    const uniqueError = knownPrismaError("P2002");
    mockTransaction.mockRejectedValue(uniqueError);

    await expect(reissueReservationCapability(reservationId)).rejects.toBe(
      uniqueError,
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("es server-only y no importa auth, PUBLISHED, visibilidad ni logs", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/lib/reservation-capability.ts"),
      "utf8",
    );

    expect(source).toContain('import "server-only";');
    expect(source).not.toContain('"use server"');
    expect(source).not.toMatch(/auth\.config|\bauth\s*\(/);
    expect(source).not.toMatch(
      /business-visibility-policy|buildPublishedBusinessWhere|PUBLISHED|UNLISTED|HIDDEN/,
    );
    expect(source).not.toMatch(/nombre|telefono|notas|usuarioId|negocioId/);
    expect(source).not.toMatch(/console\./);
  });
});
