import { NextResponse } from "next/server";

import {
  createAccountActivationSession,
  getAccountActivationCookieClearOptions,
  getAccountActivationCookieName,
  getAccountActivationCookieOptions,
} from "@/lib/auth/account-activation-session";
import { validateAccountClaim } from "@/lib/auth/account-claim";
import { checkAccountActivationBootstrapRateLimit } from "@/lib/security/account-activation-rate-limit";

export const runtime = "nodejs";

const CLEAN_ACTIVATION_PATH = "/activar";
const REDIRECT_STATUS = 303;
const ACCOUNT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function createCleanRedirect(request: Request): NextResponse {
  const response = NextResponse.redirect(
    new URL(CLEAN_ACTIVATION_PATH, request.url),
    REDIRECT_STATUS,
  );

  for (const [name, value] of Object.entries(RESPONSE_HEADERS)) {
    response.headers.set(name, value);
  }

  return response;
}

function clearActivationCookie(response: NextResponse): void {
  response.cookies.set(
    getAccountActivationCookieName(),
    "",
    getAccountActivationCookieClearOptions(),
  );
}

export async function HEAD(request: Request): Promise<NextResponse> {
  return createCleanRedirect(request);
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const response = createCleanRedirect(request);

  try {
    const rateLimit = await checkAccountActivationBootstrapRateLimit(
      request.headers,
    );

    if (!rateLimit.allowed) {
      clearActivationCookie(response);
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const { token } = await context.params;

    if (!ACCOUNT_CLAIM_TOKEN_PATTERN.test(token)) {
      clearActivationCookie(response);
      return response;
    }

    const claim = await validateAccountClaim(token);

    if (!claim.valid) {
      clearActivationCookie(response);
      return response;
    }

    const session = createAccountActivationSession({
      rawToken: token,
      claimExpiresAt: claim.expiresAt,
    });

    response.cookies.set(
      getAccountActivationCookieName(),
      session.value,
      getAccountActivationCookieOptions(session.expiresAt),
    );

    return response;
  } catch {
    clearActivationCookie(response);
    return response;
  }
}
