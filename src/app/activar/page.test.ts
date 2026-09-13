import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockCookies = jest.fn();
const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();
const mockCookieDelete = jest.fn();
const mockGetCookieName = jest.fn();
const mockReadActivationSession = jest.fn();
const mockAuth = jest.fn();
const mockActivationForm = jest.fn(({ csrfNonce }: { csrfNonce: string }) =>
  createElement(
    "form",
    { "data-testid": "activation-form" },
    createElement("input", { type: "hidden", name: "csrfNonce", value: csrfNonce }),
  ),
);

jest.mock(
  "next/headers",
  () => ({
    cookies: mockCookies,
  }),
  { virtual: true },
);
jest.mock(
  "next/link",
  () => ({
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: ReactNode;
      [key: string]: unknown;
    }) => createElement("a", { href, ...props }, children),
  }),
  { virtual: true },
);
jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
jest.mock(
  "@/lib/auth/account-activation-session",
  () => ({
    getAccountActivationCookieName: mockGetCookieName,
    readAccountActivationSession: mockReadActivationSession,
  }),
  { virtual: true },
);
jest.mock("./ActivationForm", () => ({
  __esModule: true,
  default: mockActivationForm,
}));

import AccountActivationPage, {
  dynamic,
  metadata,
  revalidate,
} from "./page";

const cookieName = "myckeo-account-activation";
const cookieValue = "COOKIE_VALUE_SHOULD_NEVER_RENDER";
const rawToken = "RAW_TOKEN_SHOULD_NEVER_RENDER";
const csrfNonce = "CSRF_SHOULD_NEVER_RENDER";
const usuarioId = "USUARIO_ID_SHOULD_NEVER_RENDER";
const claimId = "CLAIM_ID_SHOULD_NEVER_RENDER";

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await AccountActivationPage());
}

function expectNoSensitiveData(html: string): void {
  for (const value of [
    cookieValue,
    rawToken,
    usuarioId,
    claimId,
  ]) {
    expect(html).not.toContain(value);
  }
}

function expectState(html: string, state: string): void {
  expect(html).toContain(`data-activation-state="${state}"`);
  if (state !== "READY") {
    expect(mockActivationForm).not.toHaveBeenCalled();
    expect(html).not.toContain(csrfNonce);
  }
}

describe("/activar Server Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue({
      get: mockCookieGet,
      set: mockCookieSet,
      delete: mockCookieDelete,
    });
    mockCookieGet.mockReturnValue({ value: cookieValue });
    mockGetCookieName.mockReturnValue(cookieName);
    mockReadActivationSession.mockReturnValue({
      valid: true,
      rawToken,
      csrfNonce,
      expiresAt: new Date("2026-09-12T20:00:00.000Z"),
      usuarioId,
      claimId,
    });
    mockAuth.mockResolvedValue(null);
  });

  describe("cookie de activación", () => {
    it.each([undefined, null, { value: "" }])(
      "sin valor de cookie (%p) muestra UNAVAILABLE sin descifrar ni autenticar",
      async (cookie) => {
        mockCookieGet.mockReturnValue(cookie);

        const html = await renderPage();

        expectState(html, "UNAVAILABLE");
        expect(html).toContain(
          "Este enlace de activación no está disponible o expiró.",
        );
        expect(mockReadActivationSession).not.toHaveBeenCalled();
        expect(mockAuth).not.toHaveBeenCalled();
        expectNoSensitiveData(html);
      },
    );

    it("lee exclusivamente la cookie con el nombre canónico", async () => {
      await renderPage();

      expect(mockCookies).toHaveBeenCalledTimes(1);
      expect(mockGetCookieName).toHaveBeenCalledTimes(1);
      expect(mockCookieGet).toHaveBeenCalledTimes(1);
      expect(mockCookieGet).toHaveBeenCalledWith(cookieName);
      expect(mockReadActivationSession).toHaveBeenCalledWith(cookieValue);
    });

    it("no escribe ni elimina cookies desde el Server Component", async () => {
      await renderPage();

      expect(mockCookieSet).not.toHaveBeenCalled();
      expect(mockCookieDelete).not.toHaveBeenCalled();
    });

    it("fallo al leer cookies muestra TEMPORARY_ERROR sin filtrar detalles", async () => {
      mockCookies.mockRejectedValue(
        new Error(`cookie failure ${cookieValue} ${rawToken}`),
      );

      const html = await renderPage();

      expectState(html, "TEMPORARY_ERROR");
      expect(html).toContain(
        "No pudimos preparar la activación en este momento.",
      );
      expect(mockReadActivationSession).not.toHaveBeenCalled();
      expect(mockAuth).not.toHaveBeenCalled();
      expectNoSensitiveData(html);
    });
  });

  describe("sesión de activación", () => {
    it.each([
      { valid: false },
      null,
      undefined,
    ])("sesión inválida %p converge a UNAVAILABLE", async (result) => {
      mockReadActivationSession.mockReturnValue(result);

      const html = await renderPage();

      expectState(html, "UNAVAILABLE");
      expect(html).toContain(
        "Este enlace de activación no está disponible o expiró.",
      );
      expect(mockAuth).not.toHaveBeenCalled();
      expectNoSensitiveData(html);
    });

    it("cookie ausente y sesión inválida renderizan el mismo estado público", async () => {
      mockCookieGet.mockReturnValue(undefined);
      const missingHtml = await renderPage();

      mockCookieGet.mockReturnValue({ value: cookieValue });
      mockReadActivationSession.mockReturnValue({ valid: false });
      const invalidHtml = await renderPage();

      expect(invalidHtml).toBe(missingHtml);
    });

    it("fallo inesperado al descifrar muestra TEMPORARY_ERROR sin detalles", async () => {
      mockReadActivationSession.mockImplementation(() => {
        throw new Error(`decrypt failure ${cookieValue} ${csrfNonce}`);
      });

      const html = await renderPage();

      expectState(html, "TEMPORARY_ERROR");
      expect(mockAuth).not.toHaveBeenCalled();
      expectNoSensitiveData(html);
    });
  });

  describe("sesión Auth existente", () => {
    it.each([
      { user: { id: "another-user" } },
      { user: {} },
      {},
    ])("bloquea cualquier sesión existente sin revelar identidad", async (session) => {
      mockAuth.mockResolvedValue(session);

      const html = await renderPage();

      expectState(html, "AUTH_SESSION_PRESENT");
      expect(html).toContain("Ya tienes una sesión iniciada.");
      expect(html).toContain(
        "Cierra sesión antes de activar esta cuenta.",
      );
      expect(html).not.toContain("Tu cuenta está lista para ser activada.");
      expectNoSensitiveData(html);
    });

    it("no cierra sesión ni modifica la cookie de activación", async () => {
      mockAuth.mockResolvedValue({ user: { id: "another-user" } });

      const html = await renderPage();

      expectState(html, "AUTH_SESSION_PRESENT");
      expect(mockCookieSet).not.toHaveBeenCalled();
      expect(mockCookieDelete).not.toHaveBeenCalled();
    });

    it("fallo de auth muestra TEMPORARY_ERROR sin datos internos", async () => {
      mockAuth.mockRejectedValue(
        new Error(`auth failure ${usuarioId} ${rawToken}`),
      );

      const html = await renderPage();

      expectState(html, "TEMPORARY_ERROR");
      expect(html).toContain(
        "No pudimos preparar la activación en este momento.",
      );
      expectNoSensitiveData(html);
    });
  });

  describe("estado READY", () => {
    it("renderiza ActivationForm una sola vez cuando no hay Auth", async () => {
      const html = await renderPage();

      expectState(html, "READY");
      expect(html).toContain("Tu cuenta está lista para ser activada.");
      expect(mockActivationForm).toHaveBeenCalledTimes(1);
      expect(html).toContain('data-testid="activation-form"');
      expect(html).not.toContain("El formulario seguro de activación estará disponible aquí");
      expect(html).not.toContain("Activación no disponible");
      expectNoSensitiveData(html);
    });

    it("pasa exclusivamente csrfNonce al Client Component", async () => {
      await renderPage();

      const props = mockActivationForm.mock.calls[0][0];
      expect(Object.keys(props)).toEqual(["csrfNonce"]);
      expect(props.csrfNonce).toBe(csrfNonce);
      expect(props).not.toHaveProperty("rawToken");
      expect(props).not.toHaveProperty("cookieValue");
      expect(props).not.toHaveProperty("expiresAt");
      expect(props).not.toHaveProperty("session");
      expect(props).not.toHaveProperty("usuarioId");
      expect(props).not.toHaveProperty("claimId");
    });

    it("mantiene el nonce sólo en el input oculto y no renderiza otros secretos", async () => {
      const html = await renderPage();

      expect(html).toContain(`<input type="hidden" name="csrfNonce" value="${csrfNonce}"/>`);
      expect(html.match(new RegExp(csrfNonce, "g"))).toHaveLength(1);
      expect(html).not.toMatch(/<script|data-csrf|raw[_-]?token|usuario[_-]?id|claim[_-]?id/i);
      expectNoSensitiveData(html);
    });

    it("usa únicamente un enlace secundario fijo a login", async () => {
      const html = await renderPage();

      expect(html).toContain('href="/auth/login"');
      expect(html).not.toMatch(/callbackUrl|https?:\/\//);
    });
  });

  describe("metadata y límites server-only", () => {
    it("declara render dinámico sin revalidación compartida", () => {
      expect(dynamic).toBe("force-dynamic");
      expect(revalidate).toBe(0);
    });

    it("declara metadata no indexable y no sensible", () => {
      expect(metadata).toEqual({
        title: "Activa tu cuenta | Myckeo",
        robots: {
          index: false,
          follow: false,
          noarchive: true,
        },
      });

      const serialized = JSON.stringify(metadata);
      expect(serialized).not.toContain(rawToken);
      expect(serialized).not.toContain(csrfNonce);
      expect(serialized).not.toContain(cookieValue);
      expect(serialized).not.toContain(usuarioId);
      expect(serialized).not.toContain(claimId);
    });

    it("permanece Server Component sin APIs cliente ni paso de secretos", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/page.tsx"),
        "utf8",
      );

      expect(source).not.toContain('"use client"');
      expect(source).not.toContain('"use server"');
      expect(source).not.toMatch(
        /useState|useEffect|localStorage|sessionStorage|window\.|document\./,
      );
      expect(source).not.toMatch(/rawToken|expiresAt|usuarioId|claimId/);
      expect(source).toContain("csrfNonce: activationSession.csrfNonce");
      expect(source).toContain("<ActivationForm csrfNonce={result.csrfNonce} />");
      expect(source).not.toMatch(/<ActivationForm\s+\{\.\.\.|session=|cookieValue=/);
      expect(source).not.toMatch(/console\.|\blogger\b|JSON\.stringify/);
    });

    it("usa auth real y await cookies sin leer manualmente cookies Auth", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/page.tsx"),
        "utf8",
      );

      expect(source).toContain('import { auth } from "@/auth.config";');
      expect(source).not.toMatch(/from ["']@\/auth["']/);
      expect(source).toContain("const cookieStore = await cookies();");
      expect(source).toContain("getAccountActivationCookieName()");
      expect(source).toContain("readAccountActivationSession(cookieValue)");
      expect(mockAuth).toHaveBeenCalledTimes(0);
    });

    it("no importa Prisma, valida claims ni contiene writes de dominio", () => {
      const source = readFileSync(
        join(process.cwd(), "src/app/activar/page.tsx"),
        "utf8",
      );

      expect(source).not.toMatch(/@\/lib\/prisma|@prisma\/client|PrismaClient/);
      expect(source).not.toMatch(
        /validateAccountClaim|consumeAccountClaim|issueAccountClaim/,
      );
      expect(source).not.toMatch(
        /\.(create|update|updateMany|upsert|delete)\s*\(|\$transaction/,
      );
      expect(source).not.toMatch(/usuario\.|accountClaim\.|negocio\./);
    });
  });
});
