import "server-only";

import { createHash, randomBytes } from "node:crypto";

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
