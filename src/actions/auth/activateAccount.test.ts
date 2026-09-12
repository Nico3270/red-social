import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma } from "@prisma/client";

const mockCookies = jest.fn();
const mockHeaders = jest.fn();
const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();
const mockHeaderGet = jest.fn();
const mockAuth = jest.fn();
const mockReadActivationSession = jest.fn();
const mockGetCookieName = jest.fn();
const mockGetCookieClearOptions = jest.fn();
const mockValidateActivationInput = jest.fn();
const mockBcryptHash = jest.fn();
const mockConsumeAccountClaim = jest.fn();
const mockUsuarioUpdateMany = jest.fn();
const mockNegocioCreate = jest.fn();
const mockNegocioUpdate = jest.fn();
const mockNegocioUpdateMany = jest.fn();
const mockNegocioDelete = jest.fn();
const mockNegocioUpsert = jest.fn();
const mockRedirect = jest.fn();

class MockAccountClaimError extends Error {
  readonly code = "ACCOUNT_CLAIM_UNAVAILABLE";
}

class RedirectSignal extends Error {
  readonly destination: string;

  constructor(destination: string) {
    super("NEXT_REDIRECT");
    this.destination = destination;
  }
}

jest.mock(
  "next/headers",
  () => ({
    cookies: mockCookies,
    headers: mockHeaders,
  }),
  { virtual: true },
);
jest.mock(
  "next/navigation",
  () => ({
    redirect: mockRedirect,
  }),
  { virtual: true },
);
jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
jest.mock(
  "@/lib/auth/account-activation-session",
  () => ({
    readAccountActivationSession: mockReadActivationSession,
    getAccountActivationCookieName: mockGetCookieName,
    getAccountActivationCookieClearOptions: mockGetCookieClearOptions,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/validators/account-activation",
  () => ({
    validateAccountActivationInput: mockValidateActivationInput,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/auth/account-claim",
  () => ({
    AccountClaimError: MockAccountClaimError,
    consumeAccountClaim: mockConsumeAccountClaim,
  }),
  { virtual: true },
);
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: mockBcryptHash,
  },
}));

import { activateAccount } from "./activateAccount";

const TEST_ORIGIN = "https://activation.staging.test";
const cookieName = "myckeo-account-activation";
const cookieValue = "v1.mock-iv.mock-ciphertext.mock-tag";
const rawToken = "R".repeat(43);
const csrfNonce = "C".repeat(43);
const passwordHash = "$2a$10$synthetic-hash-not-a-credential";
const usuarioId = "placeholder-user-1";
const fechaNacimiento = new Date(2000, 4, 20);
const clearCookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/activar" as const,
  expires: new Date(0),
  maxAge: 0 as const,
};

const normalizedData = {
  nombre: "María José",
  apellido: "Muñoz Peña",
  email: "persona@example.com",
  username: "mi_usuario7",
  ciudadCompleta: "Tunja - Boyacá",
  genero: "otro" as const,
  fechaNacimiento,
  password: "Password1!",
  confirmPassword: "Password1!",
};

const baseFormValues = {
  csrfNonce,
  nombre: "  María José  ",
  apellido: "  Muñoz Peña  ",
  email: "  PERSONA@Example.COM  ",
  username: "  Mi_Usuario7  ",
  ciudadCompleta: "  Tunja - Boyacá  ",
  genero: "otro",
  fechaNacimiento: "2000-05-20",
  password: "Password1!",
  confirmPassword: "Password1!",
};

type BaseFormField = keyof typeof baseFormValues;

type FormDataOptions = {
  overrides?: Partial<Record<BaseFormField, string>>;
  omitted?: BaseFormField[];
  extra?: Array<[string, string]>;
  duplicate?: Array<[BaseFormField, string]>;
};

const transactionClient = {
  usuario: {
    updateMany: mockUsuarioUpdateMany,
  },
  negocio: {
    create: mockNegocioCreate,
    update: mockNegocioUpdate,
    updateMany: mockNegocioUpdateMany,
    delete: mockNegocioDelete,
    upsert: mockNegocioUpsert,
  },
};

let events: string[];
let transactionActive: boolean;

function buildFormData({
  overrides = {},
  omitted = [],
  extra = [],
  duplicate = [],
}: FormDataOptions = {}): FormData {
  const formData = new FormData();
  const omittedFields = new Set<BaseFormField>(omitted);

  for (const [field, defaultValue] of Object.entries(baseFormValues) as Array<
    [BaseFormField, string]
  >) {
    if (!omittedFields.has(field)) {
      formData.append(field, overrides[field] ?? defaultValue);
    }
  }

  for (const [field, value] of extra) {
    formData.append(field, value);
  }

  for (const [field, value] of duplicate) {
    formData.append(field, value);
  }

  return formData;
}

function knownUniqueError(
  target: unknown,
  options: {
    modelName?: string;
    constraint?: string;
  } = {},
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.18.0",
    meta: {
      modelName: options.modelName ?? "Usuario",
      target,
      constraint: options.constraint,
    },
  });
}

function expectActivationCookieCleared(): void {
  expect(mockGetCookieClearOptions).toHaveBeenCalled();
  expect(mockCookieSet).toHaveBeenCalledWith(
    cookieName,
    "",
    clearCookieOptions,
  );
}

function expectActivationCookiePreserved(): void {
  expect(mockCookieSet).not.toHaveBeenCalled();
  expect(mockGetCookieClearOptions).not.toHaveBeenCalled();
}

function expectNoHashOrConsume(): void {
  expect(mockBcryptHash).not.toHaveBeenCalled();
  expect(mockConsumeAccountClaim).not.toHaveBeenCalled();
  expect(mockUsuarioUpdateMany).not.toHaveBeenCalled();
}

function expectNoNegocioWrites(): void {
  expect(mockNegocioCreate).not.toHaveBeenCalled();
  expect(mockNegocioUpdate).not.toHaveBeenCalled();
  expect(mockNegocioUpdateMany).not.toHaveBeenCalled();
  expect(mockNegocioDelete).not.toHaveBeenCalled();
  expect(mockNegocioUpsert).not.toHaveBeenCalled();
}

async function expectSuccessRedirect(
  formData: FormData = buildFormData(),
): Promise<void> {
  await expect(activateAccount(formData)).rejects.toBeInstanceOf(
    RedirectSignal,
  );
  expect(mockRedirect).toHaveBeenCalledWith(
    "/auth/login?callbackUrl=%2Fdashboard",
  );
}

describe("activateAccount Server Action", () => {
  const originalSiteUrl = process.env.SITE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    events = [];
    transactionActive = false;
    process.env.SITE_URL = TEST_ORIGIN;

    mockCookies.mockResolvedValue({
      get: mockCookieGet,
      set: mockCookieSet,
    });
    mockCookieGet.mockReturnValue({ value: cookieValue });
    mockCookieSet.mockImplementation(() => {
      events.push("cookie:clear");
    });
    mockHeaders.mockResolvedValue({ get: mockHeaderGet });
    mockHeaderGet.mockImplementation((name: string) =>
      name.toLowerCase() === "origin" ? TEST_ORIGIN : null,
    );
    mockAuth.mockResolvedValue(null);
    mockGetCookieName.mockReturnValue(cookieName);
    mockGetCookieClearOptions.mockReturnValue(clearCookieOptions);
    mockReadActivationSession.mockReturnValue({
      valid: true,
      rawToken,
      csrfNonce,
      expiresAt: new Date("2026-09-12T16:00:00.000Z"),
    });
    mockValidateActivationInput.mockReturnValue({
      success: true,
      data: normalizedData,
    });
    mockBcryptHash.mockImplementation(async () => {
      events.push("bcrypt");
      return passwordHash;
    });
    mockUsuarioUpdateMany.mockImplementation(async () => {
      events.push("usuario:update");
      expect(transactionActive).toBe(true);
      return { count: 1 };
    });
    mockConsumeAccountClaim.mockImplementation(
      async (
        _token: string,
        callback: (context: {
          tx: typeof transactionClient;
          usuarioId: string;
        }) => Promise<unknown>,
      ) => {
        events.push("consume:start");
        transactionActive = true;
        try {
          return await callback({ tx: transactionClient, usuarioId });
        } finally {
          transactionActive = false;
          events.push("consume:end");
        }
      },
    );
    mockRedirect.mockImplementation((destination: string) => {
      events.push("redirect");
      throw new RedirectSignal(destination);
    });
  });

  afterAll(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
  });

  it("expone únicamente la Server Action esperada", () => {
    const source = readFileSync(
      join(process.cwd(), "src/actions/auth/activateAccount.ts"),
      "utf8",
    );

    expect(source.startsWith('"use server";')).toBe(true);
    expect(source).toMatch(
      /export async function activateAccount\(\s*formData: FormData,?\s*\): Promise<ActivateAccountResult>/,
    );
    expect(activateAccount.length).toBe(1);
  });

  describe("activation cookie", () => {
    it("sin cookie retorna terminal, limpia y corta todo downstream", async () => {
      mockCookieGet.mockReturnValue(undefined);

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(mockReadActivationSession).not.toHaveBeenCalled();
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockHeaders).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("lee únicamente la cookie canónica", async () => {
      await expectSuccessRedirect();

      expect(mockCookieGet).toHaveBeenCalledTimes(1);
      expect(mockCookieGet).toHaveBeenCalledWith(cookieName);
      expect(mockReadActivationSession).toHaveBeenCalledWith(cookieValue);
    });

    it("cookie inválida retorna terminal y se limpia", async () => {
      mockReadActivationSession.mockReturnValue({ valid: false });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(mockAuth).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("fallo al descifrar se vuelve terminal sin filtrar detalles", async () => {
      mockReadActivationSession.mockImplementation(() => {
        throw new Error(`secret failure ${cookieValue}`);
      });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(JSON.stringify(result)).not.toContain(cookieValue);
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("fallo de cookies retorna INTERNAL_ERROR sin mutaciones", async () => {
      mockCookies.mockRejectedValue(new Error("cookie store unavailable"));

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(mockCookieGet).not.toHaveBeenCalled();
      expectNoHashOrConsume();
    });
  });

  describe("existing Auth session", () => {
    it.each([
      { user: { id: "another-user" } },
      { user: {} },
      {},
    ])("bloquea cualquier sesión existente y conserva cookie", async (session) => {
      mockAuth.mockResolvedValue(session);

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "AUTH_SESSION_PRESENT" });
      expect(mockHeaders).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });

    it("usa auth desde la configuración real antes de Origin", async () => {
      const order: string[] = [];
      mockAuth.mockImplementation(async () => {
        order.push("auth");
        return null;
      });
      mockHeaders.mockImplementation(async () => {
        order.push("headers");
        return { get: mockHeaderGet };
      });

      await expectSuccessRedirect();

      expect(order).toEqual(["auth", "headers"]);
    });

    it("fallo de auth retorna INTERNAL_ERROR y conserva cookie", async () => {
      mockAuth.mockRejectedValue(new Error("auth internal failure"));

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(mockHeaders).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });
  });

  describe("Origin", () => {
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["external whitespace", ` ${TEST_ORIGIN} `],
      ["path", `${TEST_ORIGIN}/activar`],
      ["query", `${TEST_ORIGIN}?source=form`],
      ["hash", `${TEST_ORIGIN}/#fragment`],
      ["userinfo", "https://user:pass@activation.staging.test"],
      ["non-http", "ftp://activation.staging.test"],
      ["unparseable", "not-a-url"],
    ])("rechaza SITE_URL %s, limpia cookie y no muta", async (_label, value) => {
      if (value === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = value;
      }

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INVALID_ORIGIN" });
      expect(mockHeaders).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it.each([
      ["missing request Origin", null],
      ["foreign origin", "https://evil.example"],
      ["host suffix attack", `${TEST_ORIGIN}.evil.example`],
      ["trailing slash", `${TEST_ORIGIN}/`],
      ["opaque", "null"],
    ])("rechaza %s y limpia cookie", async (_label, origin) => {
      mockHeaderGet.mockReturnValue(origin);

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INVALID_ORIGIN" });
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("acepta SITE_URL con slash raíz normalizado", async () => {
      process.env.SITE_URL = `${TEST_ORIGIN}/`;

      await expectSuccessRedirect();
    });

    it("no confía en Host para sustituir Origin", async () => {
      mockHeaderGet.mockImplementation((name: string) => {
        if (name.toLowerCase() === "origin") {
          return "https://evil.example";
        }
        if (name.toLowerCase() === "host") {
          return "activation.staging.test";
        }
        return null;
      });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INVALID_ORIGIN" });
      expect(mockHeaderGet).not.toHaveBeenCalledWith("host");
      expectActivationCookieCleared();
    });

    it("fallo al leer headers falla cerrado y limpia cookie", async () => {
      mockHeaders.mockRejectedValue(new Error("headers unavailable"));

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INVALID_ORIGIN" });
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("permite loopback configurado explícitamente fuera de producción", async () => {
      process.env.SITE_URL = "http://localhost:3000";
      mockHeaderGet.mockReturnValue("http://localhost:3000");

      await expectSuccessRedirect();
    });

    it("rechaza loopback en producción", async () => {
      const replacedNodeEnv = jest.replaceProperty(
        process.env,
        "NODE_ENV",
        "production",
      );
      process.env.SITE_URL = "http://127.0.0.1:3000";

      try {
        const result = await activateAccount(buildFormData());
        expect(result).toEqual({ ok: false, code: "INVALID_ORIGIN" });
        expectActivationCookieCleared();
      } finally {
        replacedNodeEnv.restore();
      }
    });
  });

  describe("CSRF", () => {
    it.each([
      ["missing", { omitted: ["csrfNonce"] as BaseFormField[] }],
      ["empty", { overrides: { csrfNonce: "" } }],
      ["short", { overrides: { csrfNonce: "C".repeat(42) } }],
      ["long", { overrides: { csrfNonce: "C".repeat(44) } }],
      ["invalid charset", { overrides: { csrfNonce: `${"C".repeat(42)}+` } }],
      ["mismatch", { overrides: { csrfNonce: "D".repeat(43) } }],
      ["duplicate", { duplicate: [["csrfNonce", csrfNonce]] as Array<[BaseFormField, string]> }],
    ])("rechaza nonce %s, limpia cookie y no muta", async (_label, options) => {
      const result = await activateAccount(buildFormData(options));

      expect(result).toEqual({ ok: false, code: "INVALID_CSRF" });
      expect(mockValidateActivationInput).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("rechaza nonce inválido proveniente de sesión", async () => {
      mockReadActivationSession.mockReturnValue({
        valid: true,
        rawToken,
        csrfNonce: "invalid-session-nonce",
        expiresAt: new Date("2026-09-12T16:00:00.000Z"),
      });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INVALID_CSRF" });
      expectNoHashOrConsume();
      expectActivationCookieCleared();
    });

    it("usa timingSafeEqual después de comprobar formato y longitudes", () => {
      const source = readFileSync(
        join(process.cwd(), "src/actions/auth/activateAccount.ts"),
        "utf8",
      );

      expect(source).toContain("timingSafeEqual(submittedBytes, expectedBytes)");
      expect(source).toContain("submittedBytes.length === expectedBytes.length");
      expect(source).not.toMatch(/submittedNonce\s*===\s*expectedNonce/);
    });
  });

  describe("strict FormData and validation", () => {
    it.each([
      "admin",
      "rawToken",
      "usuarioId",
      "claimId",
      "negocioId",
      "tokenHash",
      "isPlaceholder",
      "perfilCompleto",
      "callbackUrl",
    ])("rechaza campo extra %s como INVALID_REQUEST", async (field) => {
      const result = await activateAccount(
        buildFormData({ extra: [[field, "attacker-controlled"]] }),
      );

      expect(result).toEqual({ ok: false, code: "INVALID_REQUEST" });
      expect(mockValidateActivationInput).not.toHaveBeenCalled();
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });

    it("ignora únicamente metadata interna $ACTION_ de Next.js", async () => {
      const formData = buildFormData({
        extra: [
          ["$ACTION_ID_abc", ""],
          ["$ACTION_REF_1", "framework-metadata"],
        ],
      });

      await expectSuccessRedirect(formData);

      expect(mockValidateActivationInput).toHaveBeenCalledWith({
        nombre: baseFormValues.nombre,
        apellido: baseFormValues.apellido,
        email: baseFormValues.email,
        username: baseFormValues.username,
        ciudadCompleta: baseFormValues.ciudadCompleta,
        genero: baseFormValues.genero,
        fechaNacimiento: baseFormValues.fechaNacimiento,
        password: baseFormValues.password,
        confirmPassword: baseFormValues.confirmPassword,
      });
    });

    it.each([
      "nombre",
      "apellido",
      "email",
      "username",
      "ciudadCompleta",
      "genero",
      "fechaNacimiento",
      "password",
      "confirmPassword",
    ] as BaseFormField[])("rechaza duplicado de %s", async (field) => {
      const result = await activateAccount(
        buildFormData({ duplicate: [[field, "duplicate"]] }),
      );

      expect(result).toEqual({ ok: false, code: "INVALID_REQUEST" });
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });

    it("pasa al validator un objeto exacto sin csrfNonce", async () => {
      await expectSuccessRedirect();

      expect(mockValidateActivationInput).toHaveBeenCalledTimes(1);
      expect(mockValidateActivationInput).toHaveBeenCalledWith({
        nombre: baseFormValues.nombre,
        apellido: baseFormValues.apellido,
        email: baseFormValues.email,
        username: baseFormValues.username,
        ciudadCompleta: baseFormValues.ciudadCompleta,
        genero: baseFormValues.genero,
        fechaNacimiento: baseFormValues.fechaNacimiento,
        password: baseFormValues.password,
        confirmPassword: baseFormValues.confirmPassword,
      });
    });

    it("devuelve fieldErrors seguros y conserva cookie", async () => {
      mockValidateActivationInput.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ["email"], message: "El email no es válido" },
            { path: ["password"], message: "La contraseña es inválida" },
            { path: ["rawToken"], message: rawToken },
            { path: [], message: "form-level" },
          ],
        },
      });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "VALIDATION_ERROR",
        fieldErrors: {
          email: ["El email no es válido"],
          password: ["La contraseña es inválida"],
        },
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(baseFormValues.password);
      expect(serialized).not.toContain(baseFormValues.confirmPassword);
      expect(serialized).not.toContain(csrfNonce);
      expect(serialized).not.toContain(rawToken);
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });

    it("campo obligatorio ausente queda a cargo del validator", async () => {
      mockValidateActivationInput.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ["password"], message: "La contraseña es obligatoria" },
          ],
        },
      });

      const result = await activateAccount(
        buildFormData({ omitted: ["password"] }),
      );

      expect(result).toEqual(
        expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
      );
      expect(mockValidateActivationInput).toHaveBeenCalledWith(
        expect.objectContaining({ password: undefined }),
      );
      expectNoHashOrConsume();
    });

    it("fallo inesperado del validator retorna INTERNAL_ERROR sin consumir", async () => {
      mockValidateActivationInput.mockImplementation(() => {
        throw new Error(`validator failure ${baseFormValues.password}`);
      });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(JSON.stringify(result)).not.toContain(baseFormValues.password);
      expectNoHashOrConsume();
      expectActivationCookiePreserved();
    });
  });

  describe("password hashing", () => {
    it("usa bcrypt async exactamente una vez con password y cost 10", async () => {
      await expectSuccessRedirect();

      expect(mockBcryptHash).toHaveBeenCalledTimes(1);
      expect(mockBcryptHash.mock.calls).toEqual([[normalizedData.password, 10]]);
    });

    it("hashea antes de entrar a consumeAccountClaim", async () => {
      await expectSuccessRedirect();

      expect(events.indexOf("bcrypt")).toBeLessThan(
        events.indexOf("consume:start"),
      );
    });

    it("fallo de bcrypt retorna INTERNAL_ERROR, conserva cookie y no consume", async () => {
      mockBcryptHash.mockRejectedValue(
        new Error(`hash failure ${normalizedData.password}`),
      );

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(mockConsumeAccountClaim).not.toHaveBeenCalled();
      expect(mockUsuarioUpdateMany).not.toHaveBeenCalled();
      expectActivationCookiePreserved();
    });
  });

  describe("atomic activation", () => {
    it("delega el bearer únicamente a consumeAccountClaim", async () => {
      await expectSuccessRedirect();

      expect(mockConsumeAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockConsumeAccountClaim).toHaveBeenCalledWith(
        rawToken,
        expect.any(Function),
      );
    });

    it("actualiza Usuario dentro del callback con condición defensiva", async () => {
      await expectSuccessRedirect();

      expect(mockUsuarioUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockUsuarioUpdateMany).toHaveBeenCalledWith({
        where: {
          id: usuarioId,
          isPlaceholder: true,
        },
        data: {
          nombre: normalizedData.nombre,
          apellido: normalizedData.apellido,
          email: normalizedData.email,
          username: normalizedData.username,
          contraseña: passwordHash,
          ciudad: "Tunja",
          departamento: "Boyacá",
          genero: normalizedData.genero,
          fechaNacimiento,
          isPlaceholder: false,
          perfilCompleto: true,
          emailVerified: null,
        },
      });
      expect(events).toEqual(
        expect.arrayContaining([
          "consume:start",
          "usuario:update",
          "consume:end",
        ]),
      );
    });

    it("no modifica provisioning hash, role, país, id ni perfil visual", async () => {
      await expectSuccessRedirect();

      const data = mockUsuarioUpdateMany.mock.calls[0][0].data;
      expect(data).not.toHaveProperty("placeholderProvisioningKeyHash");
      expect(data).not.toHaveProperty("role");
      expect(data).not.toHaveProperty("pais");
      expect(data).not.toHaveProperty("id");
      expect(data).not.toHaveProperty("fotoPerfil");
      expect(data).not.toHaveProperty("createdAt");
    });

    it("count 0 revierte semánticamente y retorna terminal", async () => {
      mockUsuarioUpdateMany.mockResolvedValue({ count: 0 });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
      expectActivationCookieCleared();
    });

    it("count distinto de 1 también es terminal", async () => {
      mockUsuarioUpdateMany.mockResolvedValue({ count: 2 });

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expectActivationCookieCleared();
    });

    it("realiza cero writes sobre Negocio", async () => {
      await expectSuccessRedirect();

      expectNoNegocioWrites();
    });

    it("no abre otra transaction ni usa Prisma singleton", () => {
      const source = readFileSync(
        join(process.cwd(), "src/actions/auth/activateAccount.ts"),
        "utf8",
      );

      expect(source).not.toMatch(/@\/lib\/prisma|prisma\.\$transaction/);
      expect(source).not.toContain("validateAccountClaim");
      expect(source).not.toContain("issueAccountClaim");
      expect(source.match(/consumeAccountClaim\s*\(/g)).toHaveLength(1);
    });
  });

  describe("unique conflicts", () => {
    it.each([
      [["email"]],
      ["email"],
      ["Usuario_email_key"],
    ])("mapea target exacto email %p", async (target) => {
      mockUsuarioUpdateMany.mockRejectedValue(knownUniqueError(target));

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "EMAIL_UNAVAILABLE" });
      expectActivationCookiePreserved();
    });

    it("mapea constraint exacta de email", async () => {
      mockUsuarioUpdateMany.mockRejectedValue(
        knownUniqueError(undefined, { constraint: "Usuario_email_key" }),
      );

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "EMAIL_UNAVAILABLE" });
      expectActivationCookiePreserved();
    });

    it.each([
      [["username"]],
      ["username"],
      ["Usuario_username_key"],
    ])("mapea target exacto username %p", async (target) => {
      mockUsuarioUpdateMany.mockRejectedValue(knownUniqueError(target));

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "USERNAME_UNAVAILABLE" });
      expectActivationCookiePreserved();
    });

    it("mapea constraint exacta de username", async () => {
      mockUsuarioUpdateMany.mockRejectedValue(
        knownUniqueError(undefined, {
          constraint: "Usuario_username_key",
        }),
      );

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "USERNAME_UNAVAILABLE" });
      expectActivationCookiePreserved();
    });

    it.each([
      ["unknown target", knownUniqueError(["placeholderProvisioningKeyHash"])],
      ["multiple targets", knownUniqueError(["email", "username"])],
      ["missing target", knownUniqueError(undefined)],
      [
        "other model",
        knownUniqueError(["email"], { modelName: "Negocio" }),
      ],
      [
        "invalid empty model",
        knownUniqueError(["email"], { modelName: "" }),
      ],
    ])("P2002 %s retorna INTERNAL_ERROR sin meta", async (_label, error) => {
      mockUsuarioUpdateMany.mockRejectedValue(error);

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(JSON.stringify(result)).not.toContain("P2002");
      expect(JSON.stringify(result)).not.toContain("placeholderProvisioningKeyHash");
      expectActivationCookiePreserved();
    });
  });

  describe("terminal and internal failures", () => {
    it("AccountClaimError converge a ACTIVATION_UNAVAILABLE y limpia", async () => {
      mockConsumeAccountClaim.mockRejectedValue(new MockAccountClaimError());

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
      expectActivationCookieCleared();
    });

    it("error inesperado conserva cookie y no filtra detalles", async () => {
      mockConsumeAccountClaim.mockRejectedValue(
        new Error(`transaction failure ${rawToken} ${passwordHash}`),
      );

      const result = await activateAccount(buildFormData());

      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(rawToken);
      expect(serialized).not.toContain(passwordHash);
      expectActivationCookiePreserved();
    });
  });

  describe("success and replay", () => {
    it("limpia activation cookie antes del redirect fijo", async () => {
      await expectSuccessRedirect();

      expectActivationCookieCleared();
      expect(events.indexOf("cookie:clear")).toBeLessThan(
        events.indexOf("redirect"),
      );
    });

    it("no toca cookies Auth.js", async () => {
      await expectSuccessRedirect();

      expect(mockCookieSet).toHaveBeenCalledTimes(1);
      expect(mockCookieSet.mock.calls[0][0]).toBe(cookieName);
    });

    it("usa destino fijo e ignora callback controlado por browser", async () => {
      const result = await activateAccount(
        buildFormData({ extra: [["callbackUrl", "https://evil.example"]] }),
      );

      expect(result).toEqual({ ok: false, code: "INVALID_REQUEST" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("segundo submit terminal no repite el update", async () => {
      await expectSuccessRedirect();
      mockConsumeAccountClaim.mockRejectedValueOnce(
        new MockAccountClaimError(),
      );

      const secondResult = await activateAccount(buildFormData());

      expect(secondResult).toEqual({
        ok: false,
        code: "ACTIVATION_UNAVAILABLE",
      });
      expect(mockConsumeAccountClaim).toHaveBeenCalledTimes(2);
      expect(mockUsuarioUpdateMany).toHaveBeenCalledTimes(1);
      expect(mockCookieSet).toHaveBeenCalledTimes(2);
    });
  });

  it("no retorna ni loggea password, bearer, nonce o identidad interna", () => {
    const source = readFileSync(
      join(process.cwd(), "src/actions/auth/activateAccount.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/console\.(log|error)|logger|JSON\.stringify/);
    expect(source).not.toMatch(/return\s+.*(?:password|rawToken|csrfNonce|usuarioId)/);
    expect(source).not.toMatch(/signIn\s*\(|signOut\s*\(/);
    expect(source).not.toMatch(/httpOnly\s*:|sameSite\s*:|secure\s*:|maxAge\s*:/);
    expect(source).toContain('import { auth } from "@/auth.config";');
    expect(source).toContain('redirect(SUCCESS_REDIRECT)');
  });
});
