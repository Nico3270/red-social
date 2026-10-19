import { createHmac, timingSafeEqual } from "node:crypto";

import {
  AccountClaimError,
  issueAccountClaim,
  issueOrRecoverAccountClaim,
  type AccountClaimIssueResult,
  type AccountClaimKeyring,
} from "@/lib/auth/account-claim";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIN_HMAC_SECRET_LENGTH = 32;
const MAX_PROVISIONING_REF_LENGTH = 128;
const PROVISIONING_REF_PATTERN = /^[A-Za-z0-9._:-]+$/;
const ALLOWED_BODY_KEYS = new Set(["provisioningRef", "idempotencyKey"]);
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

type ClaimProfile = { userId: string; businessId: string; slug: string };

function jsonError(
  code: string,
  httpStatus: number,
  status = code,
  profile?: ClaimProfile,
) {
  return NextResponse.json(
    { ok: false, code, status, ...(profile ? { profile } : {}) },
    { status: httpStatus, headers: NO_STORE_HEADERS },
  );
}

function jsonClaim(
  claim: AccountClaimIssueResult,
  status: "CLAIM_ISSUED" | "CLAIM_RECOVERED",
  profile: ClaimProfile,
) {
  return NextResponse.json(
    {
      ok: true,
      status,
      rawToken: claim.rawToken,
      expiresAt: claim.expiresAt.toISOString(),
      profile,
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

function hasValidApiKey(request: Request): boolean {
  const suppliedKey = request.headers.get("x-api-key");
  const configuredKey = process.env.MYCKEO_ADMIN_KEY;

  if (
    typeof suppliedKey !== "string" ||
    typeof configuredKey !== "string" ||
    suppliedKey.length === 0 ||
    suppliedKey.length !== configuredKey.length
  ) {
    return false;
  }

  const suppliedBytes = Buffer.from(suppliedKey, "utf8");
  const configuredBytes = Buffer.from(configuredKey, "utf8");

  return (
    suppliedBytes.length === configuredBytes.length &&
    timingSafeEqual(suppliedBytes, configuredBytes)
  );
}

function getHmacSecret(): string | null {
  const secret = process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;

  if (
    typeof secret !== "string" ||
    secret.length < MIN_HMAC_SECRET_LENGTH ||
    secret !== secret.trim()
  ) {
    return null;
  }

  return secret;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ClaimRequest = { provisioningRef: string; idempotencyKey?: string };

function parseClaimRequest(value: unknown): ClaimRequest | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))
  ) {
    return null;
  }

  const { provisioningRef } = value;
  if (
    typeof provisioningRef !== "string" ||
    provisioningRef.length === 0 ||
    provisioningRef.length > MAX_PROVISIONING_REF_LENGTH ||
    provisioningRef !== provisioningRef.trim() ||
    !PROVISIONING_REF_PATTERN.test(provisioningRef)
  ) {
    return null;
  }

  // Presence selects the idempotent path; invalid values never select legacy.
  if (Object.prototype.hasOwnProperty.call(value, "idempotencyKey")) {
    const { idempotencyKey } = value;
    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length === 0 ||
      idempotencyKey !== idempotencyKey.trim()
    ) {
      return null;
    }
    return { provisioningRef, idempotencyKey };
  }

  return { provisioningRef };
}

function getClaimKeyring(): AccountClaimKeyring | null {
  const configured = process.env.ACCOUNT_CLAIM_KEYRING;
  if (!configured) return null;

  try {
    const value: unknown = JSON.parse(configured);
    if (
      !isRecord(value) ||
      typeof value.activeKeyId !== "string" ||
      value.activeKeyId.length === 0 ||
      value.activeKeyId !== value.activeKeyId.trim() ||
      !isRecord(value.keys) ||
      !Object.prototype.hasOwnProperty.call(value.keys, value.activeKeyId)
    ) {
      return null;
    }

    const entries: [string, Buffer][] = [];
    for (const [keyId, encoded] of Object.entries(value.keys)) {
      if (!keyId || keyId !== keyId.trim() || typeof encoded !== "string") {
        return null;
      }
      const secret = Buffer.from(encoded, "base64");
      // Buffer's decoder is permissive: require the canonical representation.
      if (secret.length < MIN_HMAC_SECRET_LENGTH || secret.toString("base64") !== encoded) {
        return null;
      }
      entries.push([keyId, secret]);
    }

    // Retain prior versions for recovery; only the domain chooses a claim's key.
    return { activeKeyId: value.activeKeyId, keys: Object.fromEntries(entries) };
  } catch {
    return null;
  }
}

function hashProvisioningRef(
  provisioningRef: string,
  hmacSecret: string,
): string {
  return createHmac("sha256", hmacSecret)
    .update(provisioningRef, "utf8")
    .digest("hex");
}

export async function POST(request: Request) {
  if (!hasValidApiKey(request)) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const hmacSecret = getHmacSecret();
  if (hmacSecret === null) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_REQUEST", 400);
  }

  const input = parseClaimRequest(body);
  if (input === null) {
    return jsonError("INVALID_REQUEST", 400);
  }

  const { provisioningRef, idempotencyKey } = input;
  const keyring = idempotencyKey === undefined ? null : getClaimKeyring();
  if (idempotencyKey !== undefined && keyring === null) {
    return jsonError("INTERNAL_ERROR", 500);
  }
  const provisioningHash = hashProvisioningRef(provisioningRef, hmacSecret);

  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        placeholderProvisioningKeyHash: provisioningHash,
      },
      select: {
        id: true,
        isPlaceholder: true,
        perfilCompleto: true,
      },
    });

    if (!usuario) {
      return jsonError("CLAIM_UNAVAILABLE", 404, "USER_NOT_FOUND");
    }

    const negocio = await prisma.negocio.findUnique({
      where: {
        usuarioId: usuario.id,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!negocio) {
      return jsonError("CLAIM_UNAVAILABLE", 404, "BUSINESS_NOT_FOUND");
    }

    const profile = { userId: usuario.id, businessId: negocio.id, slug: negocio.slug };
    if (usuario.isPlaceholder === false && usuario.perfilCompleto === true) {
      return jsonError("CLAIM_UNAVAILABLE", 409, "ACCOUNT_ALREADY_ACTIVE", profile);
    }
    if (usuario.isPlaceholder !== true) {
      return jsonError("CLAIM_UNAVAILABLE", 409, "USER_NOT_CLAIMABLE");
    }

    // Temporary compatibility for callers that have not supplied an operation key.
    if (idempotencyKey === undefined) {
      const claim = await issueAccountClaim(usuario.id);
      return jsonClaim(claim, "CLAIM_ISSUED", profile);
    }

    if (keyring === null) return jsonError("INTERNAL_ERROR", 500);
    const result = await issueOrRecoverAccountClaim(
      { userId: usuario.id, businessId: negocio.id, idempotencyKey },
      { keyring },
    );

    switch (result.status) {
      case "CREATED":
        return jsonClaim(result, "CLAIM_ISSUED", profile);
      case "RECOVERED":
        return jsonClaim(result, "CLAIM_RECOVERED", profile);
      case "ACCOUNT_ACTIVE":
        // The domain rechecks account readiness and business identity transactionally.
        return jsonError("CLAIM_UNAVAILABLE", 409, "ACCOUNT_ALREADY_ACTIVE", profile);
      case "NOT_CLAIMABLE":
        return jsonError("CLAIM_UNAVAILABLE", 409, "USER_NOT_CLAIMABLE");
      case "CONFLICT":
        return jsonError("CLAIM_UNAVAILABLE", 409, "CLAIM_CONFLICT");
      case "ALREADY_CONSUMED":
      case "ACTIVE_CLAIM_EXISTS":
      case "RECOVERY_UNAVAILABLE":
        return jsonError("CLAIM_UNAVAILABLE", 409, result.status);
      case "EXPIRED":
        return jsonError("CLAIM_UNAVAILABLE", 410, "CLAIM_EXPIRED");
      case "REVOKED":
        return jsonError("CLAIM_UNAVAILABLE", 410, "CLAIM_REVOKED");
      default:
        return jsonError("INTERNAL_ERROR", 500);
    }
  } catch (error) {
    if (idempotencyKey === undefined && error instanceof AccountClaimError) {
      return jsonError("CLAIM_UNAVAILABLE", 409);
    }

    return jsonError("INTERNAL_ERROR", 500);
  }
}
