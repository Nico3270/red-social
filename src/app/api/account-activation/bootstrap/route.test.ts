import { inspect } from "node:util";

const mockValidateAccountClaim = jest.fn();
const mockCreateAccountActivationSession = jest.fn();
const mockGetAccountActivationCookieName = jest.fn();
const mockGetAccountActivationCookieOptions = jest.fn();
const mockCheckAccountActivationBootstrapRateLimit = jest.fn();

// Real modules: do not use virtual mocks or import Prisma/Redis implementations.
jest.mock("@/lib/auth/account-claim", () => ({
  validateAccountClaim: mockValidateAccountClaim,
}));
jest.mock("@/lib/auth/account-activation-session", () => ({
  createAccountActivationSession: mockCreateAccountActivationSession,
  getAccountActivationCookieName: mockGetAccountActivationCookieName,
  getAccountActivationCookieOptions: mockGetAccountActivationCookieOptions,
}));
jest.mock("@/lib/security/account-activation-rate-limit", () => ({
  checkAccountActivationBootstrapRateLimit:
    mockCheckAccountActivationBootstrapRateLimit,
}));

import { POST } from "./route";

const ORIGIN = "https://myckeo-red-social-staging.vercel.app";
const ENDPOINT = `${ORIGIN}/api/account-activation/bootstrap`;
const rawToken = "SAFE_BOOTSTRAP_SYNTHETIC_".padEnd(43, "A");
const internalUserId = "synthetic-private-user-id";
const claimExpiresAt = new Date("2040-01-01T01:00:00.000Z");
const sessionExpiresAt = new Date("2040-01-01T00:15:00.000Z");
const sessionValue = "v1.synthetic-iv.opaque-ciphertext.synthetic-tag";
const csrfNonce = "SYNTHETIC_CSRF_".padEnd(43, "C");
const cookieName = "__Secure-myckeo-account-activation";
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/activar",
  expires: sessionExpiresAt,
} as const;

type ErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_ORIGIN"
  | "ACTIVATION_UNAVAILABLE"
  | "ACTIVATION_THROTTLED"
  | "INTERNAL_ERROR";

const consoleMethods = ["log", "info", "warn", "error", "debug"] as const;
let consoleSpies: jest.SpyInstance[];

function request(
  body: string | undefined = JSON.stringify({ token: rawToken }),
  origin: string | null = ORIGIN,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin !== null) headers.set("Origin", origin);
  return new Request(ENDPOINT, { method: "POST", headers, body });
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
}

async function expectNoDisclosure(response: Response): Promise<void> {
  const body = await response.clone().text();
  const headers = Array.from(response.headers.entries()).flat().join("\n");
  for (const sensitive of [rawToken, internalUserId, csrfNonce]) {
    expect(body).not.toContain(sensitive);
    expect(headers).not.toContain(sensitive);
  }
  // The opaque encrypted value is allowed ONLY in Set-Cookie.
  expect(body).not.toContain(sessionValue);
  expect(response.headers.get("location")).toBeNull();
  expectSecurityHeaders(response);
}

async function expectSuccess(response: Response): Promise<void> {
  expect(response.status).toBe(200);
  await expect(response.clone().json()).resolves.toEqual({ ok: true });
  expect(response.headers.get("retry-after")).toBeNull();
  await expectNoDisclosure(response);
}

async function expectFailure(
  response: Response,
  status: number,
  code: ErrorCode,
  retryAfterSeconds?: number,
): Promise<void> {
  expect(response.status).toBe(status);
  await expect(response.clone().json()).resolves.toEqual({ ok: false, code });
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("retry-after")).toBe(
    retryAfterSeconds === undefined ? null : String(retryAfterSeconds),
  );
  await expectNoDisclosure(response);
}

function expectNoClaimOrSession(): void {
  expect(mockValidateAccountClaim).not.toHaveBeenCalled();
  expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
  expect(mockGetAccountActivationCookieName).not.toHaveBeenCalled();
  expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalled();
}

describe("POST /api/account-activation/bootstrap — body-only bearer contract", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.replaceProperty(process, "env", {
      ...process.env,
      NODE_ENV: "production",
      SITE_URL: ORIGIN,
    });
    consoleSpies = consoleMethods.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
    mockCheckAccountActivationBootstrapRateLimit.mockResolvedValue({
      allowed: true,
    });
    mockValidateAccountClaim.mockResolvedValue({
      valid: true,
      usuarioId: internalUserId,
      expiresAt: claimExpiresAt,
    });
    mockCreateAccountActivationSession.mockReturnValue({
      value: sessionValue,
      csrfNonce,
      expiresAt: sessionExpiresAt,
    });
    mockGetAccountActivationCookieName.mockReturnValue(cookieName);
    mockGetAccountActivationCookieOptions.mockReturnValue(cookieOptions);
  });

  afterEach(() => {
    try {
      // inspect covers Error.message/stack and nested objects, unlike JSON alone.
      // Generic logging is allowed; logging the bearer is not.
      for (const spy of consoleSpies) {
        for (const args of spy.mock.calls) {
          expect(inspect(args, { depth: null, maxStringLength: null })).not.toContain(
            rawToken,
          );
        }
      }
    } finally {
      jest.restoreAllMocks(); // Restore console and the original environment.
    }
  });

  describe("success, cookie and non-disclosure", () => {
    it("returns exactly HTTP 200 { ok: true } for a valid JSON request", async () => {
      await expectSuccess(await POST(request()));
    });

    it("passes the exact request headers to the rate limiter once", async () => {
      const req = request();
      await expectSuccess(await POST(req));
      expect(mockCheckAccountActivationBootstrapRateLimit).toHaveBeenCalledTimes(1);
      expect(mockCheckAccountActivationBootstrapRateLimit.mock.calls[0][0]).toBe(
        req.headers,
      );
    });

    it("validates the body token exactly once", async () => {
      await expectSuccess(await POST(request()));
      expect(mockValidateAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockValidateAccountClaim).toHaveBeenCalledWith(rawToken);
    });

    it("passes rawToken and the exact claim expiry to session creation", async () => {
      await expectSuccess(await POST(request()));
      expect(mockCreateAccountActivationSession).toHaveBeenCalledTimes(1);
      expect(mockCreateAccountActivationSession).toHaveBeenCalledWith({
        rawToken,
        claimExpiresAt,
      });
      expect(
        mockCreateAccountActivationSession.mock.calls[0][0].claimExpiresAt,
      ).toBe(claimExpiresAt);
    });

    it("uses the cookie name and session expiry helpers exactly once", async () => {
      await expectSuccess(await POST(request()));
      expect(mockGetAccountActivationCookieName).toHaveBeenCalledTimes(1);
      expect(mockGetAccountActivationCookieName).toHaveBeenCalledWith();
      expect(mockGetAccountActivationCookieOptions).toHaveBeenCalledTimes(1);
      expect(mockGetAccountActivationCookieOptions).toHaveBeenCalledWith(
        sessionExpiresAt,
      );
      expect(mockGetAccountActivationCookieOptions.mock.calls[0][0]).toBe(
        sessionExpiresAt,
      );
    });

    it("sets exactly one opaque HttpOnly Secure SameSite=Lax activation cookie", async () => {
      const response = await POST(request());
      await expectSuccess(response);
      const cookies = response.headers.getSetCookie();
      expect(cookies).toHaveLength(1);
      const cookie = cookies[0];
      expect(cookie).toContain(`${cookieName}=${sessionValue}`);
      expect(cookie).toContain("Path=/activar");
      expect(cookie).toContain(`Expires=${sessionExpiresAt.toUTCString()}`);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).not.toContain(rawToken);
    });

    it("keeps the bearer in the POST body, never in the request URL", async () => {
      const req = request();
      expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(req.method).toBe("POST");
      expect(req.url).toBe(ENDPOINT);
      expect(req.url).not.toContain(rawToken);
      expect(new URL(req.url).search).toBe("");
      expect(new URL(req.url).hash).toBe("");
      await expect(req.clone().json()).resolves.toEqual({ token: rawToken });
      await expectSuccess(await POST(req));
    });

    it("never reflects bearer, IDs, session value or nonce in the response body", async () => {
      const response = await POST(request());
      await expectSuccess(response);
      expect(Object.keys(await response.clone().json())).toEqual(["ok"]);
    });

    it("never reflects the bearer in headers, Location or plaintext Set-Cookie", async () => {
      const response = await POST(request());
      await expectSuccess(response);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("set-cookie")).not.toContain(rawToken);
      expect(JSON.stringify(Array.from(response.headers))).not.toContain(rawToken);
    });

    it("prevents caching on success and omits Retry-After", async () => {
      const response = await POST(request());
      await expectSuccess(response);
      expectSecurityHeaders(response);
      expect(response.headers.get("retry-after")).toBeNull();
    });
  });

  describe("strict JSON input", () => {
    it.each([
      ["malformed JSON", '{"token":'],
      ["empty body", ""],
      ["whitespace-only body", " \n\t"],
      ["null", "null"],
      ["array", JSON.stringify([{ token: rawToken }])],
      ["string", JSON.stringify(rawToken)],
      ["number", "123"],
      ["boolean", "true"],
      ["empty object", "{}"],
      ["missing token", JSON.stringify({ unrelated: true })],
      ["null token", JSON.stringify({ token: null })],
      ["number token", JSON.stringify({ token: 123 })],
      ["boolean token", JSON.stringify({ token: true })],
      ["object token", JSON.stringify({ token: { value: rawToken } })],
      ["array token", JSON.stringify({ token: [rawToken] })],
      ["empty token", JSON.stringify({ token: "" })],
      ["short token", JSON.stringify({ token: rawToken.slice(0, 42) })],
      ["long token", JSON.stringify({ token: `${rawToken}A` })],
      ["leading whitespace", JSON.stringify({ token: ` ${rawToken}` })],
      ["trailing whitespace", JSON.stringify({ token: `${rawToken} ` })],
      ["embedded whitespace", JSON.stringify({ token: `${"A".repeat(21)} ${"B".repeat(21)}` })],
      ["trailing newline", JSON.stringify({ token: `${rawToken}\n` })],
      ["non-base64url character", JSON.stringify({ token: `${"A".repeat(42)}+` })],
      ["base64 padding", JSON.stringify({ token: `${"A".repeat(42)}=` })],
      ["unicode token", JSON.stringify({ token: `${"A".repeat(42)}ñ` })],
      ["valid token plus extra field", JSON.stringify({ token: rawToken, extra: true })],
      ["multiple extra fields", JSON.stringify({ token: rawToken, usuarioId: "synthetic", redirect: "/dashboard" })],
    ])("rejects %s without validating a claim or creating a session", async (_name, body) => {
      await expectFailure(await POST(request(body)), 400, "INVALID_REQUEST");
      expectNoClaimOrSession();
    });
  });

  describe("Origin and canonical SITE_URL", () => {
    it.each([ORIGIN, `${ORIGIN}/`])(
      "accepts the canonical origin with SITE_URL=%s",
      async (siteUrl) => {
        process.env.SITE_URL = siteUrl;
        await expectSuccess(await POST(request()));
      },
    );

    it.each([
      ["missing", null],
      ["opaque null", "null"],
      ["different site", "https://other.example.test"],
      ["different scheme", "http://myckeo-red-social-staging.vercel.app"],
      ["different port", `${ORIGIN}:8443`],
      ["non-origin with path", `${ORIGIN}/activar`],
      ["non-origin with slash", `${ORIGIN}/`],
    ])("rejects %s Origin", async (_name, origin) => {
      await expectFailure(await POST(request(undefined, origin)), 403, "INVALID_ORIGIN");
      expectNoClaimOrSession();
    });

    it.each(["Host", "X-Forwarded-Host", "Referer"])(
      "does not use %s to replace a missing Origin",
      async (header) => {
        const req = request(undefined, null);
        req.headers.set(
          header,
          header === "Referer" ? `${ORIGIN}/activar` : new URL(ORIGIN).host,
        );
        await expectFailure(await POST(req), 403, "INVALID_ORIGIN");
        expectNoClaimOrSession();
      },
    );

    it("rejects a foreign Origin even when all fallback headers match staging", async () => {
      const req = request(undefined, "https://other.example.test");
      req.headers.set("Host", new URL(ORIGIN).host);
      req.headers.set("X-Forwarded-Host", new URL(ORIGIN).host);
      req.headers.set("Referer", `${ORIGIN}/activar`);
      await expectFailure(await POST(req), 403, "INVALID_ORIGIN");
      expectNoClaimOrSession();
    });

    it("fails closed when SITE_URL is absent", async () => {
      delete process.env.SITE_URL;
      await expectFailure(await POST(request()), 403, "INVALID_ORIGIN");
      expectNoClaimOrSession();
    });

    it.each([
      ["empty", ""],
      ["invalid URL", "not-a-url"],
      ["leading whitespace", ` ${ORIGIN}`],
      ["trailing whitespace", `${ORIGIN} `],
      ["path", `${ORIGIN}/activar`],
      ["query", `${ORIGIN}/?preview=true`],
      ["fragment", `${ORIGIN}/#activation`],
      ["username", "https://synthetic@myckeo-red-social-staging.vercel.app"],
      ["password", "https://synthetic:fixture@myckeo-red-social-staging.vercel.app"],
      ["unsupported protocol", "ftp://myckeo-red-social-staging.vercel.app"],
    ])("rejects SITE_URL with %s", async (_name, siteUrl) => {
      process.env.SITE_URL = siteUrl;
      await expectFailure(await POST(request()), 403, "INVALID_ORIGIN");
      expectNoClaimOrSession();
    });

    it.each([
      "http://localhost",
      "http://app.localhost",
      "http://127.0.0.1",
      "http://[::1]",
    ])("rejects production loopback SITE_URL even with matching Origin: %s", async (siteUrl) => {
      process.env.SITE_URL = siteUrl;
      await expectFailure(
        await POST(request(undefined, new URL(siteUrl).origin)),
        403,
        "INVALID_ORIGIN",
      );
      expectNoClaimOrSession();
    });
  });

  describe("rate limiting and unavailable claims", () => {
    it.each(["LIMITED", "UNAVAILABLE"])(
      "fails closed with Retry-After when the limiter reports %s",
      async (reason) => {
        mockCheckAccountActivationBootstrapRateLimit.mockResolvedValue({
          allowed: false,
          reason,
          retryAfterSeconds: 37,
        });
        await expectFailure(await POST(request()), 429, "ACTIVATION_THROTTLED", 37);
        expectNoClaimOrSession();
      },
    );

    it("rejects an invalid, expired, revoked or consumed claim without a session", async () => {
      // These states are intentionally collapsed by validateAccountClaim.
      mockValidateAccountClaim.mockResolvedValue({ valid: false });
      await expectFailure(await POST(request()), 410, "ACTIVATION_UNAVAILABLE");
      expect(mockValidateAccountClaim).toHaveBeenCalledWith(rawToken);
      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
      expect(mockGetAccountActivationCookieName).not.toHaveBeenCalled();
      expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalled();
    });
  });

  describe("exceptions fail closed without leaking error contents", () => {
    it("handles a rate limiter exception without validating the claim", async () => {
      mockCheckAccountActivationBootstrapRateLimit.mockRejectedValue(
        new Error(`Synthetic internal failure containing ${rawToken}`),
      );
      await expectFailure(await POST(request()), 500, "INTERNAL_ERROR");
      expectNoClaimOrSession();
    });

    it("handles validateAccountClaim throwing without creating a session", async () => {
      mockValidateAccountClaim.mockRejectedValue(
        new Error(`Synthetic internal failure containing ${rawToken}`),
      );
      await expectFailure(await POST(request()), 500, "INTERNAL_ERROR");
      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
      expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalled();
    });

    it("handles session creation throwing without issuing a cookie", async () => {
      mockCreateAccountActivationSession.mockImplementation(() => {
        throw new Error(`Synthetic internal failure containing ${rawToken}`);
      });
      await expectFailure(await POST(request()), 500, "INTERNAL_ERROR");
      expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalled();
    });

    it("handles cookie options throwing without issuing a partial cookie", async () => {
      mockGetAccountActivationCookieOptions.mockImplementation(() => {
        throw new Error(`Synthetic internal failure containing ${rawToken}`);
      });
      await expectFailure(await POST(request()), 500, "INTERNAL_ERROR");
    });
  });
});
