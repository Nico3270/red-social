import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockRandomBytes = jest.fn();
const mockBcryptHash = jest.fn();
const mockUsuarioFindUnique = jest.fn();
const mockUsuarioCreate = jest.fn();
const mockUsuarioUpdate = jest.fn();
const mockAccountClaimCreate = jest.fn();
const mockNegocioCreate = jest.fn();
const mockNegocioUpdate = jest.fn();
const mockSepararCiudadDepartamento = jest.fn();
const mockNextResponseJson = jest.fn();

jest.mock("node:crypto", () => ({
  ...jest.requireActual("node:crypto"),
  randomBytes: mockRandomBytes,
}));
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: mockBcryptHash,
  },
}));
jest.mock(
  "@/helpers/usuario/funcionesUsuario",
  () => ({
    separarCiudadDepartamento: mockSepararCiudadDepartamento,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      usuario: {
        findUnique: mockUsuarioFindUnique,
        create: mockUsuarioCreate,
        update: mockUsuarioUpdate,
      },
      accountClaim: {
        create: mockAccountClaimCreate,
      },
      negocio: {
        create: mockNegocioCreate,
        update: mockNegocioUpdate,
      },
    },
  }),
  { virtual: true },
);
jest.mock(
  "next/server",
  () => ({
    NextResponse: {
      json: mockNextResponseJson,
    },
  }),
  { virtual: true },
);

import { createHmac } from "node:crypto";

import { Prisma } from "@prisma/client";

import { POST } from "./route";

const ADMIN_KEY = "internal-admin-key-for-route-tests";
const HMAC_SECRET = "account-provisioning-hmac-secret-for-route-tests";
const provisioningRef = "pending-business:business-123";
const usuarioId = "placeholder-user-1";
const passwordBytes = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 1),
);
const rawPassword = passwordBytes.toString("base64url");
const bcryptHash = "$2a$10$test-placeholder-password-hash";

const validBody = {
  provisioningRef,
  nombreNegocio: "Café Ámbar",
  ciudadCompleta: "Bogotá - Cundinamarca",
};

const previousAdminKey = process.env.MYCKEO_ADMIN_KEY;
const previousHmacSecret = process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;

type RequestOptions = {
  apiKey?: string | null;
  body?: unknown;
  rawBody?: string;
};

function makeRequest(options: RequestOptions = {}): Request {
  const {
    apiKey = ADMIN_KEY,
    body = validBody,
    rawBody = JSON.stringify(body),
  } = options;
  const headers = new Headers({ "content-type": "application/json" });

  if (apiKey !== null) {
    headers.set("x-api-key", apiKey);
  }

  return new Request("http://localhost/api/internal/onboarding/provision", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

async function responseBody(response: Awaited<ReturnType<typeof POST>>) {
  return response.json();
}

function provisioningHash(ref = provisioningRef): string {
  return createHmac("sha256", HMAC_SECRET).update(ref, "utf8").digest("hex");
}

function p2002(
  target: string | string[],
  options: { modelName?: string; constraint?: string } = {},
) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.18.0",
    meta: {
      modelName: options.modelName ?? "Usuario",
      target,
      ...(options.constraint ? { constraint: options.constraint } : {}),
    },
  });
}

describe("POST /api/internal/onboarding/provision", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.MYCKEO_ADMIN_KEY = ADMIN_KEY;
    process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = HMAC_SECRET;

    mockNextResponseJson.mockImplementation(
      (body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
    );
    mockRandomBytes.mockReturnValue(passwordBytes);
    mockBcryptHash.mockResolvedValue(bcryptHash);
    mockUsuarioFindUnique.mockResolvedValue(null);
    mockUsuarioCreate.mockResolvedValue({ id: usuarioId });
    mockSepararCiudadDepartamento.mockImplementation((value: string) => {
      const [ciudad = "", departamento = ""] = value
        .split(" - ")
        .map((part) => part.trim());
      return { ciudad, departamento };
    });
  });

  afterAll(() => {
    if (previousAdminKey === undefined) {
      delete process.env.MYCKEO_ADMIN_KEY;
    } else {
      process.env.MYCKEO_ADMIN_KEY = previousAdminKey;
    }

    if (previousHmacSecret === undefined) {
      delete process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
    } else {
      process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = previousHmacSecret;
    }
  });

  it.each([
    ["ausente", null],
    ["incorrecta", "x".repeat(ADMIN_KEY.length)],
    ["de longitud diferente", "wrong-key"],
  ])("rechaza API key %s antes de body y Prisma", async (_label, apiKey) => {
    const response = await POST(makeRequest({ apiKey }));

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockUsuarioCreate).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("acepta la API key correcta y continúa al provisioning", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(201);
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockUsuarioCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ausente", undefined],
    ["demasiado corto", "short-secret"],
    ["con padding whitespace", `${HMAC_SECRET} `],
  ])(
    "rechaza ACCOUNT_PROVISIONING_HMAC_SECRET %s con 500 genérico",
    async (_label, secret) => {
      if (secret === undefined) {
        delete process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
      } else {
        process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = secret;
      }

      const response = await POST(makeRequest());
      const body = await responseBody(response);

      expect(response.status).toBe(500);
      expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR" });
      expect(JSON.stringify(body)).not.toContain(String(secret));
      expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
      expect(mockUsuarioCreate).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      "provisioningRef faltante",
      {
        nombreNegocio: validBody.nombreNegocio,
        ciudadCompleta: validBody.ciudadCompleta,
      },
    ],
    ["provisioningRef vacío", { ...validBody, provisioningRef: "" }],
    [
      "provisioningRef demasiado largo",
      { ...validBody, provisioningRef: "A".repeat(129) },
    ],
    ["provisioningRef number", { ...validBody, provisioningRef: 123 }],
    ["provisioningRef object", { ...validBody, provisioningRef: {} }],
    ["provisioningRef array", { ...validBody, provisioningRef: [] }],
    [
      "provisioningRef con whitespace exterior",
      { ...validBody, provisioningRef: ` ${provisioningRef}` },
    ],
    [
      "provisioningRef con charset inválido",
      { ...validBody, provisioningRef: "pending business/123" },
    ],
    [
      "nombreNegocio faltante",
      {
        provisioningRef,
        ciudadCompleta: validBody.ciudadCompleta,
      },
    ],
    ["nombreNegocio vacío", { ...validBody, nombreNegocio: "   " }],
    [
      "ciudadCompleta faltante",
      {
        provisioningRef,
        nombreNegocio: validBody.nombreNegocio,
      },
    ],
    ["ciudadCompleta inválida", { ...validBody, ciudadCompleta: "Bogotá" }],
    ["body array", []],
    ["campo usuarioId prohibido", { ...validBody, usuarioId: "attacker" }],
    ["campo email prohibido", { ...validBody, email: "attacker@example.com" }],
    ["campo password prohibido", { ...validBody, password: "chosen" }],
    ["campo contraseña prohibido", { ...validBody, contraseña: "chosen" }],
    ["campo role prohibido", { ...validBody, role: "admin" }],
    ["campo isPlaceholder prohibido", { ...validBody, isPlaceholder: false }],
    ["campo perfilCompleto prohibido", { ...validBody, perfilCompleto: true }],
  ])("rechaza input inválido: %s", async (_label, body) => {
    const response = await POST(makeRequest({ body }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockUsuarioCreate).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("rechaza JSON malformado con 400 antes de Prisma", async () => {
    const response = await POST(makeRequest({ rawBody: "{" }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockUsuarioCreate).not.toHaveBeenCalled();
  });

  it("crea un placeholder con identidad HMAC y contraseña desconocida", async () => {
    const response = await POST(makeRequest());
    const body = await responseBody(response);
    const expectedProvisioningHash = provisioningHash();
    const createData = mockUsuarioCreate.mock.calls[0][0].data;
    const prismaArguments = JSON.stringify([
      ...mockUsuarioFindUnique.mock.calls,
      ...mockUsuarioCreate.mock.calls,
    ]);

    expect(mockSepararCiudadDepartamento).toHaveBeenCalledWith(
      validBody.ciudadCompleta,
    );
    expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
      where: {
        placeholderProvisioningKeyHash: expectedProvisioningHash,
      },
      select: { id: true, isPlaceholder: true },
    });
    expect(mockRandomBytes).toHaveBeenCalledWith(32);
    expect(mockBcryptHash).toHaveBeenCalledWith(rawPassword, 10);
    expect(mockUsuarioCreate).toHaveBeenCalledWith({
      data: {
        nombre: "Dueño",
        apellido: "Pendiente",
        email: `placeholder-${expectedProvisioningHash.slice(0, 40)}@accounts.myckeo.com`,
        contraseña: bcryptHash,
        username: `pending_${expectedProvisioningHash.slice(0, 24)}`,
        genero: "otro",
        fechaNacimiento: new Date("1990-01-01T00:00:00.000Z"),
        ciudad: "Bogotá",
        departamento: "Cundinamarca",
        isPlaceholder: true,
        perfilCompleto: false,
        placeholderProvisioningKeyHash: expectedProvisioningHash,
      },
      select: { id: true },
    });
    expect(expectedProvisioningHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.email).not.toContain("cafe");
    expect(createData.username).not.toContain("cafe");
    expect(createData).not.toHaveProperty("role");
    expect(createData).not.toHaveProperty("emailVerified");
    expect(prismaArguments).not.toContain(provisioningRef);
    expect(prismaArguments).not.toContain(rawPassword);
    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, usuarioId, created: true });
    expect(Object.keys(body as object).sort()).toEqual([
      "created",
      "ok",
      "usuarioId",
    ]);
    expect(JSON.stringify(body)).not.toMatch(
      /email|username|password|contraseña|hash|provisioningRef/i,
    );
  });

  it("genera passwords aleatorios independientes para placeholders distintos", async () => {
    mockRandomBytes
      .mockReturnValueOnce(Buffer.alloc(32, 7))
      .mockReturnValueOnce(Buffer.alloc(32, 8));
    mockUsuarioCreate
      .mockResolvedValueOnce({ id: "usuario-1" })
      .mockResolvedValueOnce({ id: "usuario-2" });

    await POST(makeRequest());
    await POST(
      makeRequest({
        body: { ...validBody, provisioningRef: "pending-business:business-2" },
      }),
    );

    expect(mockRandomBytes).toHaveBeenCalledTimes(2);
    expect(mockBcryptHash.mock.calls[0][0]).not.toBe(
      mockBcryptHash.mock.calls[1][0],
    );
  });

  it("elimina la colisión legacy para el mismo nombre con refs distintas", async () => {
    mockUsuarioCreate
      .mockResolvedValueOnce({ id: "usuario-a" })
      .mockResolvedValueOnce({ id: "usuario-b" });
    const secondRef = "pending-business:business-456";

    await POST(makeRequest());
    await POST(
      makeRequest({
        body: { ...validBody, provisioningRef: secondRef },
      }),
    );

    const firstData = mockUsuarioCreate.mock.calls[0][0].data;
    const secondData = mockUsuarioCreate.mock.calls[1][0].data;
    expect(firstData.email).not.toBe(secondData.email);
    expect(firstData.username).not.toBe(secondData.username);
    expect(firstData.placeholderProvisioningKeyHash).not.toBe(
      secondData.placeholderProvisioningKeyHash,
    );
  });

  it("repite la misma ref devolviendo el mismo Usuario sin crear otro", async () => {
    mockUsuarioFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: usuarioId, isPlaceholder: true });

    const firstResponse = await POST(makeRequest());
    const secondResponse = await POST(makeRequest());

    expect(firstResponse.status).toBe(201);
    await expect(responseBody(firstResponse)).resolves.toEqual({
      ok: true,
      usuarioId,
      created: true,
    });
    expect(secondResponse.status).toBe(200);
    await expect(responseBody(secondResponse)).resolves.toEqual({
      ok: true,
      usuarioId,
      created: false,
    });
    expect(mockUsuarioCreate).toHaveBeenCalledTimes(1);
    expect(mockRandomBytes).toHaveBeenCalledTimes(1);
    expect(mockBcryptHash).toHaveBeenCalledTimes(1);
  });

  it("reutiliza un placeholder existente sin generar password", async () => {
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId,
      isPlaceholder: true,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({
      ok: true,
      usuarioId,
      created: false,
    });
    expect(mockUsuarioCreate).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("responde conflicto genérico si la identidad ya fue activada", async () => {
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId,
      isPlaceholder: false,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "PROVISIONING_UNAVAILABLE",
    });
    expect(mockUsuarioCreate).not.toHaveBeenCalled();
    expect(mockRandomBytes).not.toHaveBeenCalled();
    expect(mockBcryptHash).not.toHaveBeenCalled();
  });

  it("recupera el Usuario ganador de una race P2002 del provisioning hash", async () => {
    mockUsuarioFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "race-winner", isPlaceholder: true });
    mockUsuarioCreate.mockRejectedValueOnce(
      p2002(["placeholderProvisioningKeyHash"]),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({
      ok: true,
      usuarioId: "race-winner",
      created: false,
    });
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(2);
    expect(mockUsuarioCreate).toHaveBeenCalledTimes(1);
  });

  it.each(["email", "username", "id"])(
    "no reutiliza otro Usuario ante P2002 de %s",
    async (uniqueField) => {
      mockUsuarioCreate.mockRejectedValueOnce(p2002([uniqueField]));

      const response = await POST(makeRequest());

      expect(response.status).toBe(500);
      await expect(responseBody(response)).resolves.toEqual({
        ok: false,
        code: "INTERNAL_ERROR",
      });
      expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(1);
      expect(mockUsuarioCreate).toHaveBeenCalledTimes(1);
    },
  );

  it("no recupera P2002 del mismo campo informado para otro modelo", async () => {
    mockUsuarioCreate.mockRejectedValueOnce(
      p2002(["placeholderProvisioningKeyHash"], {
        modelName: "OtherModel",
      }),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(1);
  });

  it("falla cerrado si la race P2002 no permite resolver un ganador", async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    mockUsuarioCreate.mockRejectedValueOnce(
      p2002("Usuario_placeholderProvisioningKeyHash_key"),
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
    });
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(2);
  });

  it("no crea AccountClaim, Negocio ni actualiza Usuario", async () => {
    await POST(makeRequest());

    expect(mockAccountClaimCreate).not.toHaveBeenCalled();
    expect(mockNegocioCreate).not.toHaveBeenCalled();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockUsuarioUpdate).not.toHaveBeenCalled();
  });

  it("no importa AccountClaim, no usa identidad slug y no contiene logging", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/internal/onboarding/provision/route.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/issueAccountClaim|accountClaim\./);
    expect(source).not.toContain("generarUsernameUnico");
    expect(source).not.toContain("2025*");
    expect(source).not.toMatch(/console\.|\blogger\b/);
    expect(source).not.toMatch(
      /credenciales|contraseñaTemporal|contraseña_temporal/,
    );
  });
});
