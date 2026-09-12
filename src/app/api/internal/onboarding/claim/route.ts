import { createHmac, timingSafeEqual } from "node:crypto";

import { AccountClaimError, issueAccountClaim } from "@/lib/auth/account-claim";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIN_HMAC_SECRET_LENGTH = 32;
const MAX_PROVISIONING_REF_LENGTH = 128;
const PROVISIONING_REF_PATTERN = /^[A-Za-z0-9._:-]+$/;
const ALLOWED_BODY_KEYS = new Set(["provisioningRef"]);
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: NO_STORE_HEADERS },
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

function parseProvisioningRef(value: unknown): string | null {
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

  return provisioningRef;
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

  const provisioningRef = parseProvisioningRef(body);
  if (provisioningRef === null) {
    return jsonError("INVALID_REQUEST", 400);
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
      },
    });

    if (!usuario?.isPlaceholder) {
      return jsonError("CLAIM_UNAVAILABLE", 409);
    }

    const negocio = await prisma.negocio.findUnique({
      where: {
        usuarioId: usuario.id,
      },
      select: {
        id: true,
      },
    });

    if (!negocio) {
      return jsonError("CLAIM_UNAVAILABLE", 409);
    }

    const claim = await issueAccountClaim(usuario.id);

    return NextResponse.json(
      {
        ok: true,
        rawToken: claim.rawToken,
        expiresAt: claim.expiresAt.toISOString(),
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    if (error instanceof AccountClaimError) {
      return jsonError("CLAIM_UNAVAILABLE", 409);
    }

    return jsonError("INTERNAL_ERROR", 500);
  }
}
