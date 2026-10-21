import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const ACCOUNT_CLAIM_TTL_MS = 60 * 60 * 1000;

const ACCOUNT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS = 3;

export type AccountClaimIssueResult = {
  rawToken: string;
  expiresAt: Date;
};

export type AccountClaimValidationResult =
  | {
      valid: true;
      usuarioId: string;
      expiresAt: Date;
    }
  | {
      valid: false;
    };

export type AccountClaimConsumeContext = {
  tx: Prisma.TransactionClient;
  usuarioId: string;
};

export class AccountClaimError extends Error {
  readonly code = "ACCOUNT_CLAIM_UNAVAILABLE";

  constructor() {
    super("Account claim operation failed.");
    this.name = "AccountClaimError";
  }
}

function generateAccountClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashAccountClaimToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getAccountClaimTokenHash(value: unknown): string | null {
  if (typeof value !== "string" || !ACCOUNT_CLAIM_TOKEN_PATTERN.test(value)) {
    return null;
  }

  return hashAccountClaimToken(value);
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function unavailable(): AccountClaimError {
  return new AccountClaimError();
}

export async function issueAccountClaim(
  usuarioId: string,
): Promise<AccountClaimIssueResult> {
  if (typeof usuarioId !== "string" || usuarioId.length === 0) {
    throw unavailable();
  }

  const rawToken = generateAccountClaimToken();
  const tokenHash = hashAccountClaimToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCOUNT_CLAIM_TTL_MS);

  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const usuario = await tx.usuario.findUnique({
            where: {
              id: usuarioId,
            },
            select: {
              id: true,
              isPlaceholder: true,
            },
          });

          if (!usuario?.isPlaceholder) {
            throw unavailable();
          }

          await tx.accountClaim.updateMany({
            where: {
              usuarioId: usuario.id,
              consumedAt: null,
              revokedAt: null,
            },
            data: {
              revokedAt: now,
            },
          });

          await tx.accountClaim.create({
            data: {
              usuarioId: usuario.id,
              tokenHash,
              expiresAt,
            },
            select: {
              id: true,
            },
          });

          return {
            rawToken,
            expiresAt,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        isSerializableConflict(error) &&
        attempt < SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Account claim issue retry invariant failed.");
}

export async function validateAccountClaim(
  rawToken: unknown,
): Promise<AccountClaimValidationResult> {
  const tokenHash = getAccountClaimTokenHash(rawToken);

  if (tokenHash === null) {
    return { valid: false };
  }

  const now = new Date();
  const claim = await prisma.accountClaim.findUnique({
    where: {
      tokenHash,
    },
    select: {
      usuarioId: true,
      expiresAt: true,
      consumedAt: true,
      revokedAt: true,
      usuario: {
        select: {
          isPlaceholder: true,
        },
      },
    },
  });

  if (
    !claim ||
    claim.consumedAt !== null ||
    claim.revokedAt !== null ||
    !Number.isFinite(claim.expiresAt.getTime()) ||
    claim.expiresAt.getTime() <= now.getTime() ||
    !claim.usuario?.isPlaceholder
  ) {
    return { valid: false };
  }

  return {
    valid: true,
    usuarioId: claim.usuarioId,
    expiresAt: claim.expiresAt,
  };
}

export async function consumeAccountClaim<Result>(
  rawToken: unknown,
  callback: (context: AccountClaimConsumeContext) => Promise<Result>,
): Promise<Result> {
  const tokenHash = getAccountClaimTokenHash(rawToken);

  if (tokenHash === null) {
    throw unavailable();
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const consumed = await tx.accountClaim.updateMany({
          where: {
            tokenHash,
            consumedAt: null,
            revokedAt: null,
            expiresAt: {
              gt: now,
            },
          },
          data: {
            consumedAt: now,
          },
        });

        if (consumed.count !== 1) {
          throw unavailable();
        }

        const claim = await tx.accountClaim.findUnique({
          where: {
            tokenHash,
          },
          select: {
            id: true,
            usuarioId: true,
          },
        });

        if (!claim) {
          throw unavailable();
        }

        const usuario = await tx.usuario.findUnique({
          where: {
            id: claim.usuarioId,
          },
          select: {
            id: true,
            isPlaceholder: true,
          },
        });

        if (!usuario?.isPlaceholder) {
          throw unavailable();
        }

        const result = await callback({
          tx,
          usuarioId: usuario.id,
        });

        await tx.accountClaim.updateMany({
          where: {
            usuarioId: usuario.id,
            id: {
              not: claim.id,
            },
            consumedAt: null,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (isSerializableConflict(error)) {
      throw unavailable();
    }

    throw error;
  }
}

export type AccountClaimIssueOrRecoverInput = {
  userId: string;
  businessId: string;
  idempotencyKey: string;
};

export type AccountClaimKeyring = {
  activeKeyId: string;
  keys: Readonly<Record<string, Buffer>>;
};

export type AccountClaimIssueOrRecoverResult =
  | {
      status: "CREATED" | "RECOVERED";
      claimId: string;
      rawToken: string;
      expiresAt: Date;
    }
  | {
      status:
        | "ALREADY_CONSUMED"
        | "ACCOUNT_ACTIVE"
        | "EXPIRED"
        | "REVOKED"
        | "CONFLICT"
        | "NOT_CLAIMABLE"
        | "ACTIVE_CLAIM_EXISTS"
        | "RECOVERY_UNAVAILABLE";
    };

function deriveAccountClaimToken(
  input: AccountClaimIssueOrRecoverInput,
  keyId: string | null,
  keyring: AccountClaimKeyring,
): string | null {
  if (
    !keyId ||
    !keyring?.keys ||
    !Object.prototype.hasOwnProperty.call(keyring.keys, keyId)
  ) {
    return null;
  }

  const secret = keyring.keys[keyId];
  if (!Buffer.isBuffer(secret) || secret.length < 32) {
    return null;
  }

  const hmac = createHmac("sha256", secret);
  hmac.update("myckeo:account-claim:v1\n", "utf8");
  // Lengths are byte lengths, so identities cannot collide through concatenation.
  for (const value of [
    keyId,
    input.idempotencyKey,
    input.userId,
    input.businessId,
  ]) {
    hmac.update(`${Buffer.byteLength(value, "utf8")}:`, "utf8");
    hmac.update(value, "utf8");
  }
  return hmac.digest("base64url");
}

/**
 * The caller supplies a server-only keyring. Retain old keys while their claims
 * need recovery; a missing key never falls back to the active key. Operation
 * rows must be retained so expired/consumed keys cannot become new issuances.
 */
export async function issueOrRecoverAccountClaim(
  input: AccountClaimIssueOrRecoverInput,
  { keyring }: { keyring: AccountClaimKeyring },
): Promise<AccountClaimIssueOrRecoverResult> {
  if (
    !input ||
    [input.userId, input.businessId, input.idempotencyKey].some(
      (value) => typeof value !== "string" || value.trim().length === 0,
    )
  ) {
    return { status: "NOT_CLAIMABLE" };
  }

  // Keep the operation identity stable across awaits and transaction retries.
  const identity = { ...input };
  let creationConflict: Prisma.PrismaClientKnownRequestError | null = null;

  for (
    let attempt = 1;
    attempt <= SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx): Promise<AccountClaimIssueOrRecoverResult> => {
          const now = new Date();
          const claim = await tx.accountClaim.findUnique({
            where: { idempotencyKey: identity.idempotencyKey },
          });

          // P2002 alone does not establish deduplication. A fresh transaction
          // must find this operation's row; otherwise propagate the original
          // error rather than retry an insert after an unrelated unique failure.
          if (creationConflict && !claim) {
            throw creationConflict;
          }

          if (claim) {
            if (
              claim.idempotencyKey !== identity.idempotencyKey ||
              claim.usuarioId !== identity.userId ||
              claim.negocioId !== identity.businessId
            ) {
              return { status: "CONFLICT" };
            }
            if (claim.consumedAt !== null) {
              return { status: "ALREADY_CONSUMED" };
            }
            if (claim.revokedAt !== null) {
              return { status: "REVOKED" };
            }
            if (!Number.isFinite(claim.expiresAt.getTime())) {
              return { status: "RECOVERY_UNAVAILABLE" };
            }
            if (claim.expiresAt.getTime() <= now.getTime()) {
              return { status: "EXPIRED" };
            }
          }

          const [usuario, negocio] = await Promise.all([
            tx.usuario.findUnique({
              where: { id: identity.userId },
              select: { id: true, isPlaceholder: true, perfilCompleto: true },
            }),
            tx.negocio.findUnique({
              where: { id: identity.businessId },
              select: { id: true, usuarioId: true },
            }),
          ]);

          if (
            !usuario ||
            usuario.id !== identity.userId ||
            !negocio ||
            negocio.id !== identity.businessId ||
            negocio.usuarioId !== usuario.id
          ) {
            return { status: "NOT_CLAIMABLE" };
          }
          if (usuario.isPlaceholder === false && usuario.perfilCompleto === true) {
            return { status: "ACCOUNT_ACTIVE" };
          }
          if (usuario.isPlaceholder !== true) {
            return { status: "NOT_CLAIMABLE" };
          }

          if (claim) {
            const rawToken = deriveAccountClaimToken(
              identity,
              claim.derivationKeyId,
              keyring,
            );
            if (
              rawToken === null ||
              !/^[a-f0-9]{64}$/.test(claim.tokenHash) ||
              !timingSafeEqual(
                Buffer.from(hashAccountClaimToken(rawToken), "hex"),
                Buffer.from(claim.tokenHash, "hex"),
              )
            ) {
              return { status: "RECOVERY_UNAVAILABLE" };
            }
            return {
              status: "RECOVERED",
              claimId: claim.id,
              rawToken,
              expiresAt: claim.expiresAt,
            };
          }

          // Protect another operation's live claim, including legacy rows with
          // no idempotency key. Serializable isolation also protects this read
          // against concurrent issuance under a different key for this user.
          const activeClaim = await tx.accountClaim.findFirst({
            where: {
              usuarioId: usuario.id,
              consumedAt: null,
              revokedAt: null,
              expiresAt: { gt: now },
            },
            select: { id: true },
          });
          if (activeClaim) {
            return { status: "ACTIVE_CLAIM_EXISTS" };
          }

          const derivationKeyId = keyring?.activeKeyId;
          const rawToken = deriveAccountClaimToken(identity, derivationKeyId, keyring);
          if (rawToken === null) {
            return { status: "RECOVERY_UNAVAILABLE" };
          }
          const expiresAt = new Date(now.getTime() + ACCOUNT_CLAIM_TTL_MS);
          const created = await tx.accountClaim.create({
            data: {
              usuarioId: usuario.id,
              negocioId: negocio.id,
              idempotencyKey: identity.idempotencyKey,
              derivationKeyId,
              tokenHash: hashAccountClaimToken(rawToken),
              expiresAt,
            },
            select: { id: true },
          });
          return { status: "CREATED", claimId: created.id, rawToken, expiresAt };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isSerializableConflict(error) && attempt < SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS) {
        continue;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        creationConflict === null &&
        attempt < SERIALIZABLE_TRANSACTION_MAX_ATTEMPTS
      ) {
        // PostgreSQL has aborted the transaction: recover only in a new one.
        creationConflict = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error("Account claim recovery retry invariant failed.");
}
