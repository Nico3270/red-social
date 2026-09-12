import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockIssueAccountClaim = jest.fn();
const mockUsuarioFindUnique = jest.fn();
const mockUsuarioCreate = jest.fn();
const mockUsuarioUpdate = jest.fn();
const mockUsuarioUpsert = jest.fn();
const mockUsuarioDelete = jest.fn();
const mockNegocioFindUnique = jest.fn();
const mockNegocioCreate = jest.fn();
const mockNegocioUpdate = jest.fn();
const mockNegocioUpsert = jest.fn();
const mockNegocioDelete = jest.fn();
const mockAccountClaimCreate = jest.fn();
const mockAccountClaimUpdateMany = jest.fn();
const mockNextResponseJson = jest.fn();

class MockAccountClaimError extends Error {
  readonly code = "ACCOUNT_CLAIM_UNAVAILABLE";

  constructor() {
    super("Account claim operation failed.");
    this.name = "AccountClaimError";
  }
}

jest.mock(
  "@/lib/auth/account-claim",
  () => ({
    AccountClaimError: MockAccountClaimError,
    issueAccountClaim: mockIssueAccountClaim,
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
        upsert: mockUsuarioUpsert,
        delete: mockUsuarioDelete,
      },
      negocio: {
        findUnique: mockNegocioFindUnique,
        create: mockNegocioCreate,
        update: mockNegocioUpdate,
        upsert: mockNegocioUpsert,
        delete: mockNegocioDelete,
      },
      accountClaim: {
        create: mockAccountClaimCreate,
        updateMany: mockAccountClaimUpdateMany,
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

import { POST as provisionPOST } from "../provision/route";
import { POST } from "./route";

const ADMIN_KEY = "internal-admin-key-for-claim-tests";
const HMAC_SECRET = "account-provisioning-hmac-secret-for-claim-tests";
const provisioningRef = "pending-business:business-123";
const usuarioId = "placeholder-user-1";
const negocioId = "business-1";
const firstRawToken = "A".repeat(43);
const secondRawToken = "B".repeat(43);
const firstExpiresAt = new Date("2026-09-12T16:00:00.000Z");
const secondExpiresAt = new Date("2026-09-12T16:05:00.000Z");

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
    body = { provisioningRef },
    rawBody = JSON.stringify(body),
  } = options;
  const headers = new Headers({ "content-type": "application/json" });

  if (apiKey !== null) {
    headers.set("x-api-key", apiKey);
  }

  return new Request("http://localhost/api/internal/onboarding/claim", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

function makeProvisionRequest(): Request {
  return new Request("http://localhost/api/internal/onboarding/provision", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ADMIN_KEY,
    },
    body: JSON.stringify({
      provisioningRef,
      nombreNegocio: "Negocio compatible",
      ciudadCompleta: "Bogotá - Cundinamarca",
    }),
  });
}

async function responseBody(response: Awaited<ReturnType<typeof POST>>) {
  return response.json();
}

function expectedProvisioningHash(): string {
  return createHmac("sha256", HMAC_SECRET)
    .update(provisioningRef, "utf8")
    .digest("hex");
}

describe("POST /api/internal/onboarding/claim", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.MYCKEO_ADMIN_KEY = ADMIN_KEY;
    process.env.ACCOUNT_PROVISIONING_HMAC_SECRET = HMAC_SECRET;

    mockNextResponseJson.mockImplementation(
      (body: unknown, init?: { status?: number; headers?: HeadersInit }) => ({
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
        json: async () => body,
      }),
    );
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId,
      isPlaceholder: true,
    });
    mockNegocioFindUnique.mockResolvedValue({ id: negocioId });
    mockIssueAccountClaim.mockResolvedValue({
      rawToken: firstRawToken,
      expiresAt: firstExpiresAt,
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
  ])("rechaza API key %s antes de Prisma", async (_label, apiKey) => {
    const response = await POST(makeRequest({ apiKey }));

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("acepta la API key correcta y continúa", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockNegocioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockIssueAccountClaim).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ausente", undefined],
    ["demasiado corto", "short-secret"],
    ["con whitespace accidental", `${HMAC_SECRET} `],
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
      expect(mockNegocioFindUnique).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["body null", null],
    ["body array", []],
    ["provisioningRef faltante", {}],
    ["provisioningRef vacío", { provisioningRef: "" }],
    ["provisioningRef whitespace", { provisioningRef: ` ${provisioningRef}` }],
    ["provisioningRef largo", { provisioningRef: "A".repeat(129) }],
    [
      "provisioningRef charset inválido",
      { provisioningRef: "pending/business 1" },
    ],
    ["provisioningRef number", { provisioningRef: 123 }],
    ["campo usuarioId extra", { provisioningRef, usuarioId: "attacker" }],
    ["campo negocioId extra", { provisioningRef, negocioId: "attacker" }],
    ["campo email extra", { provisioningRef, email: "attacker@example.com" }],
    ["campo username extra", { provisioningRef, username: "attacker" }],
    ["campo tokenHash extra", { provisioningRef, tokenHash: "attacker" }],
    ["campo isPlaceholder extra", { provisioningRef, isPlaceholder: true }],
    ["campo password extra", { provisioningRef, password: "attacker" }],
  ])("rechaza request inválido: %s", async (_label, body) => {
    const response = await POST(makeRequest({ body }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("rechaza JSON malformado con 400", async () => {
    const response = await POST(makeRequest({ rawBody: "{" }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_REQUEST",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
  });

  it("calcula el HMAC-SHA256 hexadecimal exacto sin persistir la ref RAW", async () => {
    await POST(makeRequest());

    const expectedHash = expectedProvisioningHash();
    const prismaArguments = JSON.stringify([
      ...mockUsuarioFindUnique.mock.calls,
      ...mockNegocioFindUnique.mock.calls,
    ]);

    expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
      where: {
        placeholderProvisioningKeyHash: expectedHash,
      },
      select: {
        id: true,
        isPlaceholder: true,
      },
    });
    expect(prismaArguments).not.toContain(provisioningRef);
  });

  it("produce exactamente el mismo provisioning hash que el endpoint provision", async () => {
    await provisionPOST(makeProvisionRequest());
    await POST(makeRequest());

    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(2);
    const provisionHash =
      mockUsuarioFindUnique.mock.calls[0][0].where
        .placeholderProvisioningKeyHash;
    const claimHash =
      mockUsuarioFindUnique.mock.calls[1][0].where
        .placeholderProvisioningKeyHash;

    expect(provisionHash).toBe(expectedProvisioningHash());
    expect(claimHash).toBe(expectedProvisioningHash());
    expect(claimHash).toBe(provisionHash);
  });

  it("responde 409 uniforme si Usuario no existe", async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "CLAIM_UNAVAILABLE",
    });
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("responde 409 uniforme si Usuario ya está activado", async () => {
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId,
      isPlaceholder: false,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "CLAIM_UNAVAILABLE",
    });
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("responde 409 y no emite claim si Negocio todavía no existe", async () => {
    mockNegocioFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "CLAIM_UNAVAILABLE",
    });
    expect(mockNegocioFindUnique).toHaveBeenCalledWith({
      where: { usuarioId },
      select: { id: true },
    });
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("emite sólo después del gate de Negocio y retorna el contrato mínimo", async () => {
    const events: string[] = [];
    mockNegocioFindUnique.mockImplementationOnce(async () => {
      events.push("negocio");
      return { id: negocioId };
    });
    mockIssueAccountClaim.mockImplementationOnce(async () => {
      events.push("issue");
      return { rawToken: firstRawToken, expiresAt: firstExpiresAt };
    });

    const response = await POST(makeRequest());
    const body = await responseBody(response);

    expect(events).toEqual(["negocio", "issue"]);
    expect(mockIssueAccountClaim).toHaveBeenCalledWith(usuarioId);
    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      rawToken: firstRawToken,
      expiresAt: firstExpiresAt.toISOString(),
    });
    expect(Object.keys(body as object).sort()).toEqual([
      "expiresAt",
      "ok",
      "rawToken",
    ]);
    expect(JSON.stringify(body)).not.toMatch(
      /usuarioId|negocioId|email|username|tokenHash|provisioningHash|password|provisioningRef/i,
    );
  });

  it("marca toda respuesta como no-store y no-cache", async () => {
    const response = await POST(makeRequest());

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(mockNextResponseJson).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      }),
    );
  });

  it("reemite mediante el servicio sin reutilizar el bearer anterior", async () => {
    mockIssueAccountClaim
      .mockResolvedValueOnce({
        rawToken: firstRawToken,
        expiresAt: firstExpiresAt,
      })
      .mockResolvedValueOnce({
        rawToken: secondRawToken,
        expiresAt: secondExpiresAt,
      });

    const firstResponse = await POST(makeRequest());
    const secondResponse = await POST(makeRequest());
    const firstBody = await responseBody(firstResponse);
    const secondBody = await responseBody(secondResponse);

    expect(mockIssueAccountClaim).toHaveBeenCalledTimes(2);
    expect(mockIssueAccountClaim).toHaveBeenNthCalledWith(1, usuarioId);
    expect(mockIssueAccountClaim).toHaveBeenNthCalledWith(2, usuarioId);
    expect(firstBody).toEqual({
      ok: true,
      rawToken: firstRawToken,
      expiresAt: firstExpiresAt.toISOString(),
    });
    expect(secondBody).toEqual({
      ok: true,
      rawToken: secondRawToken,
      expiresAt: secondExpiresAt.toISOString(),
    });
    expect((firstBody as { rawToken: string }).rawToken).not.toBe(
      (secondBody as { rawToken: string }).rawToken,
    );
  });

  it("mapea AccountClaimError a 409 sin filtrar internals", async () => {
    mockIssueAccountClaim.mockRejectedValueOnce(new MockAccountClaimError());

    const response = await POST(makeRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(409);
    expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE" });
    expect(JSON.stringify(body)).not.toMatch(
      /AccountClaim|ACCOUNT_CLAIM_UNAVAILABLE|operation failed/i,
    );
  });

  it("mapea errores Prisma inesperados a 500 sin filtrarlos", async () => {
    mockUsuarioFindUnique.mockRejectedValueOnce(
      new Error("sensitive database error"),
    );

    const response = await POST(makeRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR" });
    expect(JSON.stringify(body)).not.toContain("sensitive database error");
  });

  it("mapea errores inesperados del servicio a 500 sin filtrar el bearer", async () => {
    mockIssueAccountClaim.mockRejectedValueOnce(
      new Error(`P2034 after ${firstRawToken}`),
    );

    const response = await POST(makeRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(500);
    expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR" });
    expect(JSON.stringify(body)).not.toContain(firstRawToken);
    expect(JSON.stringify(body)).not.toContain("P2034");
  });

  it("no escribe Usuario, Negocio ni AccountClaim directamente", async () => {
    await POST(makeRequest());

    expect(mockUsuarioCreate).not.toHaveBeenCalled();
    expect(mockUsuarioUpdate).not.toHaveBeenCalled();
    expect(mockUsuarioUpsert).not.toHaveBeenCalled();
    expect(mockUsuarioDelete).not.toHaveBeenCalled();
    expect(mockNegocioCreate).not.toHaveBeenCalled();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockNegocioUpsert).not.toHaveBeenCalled();
    expect(mockNegocioDelete).not.toHaveBeenCalled();
    expect(mockAccountClaimCreate).not.toHaveBeenCalled();
    expect(mockAccountClaimUpdateMany).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).toHaveBeenCalledTimes(1);
  });

  it("usa sólo el servicio auditado, runtime nodejs y no contiene logging", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/internal/onboarding/claim/route.ts"),
      "utf8",
    );

    expect(source).toContain('export const runtime = "nodejs";');
    expect(source).toContain('from "@/lib/prisma"');
    expect(source).toContain("issueAccountClaim(usuario.id)");
    expect(source).not.toMatch(/prisma\.accountClaim\./);
    expect(source).not.toMatch(
      /prisma\.usuario\.(create|update|upsert|delete)/,
    );
    expect(source).not.toMatch(
      /prisma\.negocio\.(create|update|upsert|delete)/,
    );
    expect(source).not.toMatch(/console\.|\blogger\b|JSON\.stringify/);
    expect(source).not.toMatch(/console\.(log|error)\s*\([^)]*rawToken/);
  });
});
