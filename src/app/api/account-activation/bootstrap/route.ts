import { NextResponse } from "next/server";

import {
  createAccountActivationSession,
  getAccountActivationCookieName,
  getAccountActivationCookieOptions,
} from "@/lib/auth/account-activation-session";
import { validateAccountClaim } from "@/lib/auth/account-claim";
import { checkAccountActivationBootstrapRateLimit } from "@/lib/security/account-activation-rate-limit";

export const runtime = "nodejs";

const ACCOUNT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
} as const;
const ERROR_STATUS = {
  INVALID_REQUEST: 400,
  INVALID_ORIGIN: 403,
  ACTIVATION_UNAVAILABLE: 410,
  ACTIVATION_THROTTLED: 429,
  INTERNAL_ERROR: 500,
} as const;

function failure(code: keyof typeof ERROR_STATUS): NextResponse {
  return NextResponse.json(
    { ok: false, code },
    { status: ERROR_STATUS[code], headers: RESPONSE_HEADERS },
  );
}

// Keep the canonical-origin rules consistent with activateAccount.
function isProductionLoopback(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]"
  );
}

function getCanonicalOrigin(): string | null {
  const raw = process.env.SITE_URL;
  if (!raw || raw !== raw.trim()) return null;

  try {
    const siteUrl = new URL(raw);
    if (
      (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.search ||
      siteUrl.hash ||
      siteUrl.pathname !== "/" ||
      isProductionLoopback(siteUrl.hostname)
    ) {
      return null;
    }
    return siteUrl.origin;
  } catch {
    return null;
  }
}

function isValidBody(value: unknown): value is { token: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    Object.keys(body).length === 1 &&
    Object.prototype.hasOwnProperty.call(body, "token") &&
    typeof body.token === "string" &&
    body.token.length === 43 &&
    ACCOUNT_CLAIM_TOKEN_PATTERN.test(body.token)
  );
}

function normalizeRetryAfterSeconds(value: number): number {
  const rounded = Math.ceil(value);
  return Number.isSafeInteger(rounded) ? Math.max(1, rounded) : 60;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const canonicalOrigin = getCanonicalOrigin();
    if (!canonicalOrigin || request.headers.get("origin") !== canonicalOrigin) {
      return failure("INVALID_ORIGIN");
    }

    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return failure("INVALID_REQUEST");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("INVALID_REQUEST");
    }
    if (!isValidBody(body)) return failure("INVALID_REQUEST");

    const rateLimit = await checkAccountActivationBootstrapRateLimit(
      request.headers,
    );
    if (!rateLimit.allowed) {
      const response = failure("ACTIVATION_THROTTLED");
      response.headers.set(
        "Retry-After",
        String(normalizeRetryAfterSeconds(rateLimit.retryAfterSeconds)),
      );
      return response;
    }

    const claim = await validateAccountClaim(body.token);
    if (!claim.valid) return failure("ACTIVATION_UNAVAILABLE");

    const session = createAccountActivationSession({
      rawToken: body.token,
      claimExpiresAt: claim.expiresAt,
    });
    const cookieName = getAccountActivationCookieName();
    const cookieOptions = getAccountActivationCookieOptions(session.expiresAt);
    const response = NextResponse.json(
      { ok: true },
      { status: 200, headers: RESPONSE_HEADERS },
    );
    response.cookies.set(cookieName, session.value, cookieOptions);
    return response;
  } catch {
    // Never reflect or log errors that could contain the bearer or session.
    return failure("INTERNAL_ERROR");
  }
}
