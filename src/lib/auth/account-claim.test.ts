import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockRandomBytes = jest.fn();
const mockTransaction = jest.fn();
const mockGlobalClaimFindUnique = jest.fn();
const mockUsuarioFindUnique = jest.fn();
const mockTxClaimFindUnique = jest.fn();
const mockClaimUpdateMany = jest.fn();
const mockClaimCreate = jest.fn();

const transactionClient = {
  usuario: {
    findUnique: mockUsuarioFindUnique,
  },
  accountClaim: {
    findUnique: mockTxClaimFindUnique,
    updateMany: mockClaimUpdateMany,
    create: mockClaimCreate,
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
      accountClaim: {
        findUnique: mockGlobalClaimFindUnique,
      },
    },
  }),
  { virtual: true },
);

import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import {
  ACCOUNT_CLAIM_TTL_MS,
  consumeAccountClaim,
  issueAccountClaim,
  validateAccountClaim,
} from "./account-claim";

const now = new Date("2026-09-12T15:00:00.000Z");
const expiresAt = new Date("2026-09-12T16:00:00.000Z");
const usuarioId = "usuario-placeholder-1";
const claimId = "claim-1";
const defaultBytes = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index),
);
const defaultRawToken = defaultBytes.toString("base64url");

function expectedHash(rawToken = defaultRawToken): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function validValidationRow(
  overrides: Partial<{
    usuarioId: string;
    expiresAt: Date;
    consumedAt: Date | null;
    revokedAt: Date | null;
    usuario: { isPlaceholder: boolean } | null;
  }> = {},
) {
  return {
    usuarioId,
    expiresAt,
    consumedAt: null,
    revokedAt: null,
    usuario: { isPlaceholder: true },
    ...overrides,
  };
}

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.18.0",
  });
}

describe("account-claim", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.resetAllMocks();

    mockRandomBytes.mockReturnValue(defaultBytes);
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId,
      isPlaceholder: true,
    });
    mockTxClaimFindUnique.mockResolvedValue({
      id: claimId,
      usuarioId,
    });
    mockClaimUpdateMany.mockImplementation(
      async (args: { data: { consumedAt?: Date; revokedAt?: Date } }) => ({
        count: args.data.consumedAt ? 1 : 0,
      }),
    );
    mockClaimCreate.mockResolvedValue({ id: claimId });
    mockGlobalClaimFindUnique.mockResolvedValue(validValidationRow());
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("issueAccountClaim", () => {
    it("genera un bearer CSPRNG base64url de exactamente 32 bytes", async () => {
      const result = await issueAccountClaim(usuarioId);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(result.rawToken).toBe(defaultRawToken);
      expect(result.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(result.rawToken, "base64url")).toHaveLength(32);
    });

    it("genera bearers distintos en emisiones sucesivas", async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.alloc(32, 1))
        .mockReturnValueOnce(Buffer.alloc(32, 2));
      mockClaimCreate
        .mockResolvedValueOnce({ id: "claim-1" })
        .mockResolvedValueOnce({ id: "claim-2" });

      const first = await issueAccountClaim(usuarioId);
      const second = await issueAccountClaim(usuarioId);

      expect(first.rawToken).not.toBe(second.rawToken);
      expect(mockRandomBytes).toHaveBeenCalledTimes(2);
    });

    it("crea el claim placeholder con SHA-256 hex y TTL de 60 minutos", async () => {
      const result = await issueAccountClaim(usuarioId);

      expect(ACCOUNT_CLAIM_TTL_MS).toBe(60 * 60 * 1000);
      expect(result).toEqual({
        rawToken: defaultRawToken,
        expiresAt,
      });
      expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
        where: { id: usuarioId },
        select: { id: true, isPlaceholder: true },
      });
      expect(mockClaimCreate).toHaveBeenCalledWith({
        data: {
          usuarioId,
          tokenHash: expectedHash(),
          expiresAt,
        },
        select: { id: true },
      });
      expect(expectedHash()).toMatch(/^[a-f0-9]{64}$/);
      expect(result.rawToken).not.toBe(expectedHash());
      expect(result).not.toHaveProperty("tokenHash");
      expect(mockTransaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it("reemite revocando todos los claims hermanos pendientes, incluidos expirados", async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.alloc(32, 3))
        .mockReturnValueOnce(Buffer.alloc(32, 4));

      const first = await issueAccountClaim(usuarioId);
      const second = await issueAccountClaim(usuarioId);

      expect(first.rawToken).not.toBe(second.rawToken);
      expect(mockClaimUpdateMany).toHaveBeenCalledTimes(2);
      for (const [args] of mockClaimUpdateMany.mock.calls) {
        expect(args).toEqual({
          where: {
            usuarioId,
            consumedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        expect(args.where).not.toHaveProperty("expiresAt");
      }
      expect(mockClaimCreate).toHaveBeenCalledTimes(2);
    });

    it("no emite cuando Usuario no existe", async () => {
      mockUsuarioFindUnique.mockResolvedValue(null);

      await expect(issueAccountClaim("missing-user")).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(mockClaimUpdateMany).not.toHaveBeenCalled();
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("no emite cuando Usuario ya no es placeholder", async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: usuarioId,
        isPlaceholder: false,
      });

      await expect(issueAccountClaim(usuarioId)).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(mockClaimUpdateMany).not.toHaveBeenCalled();
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("reintenta conflictos serializables antes de crear el único claim pendiente", async () => {
      mockTransaction
        .mockRejectedValueOnce(knownPrismaError("P2034"))
        .mockImplementationOnce(
          async (
            callback: (tx: typeof transactionClient) => Promise<unknown>,
          ) => callback(transactionClient),
        );

      const result = await issueAccountClaim(usuarioId);

      expect(mockTransaction).toHaveBeenCalledTimes(2);
      expect(result.rawToken).toBe(defaultRawToken);
      expect(mockRandomBytes).toHaveBeenCalledTimes(1);
    });
  });

  describe("validateAccountClaim", () => {
    it("retorna sólo usuarioId y expiresAt para un claim válido", async () => {
      const result = await validateAccountClaim(defaultRawToken);

      expect(result).toEqual({ valid: true, usuarioId, expiresAt });
      expect(result).not.toHaveProperty("tokenHash");
      expect(mockGlobalClaimFindUnique).toHaveBeenCalledWith({
        where: { tokenHash: expectedHash() },
        select: {
          usuarioId: true,
          expiresAt: true,
          consumedAt: true,
          revokedAt: true,
          usuario: { select: { isPlaceholder: true } },
        },
      });
    });

    it("retorna invalid cuando el token no existe", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(null);

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando el claim expiró", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ expiresAt: new Date(now.getTime() - 1) }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando expiresAt no es una fecha finita", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ expiresAt: new Date(Number.NaN) }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando el claim fue revocado", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ revokedAt: new Date(now.getTime() - 1) }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando el claim fue consumido", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ consumedAt: new Date(now.getTime() - 1) }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando Usuario ya fue activado", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ usuario: { isPlaceholder: false } }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it("retorna invalid cuando el Usuario asociado no existe", async () => {
      mockGlobalClaimFindUnique.mockResolvedValue(
        validValidationRow({ usuario: null }),
      );

      await expect(validateAccountClaim(defaultRawToken)).resolves.toEqual({
        valid: false,
      });
    });

    it.each([
      ["vacío", ""],
      ["corto", "A".repeat(42)],
      ["largo", "A".repeat(44)],
      ["con padding", `${"A".repeat(42)}=`],
      ["con +", `${"A".repeat(42)}+`],
      ["con /", `${"A".repeat(42)}/`],
      ["gigante", "A".repeat(10_000)],
      ["null", null],
      ["undefined", undefined],
    ])("rechaza token %s sin consultar DB", async (_label, value) => {
      await expect(validateAccountClaim(value)).resolves.toEqual({
        valid: false,
      });

      expect(mockGlobalClaimFindUnique).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe("consumeAccountClaim", () => {
    it("consume atómicamente y ejecuta el callback una vez con el Usuario correcto", async () => {
      const callback = jest.fn().mockResolvedValue({ updated: true });

      const result = await consumeAccountClaim(defaultRawToken, callback);

      expect(result).toEqual({ updated: true });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        tx: transactionClient,
        usuarioId,
      });
      expect(mockClaimUpdateMany.mock.calls[0][0]).toEqual({
        where: {
          tokenHash: expectedHash(),
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      expect(mockTransaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it("propaga el fallo del callback para que Prisma haga rollback completo", async () => {
      const callbackError = new Error("future Usuario update failed");
      let rolledBack = false;
      mockTransaction.mockImplementationOnce(
        async (
          callback: (tx: typeof transactionClient) => Promise<unknown>,
        ) => {
          try {
            return await callback(transactionClient);
          } catch (error) {
            rolledBack = true;
            throw error;
          }
        },
      );

      await expect(
        consumeAccountClaim(defaultRawToken, async () => {
          throw callbackError;
        }),
      ).rejects.toBe(callbackError);

      expect(rolledBack).toBe(true);
      expect(mockClaimUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockClaimUpdateMany.mock.calls[0][0].data).toEqual({
        consumedAt: now,
      });
    });

    it.each(["consumido", "expirado", "revocado"])(
      "no ejecuta callback ni continúa cuando el claim está %s",
      async () => {
        mockClaimUpdateMany.mockResolvedValueOnce({ count: 0 });
        const callback = jest.fn();

        await expect(
          consumeAccountClaim(defaultRawToken, callback),
        ).rejects.toMatchObject({
          name: "AccountClaimError",
          code: "ACCOUNT_CLAIM_UNAVAILABLE",
        });

        expect(callback).not.toHaveBeenCalled();
        expect(mockTxClaimFindUnique).not.toHaveBeenCalled();
      },
    );

    it("revierte el consumo si Usuario ya no es placeholder", async () => {
      mockUsuarioFindUnique.mockResolvedValue({
        id: usuarioId,
        isPlaceholder: false,
      });
      let rolledBack = false;
      mockTransaction.mockImplementationOnce(
        async (
          callback: (tx: typeof transactionClient) => Promise<unknown>,
        ) => {
          try {
            return await callback(transactionClient);
          } catch (error) {
            rolledBack = true;
            throw error;
          }
        },
      );
      const callback = jest.fn();

      await expect(
        consumeAccountClaim(defaultRawToken, callback),
      ).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(rolledBack).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(mockClaimUpdateMany).toHaveBeenCalledTimes(1);
    });

    it("revierte el consumo si el Usuario asociado ya no existe", async () => {
      mockUsuarioFindUnique.mockResolvedValue(null);
      let rolledBack = false;
      mockTransaction.mockImplementationOnce(
        async (
          callback: (tx: typeof transactionClient) => Promise<unknown>,
        ) => {
          try {
            return await callback(transactionClient);
          } catch (error) {
            rolledBack = true;
            throw error;
          }
        },
      );
      const callback = jest.fn();

      await expect(
        consumeAccountClaim(defaultRawToken, callback),
      ).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(rolledBack).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(mockClaimUpdateMany).toHaveBeenCalledTimes(1);
    });

    it("revoca claims hermanos pendientes después del callback, incluso expirados", async () => {
      const events: string[] = [];
      mockClaimUpdateMany.mockImplementation(
        async (args: { data: { consumedAt?: Date; revokedAt?: Date } }) => {
          events.push(args.data.consumedAt ? "consume" : "revoke-siblings");
          return { count: args.data.consumedAt ? 1 : 2 };
        },
      );

      await consumeAccountClaim(defaultRawToken, async () => {
        events.push("callback");
        return undefined;
      });

      expect(events).toEqual(["consume", "callback", "revoke-siblings"]);
      expect(mockClaimUpdateMany.mock.calls[1][0]).toEqual({
        where: {
          usuarioId,
          id: { not: claimId },
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      expect(mockClaimUpdateMany.mock.calls[1][0].where).not.toHaveProperty(
        "expiresAt",
      );
    });

    it("permite exactamente un ganador entre dos consumos competitivos", async () => {
      let consumeAttempts = 0;
      mockClaimUpdateMany.mockImplementation(
        async (args: { data: { consumedAt?: Date; revokedAt?: Date } }) => {
          if (args.data.consumedAt) {
            consumeAttempts += 1;
            return { count: consumeAttempts === 1 ? 1 : 0 };
          }

          return { count: 0 };
        },
      );
      const callback = jest.fn().mockResolvedValue("claimed");

      const outcomes = await Promise.allSettled([
        consumeAccountClaim(defaultRawToken, callback),
        consumeAccountClaim(defaultRawToken, callback),
      ]);

      expect(
        outcomes.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        outcomes.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(consumeAttempts).toBe(2);
    });

    it("rechaza bearer malformado antes de abrir la transacción", async () => {
      const callback = jest.fn();

      await expect(
        consumeAccountClaim("not-a-token", callback),
      ).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it("convierte un conflicto serializable en el mismo error público genérico sin reintentar callback", async () => {
      mockTransaction.mockRejectedValue(knownPrismaError("P2034"));
      const callback = jest.fn();

      await expect(
        consumeAccountClaim(defaultRawToken, callback),
      ).rejects.toMatchObject({
        name: "AccountClaimError",
        code: "ACCOUNT_CLAIM_UNAVAILABLE",
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  it("nunca envía el bearer RAW a Prisma ni lo retorna como hash", async () => {
    const issued = await issueAccountClaim(usuarioId);
    await validateAccountClaim(issued.rawToken);
    await consumeAccountClaim(issued.rawToken, async () => "done");

    const prismaArguments = [
      ...mockUsuarioFindUnique.mock.calls,
      ...mockGlobalClaimFindUnique.mock.calls,
      ...mockTxClaimFindUnique.mock.calls,
      ...mockClaimUpdateMany.mock.calls,
      ...mockClaimCreate.mock.calls,
    ];
    const serializedArguments = JSON.stringify(prismaArguments);

    expect(serializedArguments).not.toContain(issued.rawToken);
    expect(serializedArguments).toContain(expectedHash(issued.rawToken));
    expect(mockClaimCreate.mock.calls[0][0].data.tokenHash).not.toBe(
      issued.rawToken,
    );
  });

  it("es server-only y no contiene logging, password ni provisioning", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/auth/account-claim.ts"),
      "utf8",
    );

    expect(source.startsWith('import "server-only";')).toBe(true);
    expect(source).not.toMatch(/console\.|\blogger\b|JSON\.stringify/);
    expect(source).not.toMatch(/contrase(?:n|ñ)a|password/i);
    expect(source).not.toContain("placeholderProvisioningKeyHash");
    expect(source).not.toMatch(
      /NextResponse|cookies\s*\(|redirect\s*\(|WhatsApp/,
    );
  });
});
