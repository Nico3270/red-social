import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const KEY_DOMAIN = "myckeo-account-activation-rate-limit:v1";
const SECRET_MIN_BYTES = 32;
const CSRF_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
] as const;
const UNAVAILABLE_RETRY_SECONDS = 60;

const PREFIX = {
  bootstrapIp: "myckeo:account-activation:bootstrap-ip",
  submitIp: "myckeo:account-activation:submit-ip",
  submitSession: "myckeo:account-activation:submit-session",
} as const;

export type AccountActivationRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterSeconds: number;
      reason: "LIMITED" | "UNAVAILABLE";
    };

type Limiters = {
  bootstrapIp: Ratelimit;
  submitIp: Ratelimit;
  submitSession: Ratelimit;
};

let limiters: Limiters | undefined;

function getRateLimitKey(): Buffer {
  const secret = process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;

  if (
    typeof secret !== "string" ||
    secret !== secret.trim() ||
    Buffer.byteLength(secret, "utf8") < SECRET_MIN_BYTES
  ) {
    throw new Error("Account activation rate limit is unavailable");
  }

  return createHmac("sha256", secret).update(KEY_DOMAIN, "utf8").digest();
}

function opaqueIdentifier(key: Buffer, kind: "ip" | "session", value: string): string {
  return createHmac("sha256", key)
    .update(`${kind}:${value}`, "utf8")
    .digest("hex");
}

function getClientIp(headers: Headers): string {
  for (const name of IP_HEADERS) {
    const value = headers.get(name);
    if (!value || value.length > 256 || /[\r\n]/.test(value)) continue;

    const candidate = value?.split(",", 1)[0]?.trim();

    if (
      candidate &&
      candidate.length <= 45 &&
      !/[\x00-\x1f\x7f]/.test(candidate) &&
      isIP(candidate) !== 0
    ) {
      return candidate.toLowerCase();
    }
  }

  return "unknown";
}

function getLimiters(): Limiters {
  if (limiters) return limiters;

  if (
    !process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    !process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ) {
    throw new Error("Account activation rate limit is unavailable");
  }

  const redis = Redis.fromEnv();
  limiters = {
    bootstrapIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 m"),
      prefix: PREFIX.bootstrapIp,
    }),
    submitIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: PREFIX.submitIp,
    }),
    submitSession: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: PREFIX.submitSession,
    }),
  };

  return limiters;
}

function retryAfterSeconds(reset: number): number {
  return Number.isFinite(reset)
    ? Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    : UNAVAILABLE_RETRY_SECONDS;
}

function unavailable(): AccountActivationRateLimitResult {
  return {
    allowed: false,
    reason: "UNAVAILABLE",
    retryAfterSeconds: UNAVAILABLE_RETRY_SECONDS,
  };
}

export async function checkAccountActivationBootstrapRateLimit(
  headers: Headers,
): Promise<AccountActivationRateLimitResult> {
  try {
    const key = getRateLimitKey();
    const identifier = opaqueIdentifier(key, "ip", getClientIp(headers));
    const result = await getLimiters().bootstrapIp.limit(identifier);

    return result.success
      ? { allowed: true }
      : {
          allowed: false,
          reason: "LIMITED",
          retryAfterSeconds: retryAfterSeconds(result.reset),
        };
  } catch {
    return unavailable();
  }
}

export async function checkAccountActivationSubmitRateLimit(
  headers: Headers,
  csrfNonce: string,
): Promise<AccountActivationRateLimitResult> {
  try {
    if (!CSRF_NONCE_PATTERN.test(csrfNonce)) return unavailable();

    const key = getRateLimitKey();
    const currentLimiters = getLimiters();
    const [ipResult, sessionResult] = await Promise.all([
      currentLimiters.submitIp.limit(opaqueIdentifier(key, "ip", getClientIp(headers))),
      currentLimiters.submitSession.limit(
        opaqueIdentifier(key, "session", csrfNonce),
      ),
    ]);

    if (ipResult.success && sessionResult.success) return { allowed: true };

    return {
      allowed: false,
      reason: "LIMITED",
      retryAfterSeconds: Math.max(
        ...[ipResult, sessionResult]
          .filter((result) => !result.success)
          .map((result) => retryAfterSeconds(result.reset)),
      ),
    };
  } catch {
    return unavailable();
  }
}
