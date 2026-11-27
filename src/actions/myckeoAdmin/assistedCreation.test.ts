jest.mock("server-only", () => ({}), { virtual: true });
const mockAuthorize = jest.fn(),
  mockUser = jest.fn(),
  mockCandidates = jest.fn(),
  mockProvision = jest.fn(),
  mockCreate = jest.fn(),
  mockLog = jest.fn(),
  mockRevalidate = jest.fn(),
  mockLock = jest.fn();
const mockTransaction = jest.fn();
jest.mock("@/lib/business/productAccess", () => ({
  requireSuperAdmin: mockAuthorize,
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUser },
    negocio: { findMany: mockCandidates },
    $transaction: mockTransaction,
  },
}));
jest.mock("@/app/api/internal/onboarding/provision/route", () => ({
  POST: mockProvision,
}));
jest.mock("@/app/api/negocio/route", () => ({ POST: mockCreate }));
jest.mock("@/lib/auth/account-claim", () => ({ issueAccountClaim: jest.fn() }));
jest.mock("@/lib/observability/operationalLogger", () => ({
  reportOperationalError: mockLog,
}));
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
jest.mock("./revalidateAdminProductSurfaces", () => ({
  revalidateAdminProductSurfaces: jest.fn(),
}));
import { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
import { createAssistedBusinessAction } from "./assistedOnboarding";

const original = {
  secret: process.env.ACCOUNT_PROVISIONING_HMAC_SECRET,
  key: process.env.MYCKEO_ADMIN_KEY,
};
const secret = "synthetic-stable-provisioning-secret-for-tests-only";
const key = "synthetic-administrator-key";
const businessId = "65c10337-d2dc-4ef6-9f0b-0409a4221ea7";
const input = {
  operationId: "ee6ec19b-90af-438a-96ae-9cae0de740e5",
  nombre: "Comercio ficticio",
  departamento: "Cundinamarca",
  ciudad: "Bogotá",
  categoriaIds: ["1"],
  seccionIds: ["s4"],
  telefonoContacto: "+573000000000",
  descripcion: "Contenido comercial sintético autorizado.",
};
const success = {
  ok: true,
  negocioId: businessId,
  slug: "comercio-ficticio-bogota",
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
beforeEach(() => {
  jest.resetAllMocks();
  process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = secret;
  process.env.MYCKEO_ADMIN_KEY = key;
  mockAuthorize.mockResolvedValue({
    id: "synthetic-admin",
    role: "super_admin",
  });
  mockUser.mockResolvedValue(null);
  mockCandidates.mockResolvedValue([]);
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({ $queryRaw: mockLock }),
  );
  mockProvision.mockImplementation(async () =>
    response(
      { ok: true, usuarioId: "synthetic-placeholder", created: true },
      201,
    ),
  );
  mockCreate.mockImplementation(async () => response(success, 201));
});
afterAll(() => {
  if (original.secret === undefined)
    delete process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
  else process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = original.secret;
  if (original.key === undefined) delete process.env.MYCKEO_ADMIN_KEY;
  else process.env.MYCKEO_ADMIN_KEY = original.key;
});

describe("assisted creation configuration and recovery regression", () => {
  it("reproduces the missing runtime secret before Provision, a transaction or any business write", async () => {
    delete process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
    const result = await createAssistedBusinessAction(input);
    expect(result).toEqual({
      ok: false,
      error: "No se pudo preparar el negocio. Reintenta la misma operación.",
    });
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { stage: "configure", code: "PROVISIONING_SECRET_MISSING" },
      }),
    );
    for (const effect of [mockTransaction, mockUser, mockProvision, mockCreate])
      expect(effect).not.toHaveBeenCalled();
  });
  it.each(["short", `${secret} `])(
    "rejects a noncanonical configured secret without falling back to another credential (%#)",
    async (bad) => {
      process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = bad;
      expect((await createAssistedBusinessAction(input)).ok).toBe(false);
      expect(mockLog.mock.calls[0][0].context).toEqual({
        stage: "configure",
        code: "PROVISIONING_SECRET_INVALID",
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );
  it("checks the internal administrative key before starting a transaction", async () => {
    delete process.env.MYCKEO_ADMIN_KEY;
    expect((await createAssistedBusinessAction(input)).ok).toBe(false);
    expect(mockLog.mock.calls[0][0].context.code).toBe("ADMIN_KEY_MISSING");
    expect(mockTransaction).not.toHaveBeenCalled();
  });
  it("carries the validated commercial input through both existing in-process handlers", async () => {
    const fetcher = jest.spyOn(globalThis, "fetch");
    try {
      expect(await createAssistedBusinessAction(input)).toEqual({
        ok: true,
        business: { id: businessId, slug: success.slug },
      });
      const provisionRequest = mockProvision.mock.calls[0][0] as Request;
      expect(provisionRequest.headers.get("x-api-key") === key).toBe(true);
      expect(await provisionRequest.json()).toEqual({
        provisioningRef: `assisted-v1:${input.operationId}`,
        nombreNegocio: input.nombre,
        ciudadCompleta: "Bogotá - Cundinamarca",
      });
      const creationRequest = mockCreate.mock.calls[0][0] as Request;
      expect(creationRequest.headers.get("x-api-key") === key).toBe(true);
      expect(await creationRequest.json()).toEqual({
        usuarioId: "synthetic-placeholder",
        nombre: input.nombre,
        descripcion: input.descripcion,
        ciudad: input.ciudad,
        departamento: input.departamento,
        telefonoContacto: input.telefonoContacto,
        categoriaIds: input.categoriaIds,
        seccionIds: input.seccionIds,
        prepararOculto: true,
      });
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockLog).not.toHaveBeenCalled();
    } finally {
      fetcher.mockRestore();
    }
  });
  it("reuses the same identity and business on a repeated operation without calling either creator again", async () => {
    mockUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        negocio: {
          id: businessId,
          slug: success.slug,
          estado: "suspendido",
          archivedAt: null,
        },
      });
    const first = await createAssistedBusinessAction(input),
      second = await createAssistedBusinessAction(input);
    expect(first).toEqual(second);
    expect(mockProvision).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const expected = createHmac("sha256", secret)
      .update(`assisted-v1:${input.operationId}`)
      .digest("hex");
    expect(
      mockUser.mock.calls.every(
        (call) => call[0].where.placeholderProvisioningKeyHash === expected,
      ),
    ).toBe(true);
    expect(mockLock).toHaveBeenCalledTimes(6);
  });
  it("recovers the same provisioning reference after a partial business-creation failure", async () => {
    mockCreate
      .mockResolvedValueOnce(
        response({ ok: false, message: "Error al crear el negocio." }, 500),
      )
      .mockResolvedValueOnce(response(success, 201));
    mockProvision
      .mockResolvedValueOnce(
        response(
          { ok: true, usuarioId: "synthetic-placeholder", created: true },
          201,
        ),
      )
      .mockResolvedValueOnce(
        response({
          ok: true,
          usuarioId: "synthetic-placeholder",
          created: false,
        }),
      );
    expect((await createAssistedBusinessAction(input)).ok).toBe(false);
    expect((await createAssistedBusinessAction(input)).ok).toBe(true);
    const refs = await Promise.all(
      mockProvision.mock.calls.map(
        async ([request]) =>
          (await (request as Request).json()).provisioningRef,
      ),
    );
    expect(refs[0] === refs[1]).toBe(true);
    const users = await Promise.all(
      mockCreate.mock.calls.map(
        async ([request]) => (await (request as Request).json()).usuarioId,
      ),
    );
    expect(new Set(users).size).toBe(1);
    expect(mockLog.mock.calls[0][0].context).toEqual({
      stage: "create_business",
      code: "BUSINESS_CREATE_FAILED",
      httpStatus: 500,
    });
  });
  it.each([
    [{ telefonoContacto: "3000000000" }, "teléfono comercial"],
    [{ ciudad: "Ciudad inventada" }, "ciudad válida"],
    [{ categoriaIds: [] }, "categoría válida"],
    [{ seccionIds: [] }, "sección válida"],
    [{ nombre: "A" }, "nombre comercial"],
    [{ descripcion: "x".repeat(3001) }, "descripción"],
  ])(
    "returns a field-specific safe validation error before Provision (%#)",
    async (patch, expected) => {
      const result = await createAssistedBusinessAction({ ...input, ...patch });
      expect(result.ok).toBe(false);
      if (result.ok) throw Error("Expected invalid input");
      expect(result.error.toLowerCase()).toContain(expected);
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockProvision).not.toHaveBeenCalled();
      expect(mockLog.mock.calls[0][0].context).toEqual({
        stage: "validate",
        code: "INPUT_INVALID",
      });
    },
  );
  it.each([
    ["Una o más categorías no existen.", "categoría seleccionada"],
    ["Una o más secciones no existen.", "sección seleccionada"],
    [
      "Selecciona categorías y secciones activas compatibles.",
      "sección compatible",
    ],
  ])(
    "maps existing taxonomy rejection to a safe form message (%#)",
    async (message, expected) => {
      mockCreate.mockResolvedValue(response({ ok: false, message }, 400));
      const result = await createAssistedBusinessAction(input);
      expect(result.ok).toBe(false);
      if (result.ok) throw Error("Expected taxonomy failure");
      expect(result.error).toContain(expected);
    },
  );
  it("rejects unauthorized sessions before reading input", async () => {
    mockAuthorize.mockRejectedValue(
      new Error("Sensitive unauthorized details"),
    );
    const inputTrap = new Proxy(
      {},
      {
        get() {
          throw Error("Input read before authorization");
        },
      },
    );
    expect((await createAssistedBusinessAction(inputTrap)).ok).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockProvision).not.toHaveBeenCalled();
    expect(mockLog.mock.calls[0][0].context).toEqual({
      stage: "authorize",
      code: "AUTHORIZATION_FAILED",
    });
  });
  it("records only an allowlisted service code and HTTP status when Provision fails", async () => {
    mockProvision.mockResolvedValue(
      response(
        { ok: false, code: "UNAUTHORIZED", token: "synthetic-private-token" },
        401,
      ),
    );
    expect((await createAssistedBusinessAction(input)).ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockLog.mock.calls[0][0].context).toEqual({
      stage: "provision",
      code: "PROVISION_FAILED",
      httpStatus: 401,
      serviceCode: "UNAUTHORIZED",
    });
  });
  it("never serializes provider messages, input, keys, references or Prisma metadata into diagnostics", async () => {
    mockUser.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        `private provider details ${key} ${input.telefonoContacto}`,
        { code: "P2024", clientVersion: "test", meta: { private: secret } },
      ),
    );
    const result = await createAssistedBusinessAction(input);
    expect(result.ok).toBe(false);
    expect(mockLog.mock.calls[0][0].context).toEqual({
      stage: "deduplicate",
      code: "INTERNAL_ERROR",
      prismaCode: "P2024",
    });
    const serialized = JSON.stringify(mockLog.mock.calls);
    for (const value of [
      key,
      secret,
      input.nombre,
      input.telefonoContacto,
      input.operationId,
      input.descripcion,
      "private provider details",
    ])
      expect(serialized.includes(value)).toBe(false);
    expect(mockLog.mock.calls[0][0]).not.toHaveProperty("error");
  });
  it("does not echo an unknown provider response or code", async () => {
    mockProvision.mockResolvedValue(
      response({ code: `private-code-${key}` }, 503),
    );
    const result = await createAssistedBusinessAction(input);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result).includes(key)).toBe(false);
    expect(mockLog.mock.calls[0][0].context.serviceCode).toBe(
      "UNEXPECTED_RESPONSE",
    );
  });
  it("requires stable identifiers in a success response", async () => {
    mockCreate.mockResolvedValue(response({ ok: true }));
    expect((await createAssistedBusinessAction(input)).ok).toBe(false);
    expect(mockLog.mock.calls[0][0].context.code).toBe(
      "BUSINESS_RESPONSE_INVALID",
    );
  });
  it("keeps the generic response even if a diagnostic provider fails", async () => {
    delete process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
    mockLog.mockImplementation(() => {
      throw Error("Synthetic logger failure");
    });
    expect(await createAssistedBusinessAction(input)).toEqual({
      ok: false,
      error: "No se pudo preparar el negocio. Reintenta la misma operación.",
    });
  });
});
