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

/**
 * Contrato futuro: issueOrRecoverAccountClaim(input, { keyring }).
 * No cambia issueAccountClaim/validateAccountClaim/consumeAccountClaim legacy.
 *
 * Opción A: HMAC-SHA256, salida base64url de 32 bytes; SHA-256 sigue siendo el
 * verificador de consumo. Mensaje canónico: "myckeo:account-claim:v1\n" seguido
 * de keyId, idempotencyKey, userId y businessId, cada uno en UTF-8 con prefijo
 * decimal de longitud EN BYTES + ":". El framing evita colisiones por concatenación.
 * El keyring es configuración server-only; todas las claves de este test son
 * sintéticas. No se recupera un bearer desde su hash ni se almacena plaintext.
 *
 * Schema futuro mínimo (nullable para claims legacy):
 *   idempotencyKey String? @unique
 *   negocioId String?
 *   derivationKeyId String?
 * El id CUID, usuarioId, tokenHash @unique y timestamps existentes se conservan.
 * negocioId fija identidad, no necesita una nueva relación para este contrato.
 * Las filas de operaciones se conservan: no borrar/reutilizar keys expiradas.
 *
 * Transacción Serializable + unique(idempotencyKey): P2002 se recupera FUERA
 * de la transacción abortada; P2034 reintenta la decisión completa. Una operación
 * distinta no revoca un claim vigente (también protege claims legacy sin key).
 * Rotación: las claves antiguas deben conservarse hasta vencer sus claims;
 * si faltan/no verifican el hash, RECOVERY_UNAVAILABLE, jamás emitir otro token.
 * ACCOUNT_ACTIVE exige !isPlaceholder && perfilCompleto, como el flujo real de
 * activación; !isPlaceholder solo NO demuestra activación.
 */

type IdempotentClaimInput = {
  userId: string;
  businessId: string;
  idempotencyKey: string;
};
type ClaimKeyring = { activeKeyId: string; keys: Record<string, Buffer> };
type RecoverableClaimResult =
  | { status: "CREATED" | "RECOVERED"; claimId: string; rawToken: string; expiresAt: Date }
  | { status: "ALREADY_CONSUMED" | "ACCOUNT_ACTIVE" | "EXPIRED" | "REVOKED" |
      "CONFLICT" | "NOT_CLAIMABLE" | "ACTIVE_CLAIM_EXISTS" | "RECOVERY_UNAVAILABLE" };
type IssueOrRecover = (
  input: IdempotentClaimInput,
  options: { keyring: ClaimKeyring },
) => Promise<RecoverableClaimResult>;

// Export aún ausente: falla cada caso explícitamente, sin romper el typecheck ni
// sustituir la implementación por un stub que haga pasar este contrato.
function idempotentIssuer(): IssueOrRecover {
  const exports = jest.requireActual<typeof import("./account-claim")>("./account-claim") as
    typeof import("./account-claim") & { issueOrRecoverAccountClaim?: IssueOrRecover };
  expect(typeof exports.issueOrRecoverAccountClaim).toBe("function");
  return exports.issueOrRecoverAccountClaim!;
}

type ContractClaimRow = {
  id: string;
  usuarioId: string;
  negocioId: string | null;
  idempotencyKey: string | null;
  derivationKeyId: string | null;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};
type ClaimWhere = Record<string, unknown>;
function isClaimDate(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object Date]";
}

function claimDateTimestamp(value: unknown): number {
  if (!isClaimDate(value)) return Number.NaN;
  try {
    // El getter nativo reconoce Dates de otro realm y rechaza objetos impostores.
    return Date.prototype.getTime.call(value);
  } catch {
    return Number.NaN;
  }
}

function compareClaimValue(actual: unknown, expected: unknown, operator: string): boolean {
  const actualIsDate = isClaimDate(actual);
  const expectedIsDate = isClaimDate(expected);
  const actualTime = claimDateTimestamp(actual);
  const expectedTime = claimDateTimestamp(expected);
  if ((actualIsDate && !Number.isFinite(actualTime)) ||
      (expectedIsDate && !Number.isFinite(expectedTime))) return false;

  if (operator === "equals" || operator === "not") {
    const equal = actualIsDate && expectedIsDate
      ? actualTime === expectedTime
      : actual === expected;
    return operator === "equals" ? equal : !equal;
  }
  if (["lt", "lte", "gt", "gte"].includes(operator)) {
    if (!Number.isFinite(actualTime) || !Number.isFinite(expectedTime)) return false;
    if (operator === "lt") return actualTime < expectedTime;
    if (operator === "lte") return actualTime <= expectedTime;
    if (operator === "gt") return actualTime > expectedTime;
    return actualTime >= expectedTime;
  }
  throw new Error(`Operador no modelado por el mock: ${operator}`);
}

function matchesClaim(row: ContractClaimRow, where: ClaimWhere): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return (Array.isArray(value) ? value : [value]).every(w => matchesClaim(row, w));
    if (key === "OR") return (value as ClaimWhere[]).some(w => matchesClaim(row, w));
    const actual = row[key as keyof ContractClaimRow];
    if (value && typeof value === "object" && !isClaimDate(value)) {
      return Object.entries(value).every(([operator, operand]) =>
        compareClaimValue(actual, operand, operator));
    }
    return compareClaimValue(actual, value, "equals");
  });
}

// Mock de persistencia, no de la máquina de dominio. Trabaja sobre snapshots
// aislados, publica al commit y aplica unicidad; una transacción fallida no publica.
function claimStore() {
  let rows: ContractClaimRow[] = [];
  let revision = 0;
  let sequence = 0;
  const creates = jest.fn();
  const updates = jest.fn();
  const user = { id: usuarioId, isPlaceholder: true, perfilCompleto: false };
  const business = { id: "negocio-1", usuarioId, slug: "negocio-confirmado" };
  const readUser = jest.fn(async () => user as typeof user | null);
  const readBusiness = jest.fn(async () => business as typeof business | null);
  let arrive: (() => void) | undefined;
  let readsToSynchronize = 0;
  let barrier: Promise<void> = Promise.resolve();
  const store = {
    creates, updates, readUser, readBusiness, user, business,
    get rows() { return rows; },
    seed(row: ContractClaimRow) { rows.push(structuredClone(row)); revision++; },
    clear() { rows = []; revision++; },
    synchronizeFirstTwoReads() {
      readsToSynchronize = 2;
      barrier = new Promise<void>(resolve => { arrive = resolve; });
    },
  };
  mockGlobalClaimFindUnique.mockImplementation(async ({ where }: { where: ClaimWhere }) =>
    structuredClone(rows.find(row => matchesClaim(row, where)) ?? null));
  mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const initialRevision = revision;
    const initialIds = new Set(rows.map(row => row.id));
    const local = structuredClone(rows);
    let dirty = false;
    const find = async ({ where }: { where: ClaimWhere }) => {
      const found = structuredClone(local.find(row => matchesClaim(row, where)) ?? null);
      if (readsToSynchronize > 0) {
        readsToSynchronize--;
        if (readsToSynchronize === 0) arrive!();
        await barrier;
      }
      return found;
    };
    const result = await callback({
      usuario: { findUnique: readUser },
      negocio: { findUnique: readBusiness },
      accountClaim: {
        findUnique: jest.fn(find), findFirst: jest.fn(find),
        create: async ({ data }: { data: Omit<ContractClaimRow, "id" | "createdAt" | "consumedAt" | "revokedAt"> }) => {
          creates({ data });
          const row: ContractClaimRow = {
            id: `idempotent-claim-${++sequence}`, createdAt: new Date(),
            consumedAt: null, revokedAt: null, ...data,
          };
          if (local.some(r => r.tokenHash === row.tokenHash ||
            (row.idempotencyKey !== null && r.idempotencyKey === row.idempotencyKey))) {
            throw knownPrismaError("P2002");
          }
          local.push(row); dirty = true;
          return structuredClone(row);
        },
        updateMany: async (args: { where: ClaimWhere; data: Partial<ContractClaimRow> }) => {
          updates(args);
          let count = 0;
          for (const row of local.filter(r => matchesClaim(r, args.where))) {
            Object.assign(row, args.data); count++; dirty = true;
          }
          return { count };
        },
      },
    });
    if (dirty) {
      for (const inserted of local.filter(row => !initialIds.has(row.id))) {
        if (rows.some(row => row.tokenHash === inserted.tokenHash ||
          (inserted.idempotencyKey !== null && row.idempotencyKey === inserted.idempotencyKey))) {
          throw knownPrismaError("P2002");
        }
      }
      if (initialRevision !== revision) throw knownPrismaError("P2034");
      rows = local; revision++;
    }
    return result;
  });
  return store;
}

function successfulClaim(result: RecoverableClaimResult) {
  if (result.status !== "CREATED" && result.status !== "RECOVERED") {
    throw new Error(`Se esperaba un claim recuperable; recibido ${result.status}`);
  }
  return result;
}

describe("issueOrRecoverAccountClaim — contrato futuro de operación idempotente", () => {
  const input: IdempotentClaimInput = {
    userId: usuarioId, businessId: "negocio-1",
    idempotencyKey: "send-profile-activation:pending-business:123",
  };
  // Vector conocido HMAC-SHA256 con clave sintética 0x11 repetida 32 veces.
  const vectorToken = "lyXh3Pt5pAhqJjAdokSV149k5hZ2grNe76mTm2su49A";
  let store: ReturnType<typeof claimStore>;
  let keyring: ClaimKeyring;
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers(); jest.setSystemTime(now);
    keyring = { activeKeyId: "test-v1", keys: { "test-v1": Buffer.alloc(32, 17) } };
    store = claimStore();
  });
  afterEach(() => { jest.useRealTimers(); });
  const issue = (args = input) => idempotentIssuer()(args, { keyring });
  async function issued() { return successfulClaim(await issue()); }
  function unchanged(before: ContractClaimRow[]) {
    expect(store.rows).toEqual(before);
    expect(store.updates).not.toHaveBeenCalled();
  }

  it("primera emisión CREATED: HMAC conocido, hash y TTL existentes, identidad durable mínima", async () => {
    const result = await issued();
    expect(result).toEqual({ status: "CREATED", claimId: expect.any(String), rawToken: vectorToken, expiresAt });
    expect(store.rows).toEqual([{
      id: result.claimId, usuarioId, negocioId: input.businessId,
      idempotencyKey: input.idempotencyKey, derivationKeyId: "test-v1",
      tokenHash: expectedHash(result.rawToken), expiresAt, createdAt: now,
      consumedAt: null, revokedAt: null,
    }]);
    expect(store.creates).toHaveBeenCalledTimes(1);
    expect(store.updates).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("misma key devuelve RECOVERED con mismo id/token/expiry y sin create ni revocación", async () => {
    const first = await issued();
    const before = structuredClone(store.rows);
    jest.setSystemTime(new Date(now.getTime() + 30_000));
    expect(await issue()).toEqual({ ...first, status: "RECOVERED" });
    expect(store.creates).toHaveBeenCalledTimes(1);
    unchanged(before);
  });

  it("respuesta perdida: otro caller reconstruye exactamente el bearer desde keyring + referencias, no hash", async () => {
    await issue(); // Caller descarta la primera respuesta; sólo queda la fila persistida.
    const row = structuredClone(store.rows[0]);
    const freshStore = claimStore(); freshStore.seed(row);
    const recovered = successfulClaim(await issue());
    expect(recovered).toEqual({ status: "RECOVERED", claimId: row.id, rawToken: vectorToken, expiresAt });
    expect(expectedHash(recovered.rawToken)).toBe(row.tokenHash);
    expect(freshStore.creates).not.toHaveBeenCalled();
    expect(freshStore.updates).not.toHaveBeenCalled();
  });

  it("dos llamadas simultáneas ven ausencia; unique/P2002 converge sin dos claims ni revocación", async () => {
    const fn = idempotentIssuer();
    store.synchronizeFirstTwoReads();
    const results = await Promise.all([fn(input, { keyring }), fn(input, { keyring })]);
    expect(results.map(r => r.status).sort()).toEqual(["CREATED", "RECOVERED"]);
    const [first, second] = results.map(successfulClaim);
    expect(first.rawToken).toBe(second.rawToken);
    expect(first.claimId).toBe(second.claimId);
    expect(store.rows).toHaveLength(1);
    expect(store.creates).toHaveBeenCalledTimes(2); // La carrera llega al insert real simulado.
    expect(store.updates).not.toHaveBeenCalled();
  });

  it("P2034 reintenta transacción completa sin regenerar/revocar", async () => {
    idempotentIssuer();
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2034"));
    expect((await issued()).rawToken).toBe(vectorToken);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(store.rows).toHaveLength(1);
    expect(store.updates).not.toHaveBeenCalled();
  });

  it("error DB distinto de P2002/P2034 no se disfraza de recovery o cuenta activa", async () => {
    idempotentIssuer();
    const error = knownPrismaError("P1001");
    mockTransaction.mockRejectedValueOnce(error);
    await expect(issue()).rejects.toBe(error);
    expect(store.rows).toHaveLength(0);
  });

  it.each(["userId", "businessId"] as const)("misma key + %s diferente => CONFLICT aun si ya consumido", async field => {
    await issued(); store.rows[0].consumedAt = now;
    const before = structuredClone(store.rows);
    expect(await issue({ ...input, [field]: "otra-identidad" })).toEqual({ status: "CONFLICT" });
    expect(store.creates).toHaveBeenCalledTimes(1);
    unchanged(before);
  });

  it.each([
    ["consumedAt", "ALREADY_CONSUMED"], ["revokedAt", "REVOKED"], ["expiresAt", "EXPIRED"],
  ] as const)("%s impide devolver/reemitir bearer con la misma key: %s", async (field, status) => {
    await issued(); store.rows[0][field] = now;
    const before = structuredClone(store.rows);
    expect(await issue()).toEqual({ status });
    expect(store.creates).toHaveBeenCalledTimes(1);
    unchanged(before);
  });

  it("consumido prevalece sobre expirado y usuario activado: nunca devolver token reutilizable", async () => {
    await issued(); store.rows[0].consumedAt = now; store.rows[0].expiresAt = now;
    store.user.isPlaceholder = false; store.user.perfilCompleto = true;
    expect(await issue()).toEqual({ status: "ALREADY_CONSUMED" });
    expect(store.creates).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("cuenta activa (con claim previo=%s) es no-op sin emitir/revocar", async existing => {
    if (existing) await issued();
    const before = structuredClone(store.rows);
    store.user.isPlaceholder = false; store.user.perfilCompleto = true;
    expect(await issue()).toEqual({ status: "ACCOUNT_ACTIVE" });
    expect(store.creates).toHaveBeenCalledTimes(existing ? 1 : 0);
    unchanged(before);
  });

  it.each(["usuario ausente", "negocio ausente", "negocio ajeno", "no-placeholder incompleto"])(
    "%s => NOT_CLAIMABLE, no token ni escrituras", async scenario => {
      if (scenario === "usuario ausente") store.readUser.mockResolvedValue(null);
      if (scenario === "negocio ausente") store.readBusiness.mockResolvedValue(null);
      if (scenario === "negocio ajeno") store.business.usuarioId = "otro-usuario";
      if (scenario === "no-placeholder incompleto") store.user.isPlaceholder = false;
      expect(await issue()).toEqual({ status: "NOT_CLAIMABLE" });
      expect(store.creates).not.toHaveBeenCalled();
      unchanged([]);
    },
  );

  it("key diferente no revoca claim vigente de otra operación", async () => {
    await issued(); const before = structuredClone(store.rows);
    expect(await issue({ ...input, idempotencyKey: "otra-operacion-explicita" })).toEqual({ status: "ACTIVE_CLAIM_EXISTS" });
    expect(store.creates).toHaveBeenCalledTimes(1);
    unchanged(before);
  });

  it("claim legacy vigente sin idempotencyKey también impide revocación silenciosa", async () => {
    store.seed({ id: claimId, usuarioId, negocioId: null, idempotencyKey: null,
      derivationKeyId: null, tokenHash: expectedHash(), expiresAt, consumedAt: null,
      revokedAt: null, createdAt: now });
    const before = structuredClone(store.rows);
    expect(await issue()).toEqual({ status: "ACTIVE_CLAIM_EXISTS" });
    expect(store.creates).not.toHaveBeenCalled();
    unchanged(before);
  });

  it.each(["expiresAt", "revokedAt"] as const)("nueva key explícita después de %s permite nuevo token sin modificar fila anterior", async field => {
    const first = await issued(); store.rows[0][field] = now;
    const old = structuredClone(store.rows[0]);
    const next = successfulClaim(await issue({ ...input, idempotencyKey: "otra-operacion-explicita" }));
    expect(next.status).toBe("CREATED");
    expect(next.rawToken).not.toBe(first.rawToken);
    expect(store.rows).toHaveLength(2);
    expect(store.rows[0]).toEqual(old);
    expect(store.updates).not.toHaveBeenCalled();
    expect(await issue()).toEqual({ status: field === "expiresAt" ? "EXPIRED" : "REVOKED" });
  });

  it("dos keys diferentes concurrentes no dejan dos claims vigentes del mismo usuario", async () => {
    const fn = idempotentIssuer(); store.synchronizeFirstTwoReads();
    const results = await Promise.all([
      fn(input, { keyring }), fn({ ...input, idempotencyKey: "otra-operacion-explicita" }, { keyring }),
    ]);
    expect(results.map(r => r.status).sort()).toEqual(["ACTIVE_CLAIM_EXISTS", "CREATED"]);
    expect(store.rows).toHaveLength(1);
    expect(store.updates).not.toHaveBeenCalled();
  });

  it("rotar clave activa conserva recuperación exacta usando derivationKeyId persistido", async () => {
    const first = await issued();
    keyring.keys["test-v2"] = Buffer.alloc(32, 34); keyring.activeKeyId = "test-v2";
    expect(await issue()).toEqual({ ...first, status: "RECOVERED" });
    expect(store.rows[0].derivationKeyId).toBe("test-v1");
    expect(store.creates).toHaveBeenCalledTimes(1);
  });

  it.each(["clave retirada", "material equivocado", "hash corrupto", "fila sin keyId"])(
    "%s => RECOVERY_UNAVAILABLE; jamás derivar un reemplazo ni devolver hash como token", async scenario => {
      await issued();
      if (scenario === "clave retirada") {
        delete keyring.keys["test-v1"];
        keyring.keys["test-v2"] = Buffer.alloc(32, 34); keyring.activeKeyId = "test-v2";
      }
      if (scenario === "material equivocado") keyring.keys["test-v1"] = Buffer.alloc(32, 34);
      if (scenario === "hash corrupto") store.rows[0].tokenHash = "0".repeat(64);
      if (scenario === "fila sin keyId") store.rows[0].derivationKeyId = null;
      const before = structuredClone(store.rows);
      expect(await issue()).toEqual({ status: "RECOVERY_UNAVAILABLE" });
      expect(store.creates).toHaveBeenCalledTimes(1);
      unchanged(before);
    },
  );

  it.each(["ausente", "corta"])("clave activa %s: no emitir con secreto por defecto ni aleatoriedad", async scenario => {
    if (scenario === "ausente") delete keyring.keys["test-v1"];
    else keyring.keys["test-v1"] = Buffer.alloc(8, 17);
    expect(await issue()).toEqual({ status: "RECOVERY_UNAVAILABLE" });
    expect(store.creates).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
  });

  it("el secreto afecta el bearer: referencias públicas y hash solos no permiten reconstruirlo", async () => {
    const first = await issued(); store.clear();
    keyring.keys["test-v1"] = Buffer.alloc(32, 34);
    const second = await issued();
    expect(second.rawToken).not.toBe(first.rawToken);
    expect(second.rawToken).not.toBe(expectedHash(input.idempotencyKey));
  });

  it("no persiste ni retorna secreto/hash; el único bearer sale en éxito, sin logs", async () => {
    const spies = [jest.spyOn(console, "log"), jest.spyOn(console, "error"), jest.spyOn(console, "warn")];
    try {
      const result = await issued();
      const persisted = JSON.stringify({ rows: store.rows, creates: store.creates.mock.calls, updates: store.updates.mock.calls });
      expect(persisted).not.toContain(result.rawToken);
      expect(persisted).not.toContain(keyring.keys["test-v1"].toString("hex"));
      expect(persisted).not.toContain('"type":"Buffer"');
      expect(Object.keys(result).sort()).toEqual(["claimId", "expiresAt", "rawToken", "status"]);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally { for (const spy of spies) spy.mockRestore(); }
  });

  it("bearer derivado mantiene el contrato de validateAccountClaim: SHA-256, formato y expiración", async () => {
    const result = await issued();
    expect(result.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    mockGlobalClaimFindUnique.mockResolvedValue(validValidationRow());
    expect(await validateAccountClaim(result.rawToken)).toEqual({ valid: true, usuarioId, expiresAt });
    expect(mockGlobalClaimFindUnique).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { tokenHash: expectedHash(result.rawToken) },
    }));
    mockGlobalClaimFindUnique.mockResolvedValue(validValidationRow({ expiresAt: now }));
    expect(await validateAccountClaim(result.rawToken)).toEqual({ valid: false });
  });

  it("consumeAccountClaim acepta el bearer derivado y luego recovery retorna ALREADY_CONSUMED", async () => {
    const result = await issued();
    const callback = jest.fn(async ({ usuarioId: id }: { usuarioId: string }) => id);
    expect(await consumeAccountClaim(result.rawToken, callback)).toBe(usuarioId);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(store.rows[0].consumedAt).toEqual(now);
    expect(await issue()).toEqual({ status: "ALREADY_CONSUMED" });
    expect(store.creates).toHaveBeenCalledTimes(1);
  });
});

describe("matchesClaim — fechas del mock entre realms", () => {
  const row: ContractClaimRow = {
    id: claimId, usuarioId, negocioId: null, idempotencyKey: null,
    derivationKeyId: null, tokenHash: expectedHash(), expiresAt,
    consumedAt: null, revokedAt: null, createdAt: now,
  };

  it("structuredClone conserva igualdad temporal directa, equals y not sin identidad de objeto", () => {
    const cloned = structuredClone(row);
    const equivalent = new Date(expiresAt.getTime());
    expect(cloned.expiresAt).not.toBe(equivalent);
    expect(matchesClaim(cloned, { expiresAt: equivalent })).toBe(true);
    expect(matchesClaim(cloned, { expiresAt: { equals: structuredClone(equivalent) } })).toBe(true);
    expect(matchesClaim(cloned, { expiresAt: { not: equivalent } })).toBe(false);
    expect(matchesClaim(cloned, { expiresAt: { not: new Date(expiresAt.getTime() + 1) } })).toBe(true);
  });

  it("lt/lte/gt/gte respetan todos los límites con fechas clonadas en ambos lados", () => {
    const cloned = structuredClone(row);
    const cases = [
      { offset: -1, lt: false, lte: false, gt: true, gte: true },
      { offset: 0, lt: false, lte: true, gt: false, gte: true },
      { offset: 1, lt: true, lte: true, gt: false, gte: false },
    ];
    for (const boundary of cases) {
      for (const operator of ["lt", "lte", "gt", "gte"] as const) {
        const value = structuredClone(new Date(expiresAt.getTime() + boundary.offset));
        expect(matchesClaim(cloned, { expiresAt: { [operator]: value } })).toBe(boundary[operator]);
      }
    }
  });

  it("null, undefined y epoch cero siguen siendo valores diferentes", () => {
    const cloned = structuredClone({ ...row, expiresAt: new Date(0) });
    expect(matchesClaim(cloned, { consumedAt: null, revokedAt: null })).toBe(true);
    expect(matchesClaim(cloned, { consumedAt: undefined })).toBe(false);
    expect(matchesClaim(cloned, { consumedAt: { equals: null } })).toBe(true);
    expect(matchesClaim(cloned, { revokedAt: { not: null } })).toBe(false);
    expect(matchesClaim(cloned, { expiresAt: new Date(0) })).toBe(true);
    expect(matchesClaim(cloned, { expiresAt: null })).toBe(false);
    expect(matchesClaim(cloned, { expiresAt: { gt: null } })).toBe(false);
    expect(compareClaimValue(undefined, undefined, "equals")).toBe(true);
    expect(compareClaimValue(undefined, null, "equals")).toBe(false);
    expect(compareClaimValue(undefined, null, "not")).toBe(true);
  });

  it("rechaza Invalid Date incluso clonado, como valor y como operando", () => {
    const invalid = structuredClone(new Date(Number.NaN));
    const corrupted = structuredClone({ ...row, expiresAt: invalid });
    expect(matchesClaim(row, { expiresAt: invalid })).toBe(false);
    expect(matchesClaim(corrupted, { expiresAt: invalid })).toBe(false);
    for (const operator of ["equals", "not", "lt", "lte", "gt", "gte"]) {
      expect(matchesClaim(row, { expiresAt: { [operator]: invalid } })).toBe(false);
      expect(matchesClaim(corrupted, { expiresAt: { [operator]: expiresAt } })).toBe(false);
    }
  });

  it("no convierte strings/números ni acepta una etiqueta Date falsa", () => {
    for (const value of [expiresAt.toISOString(), expiresAt.getTime(), undefined, null]) {
      expect(compareClaimValue(expiresAt, value, "equals")).toBe(false);
      for (const operator of ["lt", "lte", "gt", "gte"]) {
        expect(compareClaimValue(expiresAt, value, operator)).toBe(false);
        expect(compareClaimValue(value, expiresAt, operator)).toBe(false);
      }
    }
    const fake = { [Symbol.toStringTag]: "Date", getTime: () => expiresAt.getTime() };
    expect(compareClaimValue(fake, expiresAt, "equals")).toBe(false);
    expect(matchesClaim(row, { expiresAt: fake })).toBe(false);
    expect(matchesClaim(row, { usuarioId })).toBe(true);
    expect(matchesClaim(row, { usuarioId: { not: "otra-identidad" } })).toBe(true);
  });
});
