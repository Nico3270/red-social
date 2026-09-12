import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockValidateAccountClaim = jest.fn();
const mockCreateAccountActivationSession = jest.fn();
const mockGetAccountActivationCookieName = jest.fn();
const mockGetAccountActivationCookieOptions = jest.fn();
const mockGetAccountActivationCookieClearOptions = jest.fn();

jest.mock(
  "@/lib/auth/account-claim",
  () => ({
    validateAccountClaim: mockValidateAccountClaim,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/auth/account-activation-session",
  () => ({
    createAccountActivationSession: mockCreateAccountActivationSession,
    getAccountActivationCookieName: mockGetAccountActivationCookieName,
    getAccountActivationCookieOptions: mockGetAccountActivationCookieOptions,
    getAccountActivationCookieClearOptions:
      mockGetAccountActivationCookieClearOptions,
  }),
  { virtual: true },
);

import { GET, HEAD, runtime } from "./route";

const rawToken = "T".repeat(43);
const internalUsuarioId = "internal-user-must-not-leak";
const claimExpiresAt = new Date("2026-09-12T14:00:00.000Z");
const sessionExpiresAt = new Date("2026-09-12T12:15:00.000Z");
const csrfNonce = "C".repeat(43);
const cookieName = "myckeo-account-activation";
const sessionValue = "v1.mock-iv.mock-ciphertext.mock-tag";
const createCookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/activar" as const,
  expires: sessionExpiresAt,
};
const clearCookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/activar" as const,
  expires: new Date(0),
  maxAge: 0 as const,
};

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function request(token = rawToken, origin = "https://app.example"): Request {
  return new Request(`${origin}/activar/${encodeURIComponent(token)}`);
}

function context(token = rawToken): RouteContext {
  return {
    params: Promise.resolve({ token }),
  };
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-robots-tag")).toBe(
    "noindex, nofollow, noarchive",
  );
}

async function expectCleanRedirect(
  response: Response,
  origin = "https://app.example",
): Promise<void> {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`${origin}/activar`);
  expectSecurityHeaders(response);
  await expect(response.clone().text()).resolves.toBe("");
}

function expectClearedActivationCookie(response: Response): void {
  const setCookie = response.headers.get("set-cookie");

  expect(mockGetAccountActivationCookieName).toHaveBeenCalled();
  expect(mockGetAccountActivationCookieClearOptions).toHaveBeenCalled();
  expect(setCookie).toContain(`${cookieName}=`);
  expect(setCookie).toContain("Path=/activar");
  expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  expect(setCookie).toContain("Max-Age=0");
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=lax");
}

function externalResponseText(response: Response): Promise<string> {
  return response
    .clone()
    .text()
    .then((body) =>
      [
        response.headers.get("location") ?? "",
        body,
        ...Array.from(response.headers.entries()).flat(),
      ].join("\n"),
    );
}

describe("GET/HEAD /activar/[token]", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockValidateAccountClaim.mockResolvedValue({
      valid: true,
      usuarioId: internalUsuarioId,
      expiresAt: claimExpiresAt,
    });
    mockCreateAccountActivationSession.mockReturnValue({
      value: sessionValue,
      csrfNonce,
      expiresAt: sessionExpiresAt,
    });
    mockGetAccountActivationCookieName.mockReturnValue(cookieName);
    mockGetAccountActivationCookieOptions.mockReturnValue(
      createCookieOptions,
    );
    mockGetAccountActivationCookieClearOptions.mockReturnValue(
      clearCookieOptions,
    );
  });

  it("declara el runtime Node.js", () => {
    expect(runtime).toBe("nodejs");
  });

  describe("HEAD", () => {
    it("responde 303 a la URL limpia", async () => {
      const response = await HEAD(request("scanner-preview"));

      await expectCleanRedirect(response);
    });

    it("mantiene el origin del request", async () => {
      const origin = "https://staging.example";
      const response = await HEAD(request("scanner-preview", origin));

      await expectCleanRedirect(response, origin);
    });

    it("no incluye Set-Cookie", async () => {
      const response = await HEAD(request("scanner-preview"));

      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("no valida el claim", async () => {
      await HEAD(request("scanner-preview"));

      expect(mockValidateAccountClaim).not.toHaveBeenCalled();
    });

    it("no crea una sesión", async () => {
      await HEAD(request("scanner-preview"));

      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
    });

    it("no consulta helpers de cookie", async () => {
      await HEAD(request("scanner-preview"));

      expect(mockGetAccountActivationCookieName).not.toHaveBeenCalled();
      expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalled();
      expect(
        mockGetAccountActivationCookieClearOptions,
      ).not.toHaveBeenCalled();
    });

    it("incluye todos los headers de seguridad", async () => {
      const response = await HEAD(request("scanner-preview"));

      expectSecurityHeaders(response);
    });

    it("no contiene el bearer ni body", async () => {
      const response = await HEAD(request(rawToken));

      expect(await externalResponseText(response)).not.toContain(rawToken);
      await expect(response.clone().text()).resolves.toBe("");
    });
  });

  describe("GET malformed", () => {
    it.each([
      ["empty", ""],
      ["short", "A".repeat(42)],
      ["long", "A".repeat(44)],
      ["plus", `${"A".repeat(42)}+`],
      ["dot", `${"A".repeat(42)}.`],
      ["padding", `${"A".repeat(42)}=`],
      ["whitespace", `${"A".repeat(42)} `],
    ])("rechaza %s antes de validar en DB", async (_label, token) => {
      const response = await GET(request(token), context(token));

      await expectCleanRedirect(response);
      expect(mockValidateAccountClaim).not.toHaveBeenCalled();
      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
      expectClearedActivationCookie(response);
    });

    it("conserva headers de seguridad al limpiar cookie", async () => {
      const malformedToken = "M".repeat(42);
      const response = await GET(
        request(malformedToken),
        context(malformedToken),
      );

      expectSecurityHeaders(response);
    });

    it("no filtra el valor malformed", async () => {
      const malformedToken = `${"M".repeat(42)}+`;
      const response = await GET(
        request(malformedToken),
        context(malformedToken),
      );

      expect(await externalResponseText(response)).not.toContain(
        malformedToken,
      );
    });
  });

  describe("GET con claim inválido", () => {
    beforeEach(() => {
      mockValidateAccountClaim.mockResolvedValue({ valid: false });
    });

    it("redirige siempre a /activar", async () => {
      const response = await GET(request(), context());

      await expectCleanRedirect(response);
    });

    it("valida exactamente el bearer recibido", async () => {
      await GET(request(), context());

      expect(mockValidateAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockValidateAccountClaim).toHaveBeenCalledWith(rawToken);
    });

    it("no crea sesión", async () => {
      await GET(request(), context());

      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
    });

    it("limpia cualquier sesión previa", async () => {
      const response = await GET(request(), context());

      expectClearedActivationCookie(response);
    });

    it("no filtra token en Location, body, headers o cookie", async () => {
      const response = await GET(request(), context());

      expect(await externalResponseText(response)).not.toContain(rawToken);
    });

    it("incluye todos los headers de seguridad", async () => {
      const response = await GET(request(), context());

      expectSecurityHeaders(response);
    });
  });

  describe("GET con claim válido", () => {
    it("crea la sesión con bearer y expiración del claim", async () => {
      await GET(request(), context());

      expect(mockCreateAccountActivationSession).toHaveBeenCalledTimes(1);
      expect(mockCreateAccountActivationSession).toHaveBeenCalledWith({
        rawToken,
        claimExpiresAt,
      });
    });

    it("redirige 303 a /activar", async () => {
      const response = await GET(request(), context());

      await expectCleanRedirect(response);
    });

    it("usa el nombre canónico de cookie", async () => {
      const response = await GET(request(), context());

      expect(mockGetAccountActivationCookieName).toHaveBeenCalledTimes(1);
      expect(response.headers.get("set-cookie")).toContain(
        `${cookieName}=${sessionValue}`,
      );
    });

    it("pide opciones con expiresAt de la sesión, no del claim", async () => {
      await GET(request(), context());

      expect(mockGetAccountActivationCookieOptions).toHaveBeenCalledTimes(1);
      expect(mockGetAccountActivationCookieOptions).toHaveBeenCalledWith(
        sessionExpiresAt,
      );
      expect(mockGetAccountActivationCookieOptions).not.toHaveBeenCalledWith(
        claimExpiresAt,
      );
    });

    it("aplica exactamente las opciones entregadas por el helper", async () => {
      const response = await GET(request(), context());
      const setCookie = response.headers.get("set-cookie");

      expect(setCookie).toContain("Path=/activar");
      expect(setCookie).toContain(
        "Expires=Sat, 12 Sep 2026 12:15:00 GMT",
      );
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=lax");
      expect(setCookie).not.toContain("Secure");
    });

    it("respeta Secure cuando lo entrega el helper", async () => {
      mockGetAccountActivationCookieOptions.mockReturnValue({
        ...createCookieOptions,
        secure: true,
      });

      const response = await GET(request(), context());

      expect(response.headers.get("set-cookie")).toContain("Secure");
    });

    it("no limpia cookie después de emitir sesión", async () => {
      await GET(request(), context());

      expect(
        mockGetAccountActivationCookieClearOptions,
      ).not.toHaveBeenCalled();
    });

    it("no expone csrfNonce ni usuarioId", async () => {
      const response = await GET(request(), context());
      const external = await externalResponseText(response);

      expect(external).not.toContain(csrfNonce);
      expect(external).not.toContain(internalUsuarioId);
    });

    it("no expone bearer en Location, body o headers", async () => {
      const response = await GET(request(), context());

      expect(await externalResponseText(response)).not.toContain(rawToken);
    });

    it("incluye todos los headers de seguridad", async () => {
      const response = await GET(request(), context());

      expectSecurityHeaders(response);
    });
  });

  describe("errores internos", () => {
    it("oculta fallo de validación y limpia cookie", async () => {
      mockValidateAccountClaim.mockRejectedValue(
        new Error(`synthetic failure ${rawToken}`),
      );

      const response = await GET(request(), context());

      await expectCleanRedirect(response);
      expect(mockCreateAccountActivationSession).not.toHaveBeenCalled();
      expectClearedActivationCookie(response);
      expect(await externalResponseText(response)).not.toContain(rawToken);
    });

    it("oculta fallo de creación de sesión y limpia cookie", async () => {
      mockCreateAccountActivationSession.mockImplementation(() => {
        throw new Error(`secret failure ${rawToken}`);
      });

      const response = await GET(request(), context());

      await expectCleanRedirect(response);
      expectClearedActivationCookie(response);
      expect(await externalResponseText(response)).not.toContain(rawToken);
    });

    it("limpia cookie si fallan las opciones de sesión", async () => {
      mockGetAccountActivationCookieOptions.mockImplementation(() => {
        throw new Error("invalid cookie expiry");
      });

      const response = await GET(request(), context());

      await expectCleanRedirect(response);
      expectClearedActivationCookie(response);
    });

    it("oculta rechazo de params y limpia cookie", async () => {
      const rejectedContext: RouteContext = {
        params: Promise.reject(new Error(`params failure ${rawToken}`)),
      };

      const response = await GET(request(), rejectedContext);

      await expectCleanRedirect(response);
      expect(mockValidateAccountClaim).not.toHaveBeenCalled();
      expectClearedActivationCookie(response);
      expect(await externalResponseText(response)).not.toContain(rawToken);
    });
  });

  describe("límites de seguridad", () => {
    it("la ruta es read-only y no importa Prisma ni mutaciones de claim", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/[token]/route.ts"),
        "utf8",
      );

      expect(source).not.toMatch(/@\/lib\/prisma|PrismaClient|@prisma\/client/);
      expect(source).not.toMatch(/consumeAccountClaim|issueAccountClaim/);
      expect(source).not.toMatch(/prisma\.accountClaim|accountClaim\./);
      expect(source).not.toMatch(
        /\.create\s*\(|\.update\s*\(|\.updateMany\s*\(|\.upsert\s*\(|\.delete\s*\(|\.deleteMany\s*\(/,
      );
    });

    it("no contiene writes de Usuario o Negocio", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/[token]/route.ts"),
        "utf8",
      );

      expect(source).not.toMatch(/prisma\.usuario|usuario\.(create|update|upsert|delete)/);
      expect(source).not.toMatch(/prisma\.negocio|negocio\.(create|update|upsert|delete)/);
    });

    it("no usa cookie global, auth, UI, analytics ni logging", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/[token]/route.ts"),
        "utf8",
      );

      expect(source).not.toMatch(/next\/headers|\bcookies\s*\(|\bheaders\s*\(/);
      expect(source).not.toMatch(/auth\.config|\bauth\s*\(/);
      expect(source).not.toMatch(/console\.|logger|Analytics|react|page\.tsx/);
    });

    it("no duplica flags de cookie ni implementa rate limit", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/[token]/route.ts"),
        "utf8",
      );

      expect(source).not.toMatch(/httpOnly\s*:|sameSite\s*:|secure\s*:|maxAge\s*:/);
      expect(source).not.toMatch(/ratelimit|rateLimit|upstash/i);
    });

    it("usa sólo validateAccountClaim como operación del servicio", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/[token]/route.ts"),
        "utf8",
      );

      expect(source).toContain("validateAccountClaim");
      expect(source.match(/\brawToken\s*:/g)).toHaveLength(1);
      expect(source).not.toContain("usuarioId:");
      expect(source).not.toContain("negocioId:");
    });
  });
});
