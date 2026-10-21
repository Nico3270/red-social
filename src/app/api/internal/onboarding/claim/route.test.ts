import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  AccountClaimIssueOrRecoverResult, AccountClaimKeyring, issueOrRecoverAccountClaim,
} from "@/lib/auth/account-claim";

const mockIssueOrRecoverAccountClaim = jest.fn<
  ReturnType<typeof issueOrRecoverAccountClaim>, Parameters<typeof issueOrRecoverAccountClaim>
>();
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
    issueOrRecoverAccountClaim: mockIssueOrRecoverAccountClaim,
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
const negocioSlug = "negocio-consultado";
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
      perfilCompleto: false,
    });
    mockNegocioFindUnique.mockResolvedValue({ id: negocioId, slug: negocioSlug });
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
    await expect(responseBody(response)).resolves.toEqual(expect.objectContaining({
      ok: false,
      code: "UNAUTHORIZED",
    }));
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
      expect(body).toEqual(expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }));
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
    await expect(responseBody(response)).resolves.toEqual(expect.objectContaining({
      ok: false,
      code: "INVALID_REQUEST",
    }));
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("rechaza JSON malformado con 400", async () => {
    const response = await POST(makeRequest({ rawBody: "{" }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(expect.objectContaining({
      ok: false,
      code: "INVALID_REQUEST",
    }));
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
      select: expect.objectContaining({
        id: true,
        isPlaceholder: true,
      }),
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

  it("responde USER_NOT_FOUND sin emitir claim si Usuario no existe", async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    const response = await POST(makeRequest());
    expect(response.status).toBe(404);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false, code: "CLAIM_UNAVAILABLE", status: "USER_NOT_FOUND",
    });
    expect(mockNegocioFindUnique).not.toHaveBeenCalled();
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("responde ACCOUNT_ALREADY_ACTIVE sólo con cuenta completada y negocio existente", async () => {
    mockUsuarioFindUnique.mockResolvedValue({
      id: usuarioId, isPlaceholder: false, perfilCompleto: true,
    });
    const response = await POST(makeRequest());
    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false, code: "CLAIM_UNAVAILABLE", status: "ACCOUNT_ALREADY_ACTIVE",
      profile: { userId: usuarioId, businessId: negocioId, slug: negocioSlug },
    });
    expect(mockNegocioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    expect(mockAccountClaimCreate).not.toHaveBeenCalled();
    expect(mockAccountClaimUpdateMany).not.toHaveBeenCalled();
  });

  it("responde BUSINESS_NOT_FOUND y no emite claim si Negocio no existe", async () => {
    mockNegocioFindUnique.mockResolvedValue(null);
    const response = await POST(makeRequest());
    expect(response.status).toBe(404);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false, code: "CLAIM_UNAVAILABLE", status: "BUSINESS_NOT_FOUND",
    });
    expect(mockNegocioFindUnique).toHaveBeenCalledWith({
      where: { usuarioId }, select: expect.objectContaining({ id: true, slug: true }),
    });
    expect(mockIssueAccountClaim).not.toHaveBeenCalled();
  });

  it("emite sólo después del gate de Negocio y retorna el contrato mínimo", async () => {
    const events: string[] = [];
    mockNegocioFindUnique.mockImplementationOnce(async () => {
      events.push("negocio");
      return { id: negocioId, slug: negocioSlug };
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
      status: "CLAIM_ISSUED",
      rawToken: firstRawToken,
      expiresAt: firstExpiresAt.toISOString(),
      profile: { userId: usuarioId, businessId: negocioId, slug: negocioSlug },
    });
    expect(Object.keys(body as object).sort()).toEqual([
      "expiresAt",
      "ok",
      "profile",
      "rawToken",
      "status",
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
      status: "CLAIM_ISSUED",
      rawToken: firstRawToken,
      expiresAt: firstExpiresAt.toISOString(),
      profile: { userId: usuarioId, businessId: negocioId, slug: negocioSlug },
    });
    expect(secondBody).toEqual({
      ok: true,
      status: "CLAIM_ISSUED",
      rawToken: secondRawToken,
      expiresAt: secondExpiresAt.toISOString(),
      profile: { userId: usuarioId, businessId: negocioId, slug: negocioSlug },
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
    expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "CLAIM_UNAVAILABLE" });
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
    expect(body).toEqual(expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }));
    expect(JSON.stringify(body)).not.toContain("sensitive database error");
  });

  it("mapea errores inesperados del servicio a 500 sin filtrar el bearer", async () => {
    mockIssueAccountClaim.mockRejectedValueOnce(
      new Error(`P2034 after ${firstRawToken}`),
    );

    const response = await POST(makeRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(500);
    expect(body).toEqual(expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }));
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

  /**
   * HTTP discrimination only; all tokens below are fixed synthetic fixtures.
   * Existing success fields ok/rawToken/expiresAt are retained for myckeo-admin's
   * issueActivationClaim. status and profile are additive. Existing error code is
   * retained, but status is the semantic discriminator (404 for missing resources).
   * That caller currently interprets every 409 as active: it REQUIRES FOLLOW-UP.
   *
   * Evidence: activateAccount.ts and updateUserProfile.ts set isPlaceholder=false
   * and perfilCompleto=true. A false placeholder flag alone is insufficient.
   * These flags establish current account readiness, not historical proof that a
   * particular claim was consumed. Missing business takes precedence over active.
   * AccountClaimError is intentionally still CLAIM_UNAVAILABLE: the service also
   * uses it for races/conflicts, so it proves neither activation nor missing user.
   *
   * The no-idempotencyKey legacy path remains mocked and preserves reissuance.
   * Its lost-response gap remains until callers migrate. The separate idempotent
   * contract below delegates recovery to the stabilized issueOrRecoverAccountClaim
   * domain API; this HTTP adapter does not implement cryptography or persistence.
   */
  describe("structured activation claim HTTP contract", () => {
    const profile = () => ({ userId: usuarioId, businessId: negocioId, slug: negocioSlug });

    function expectNoRawToken(body: unknown) {
      const serialized = JSON.stringify(body);
      // Boolean assertions avoid printing a bearer in failed assertion output.
      expect(serialized.includes(firstRawToken)).toBe(false);
      expect(serialized.includes(secondRawToken)).toBe(false);
      expect(serialized).not.toMatch(/rawToken|tokenHash|password|contraseña|claimId/i);
    }

    it("CLAIM_ISSUED preserva legacy y agrega identidad consultada sin reconstruirla", async () => {
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true, status: "CLAIM_ISSUED", rawToken: firstRawToken,
        expiresAt: firstExpiresAt.toISOString(), profile: profile(),
      });
      expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
        where: { placeholderProvisioningKeyHash: expectedProvisioningHash() },
        select: expect.objectContaining({ id: true, isPlaceholder: true, perfilCompleto: true }),
      });
      expect(mockNegocioFindUnique).toHaveBeenCalledWith({
        where: { usuarioId }, select: expect.objectContaining({ id: true, slug: true }),
      });
      expect(mockIssueAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockIssueAccountClaim).toHaveBeenCalledWith(usuarioId);
    });

    it("retorna los IDs y slug de las filas consultadas, no fixtures ni provisioningRef", async () => {
      mockUsuarioFindUnique.mockResolvedValue({ id: "another-user", isPlaceholder: true, perfilCompleto: false });
      mockNegocioFindUnique.mockResolvedValue({ id: "another-business", slug: "another-stored-slug" });
      const body = await responseBody(await POST(makeRequest()));
      expect(body.profile).toEqual({ userId: "another-user", businessId: "another-business", slug: "another-stored-slug" });
      expect(mockNegocioFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: "another-user" } }));
      expect(mockIssueAccountClaim).toHaveBeenCalledWith("another-user");
    });

    it("no devuelve éxito antes de que el servicio haya resuelto la persistencia", async () => {
      let release!: (value: { rawToken: string; expiresAt: Date }) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => { entered = resolve; });
      const persisted = new Promise<{ rawToken: string; expiresAt: Date }>((resolve) => { release = resolve; });
      mockIssueAccountClaim.mockImplementationOnce(() => { entered(); return persisted; });
      let responded = false;
      const pending = POST(makeRequest()).then((response) => { responded = true; return response; });
      await started;
      try { expect(responded).toBe(false); expect(mockNextResponseJson).not.toHaveBeenCalled(); }
      finally { release({ rawToken: firstRawToken, expiresAt: firstExpiresAt }); }
      const body = await responseBody(await pending);
      expect(body.status).toBe("CLAIM_ISSUED");
      expect(body.rawToken === firstRawToken).toBe(true);
      expect(body.expiresAt).toBe(firstExpiresAt.toISOString());
    });

    it("ACCOUNT_ALREADY_ACTIVE no emite ni revoca ningún claim", async () => {
      mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: true });
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(409);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "ACCOUNT_ALREADY_ACTIVE", profile: profile() });
      expectNoRawToken(body);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
      expect(mockAccountClaimCreate).not.toHaveBeenCalled();
      expect(mockAccountClaimUpdateMany).not.toHaveBeenCalled();
    });

    it("USER_NOT_CLAIMABLE distingue no-placeholder con perfil incompleto de activación", async () => {
      mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: false });
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(409);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "USER_NOT_CLAIMABLE" });
      expectNoRawToken(body);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it.each([true, false])("usuario %s placeholder sin negocio nunca se considera activo", async (isPlaceholder) => {
      mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder, perfilCompleto: !isPlaceholder });
      mockNegocioFindUnique.mockResolvedValue(null);
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(404);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "BUSINESS_NOT_FOUND" });
      expectNoRawToken(body);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("USER_NOT_FOUND tiene discriminante propio y no emite claim", async () => {
      mockUsuarioFindUnique.mockResolvedValue(null);
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(404);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "USER_NOT_FOUND" });
      expectNoRawToken(body);
      expect(mockNegocioFindUnique).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("AccountClaimError tras el precheck no demuestra ACCOUNT_ALREADY_ACTIVE", async () => {
      mockIssueAccountClaim.mockRejectedValueOnce(new MockAccountClaimError());
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(409);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status: "CLAIM_UNAVAILABLE" });
      expectNoRawToken(body);
      expect(mockIssueAccountClaim).toHaveBeenCalledTimes(1);
    });

    it.each(["usuario", "negocio", "issuer"] as const)("error inesperado de %s conserva 500 recuperable sin filtrar secretos", async (stage) => {
      const failing = stage === "usuario" ? mockUsuarioFindUnique : stage === "negocio" ? mockNegocioFindUnique : mockIssueAccountClaim;
      failing.mockRejectedValueOnce(new Error(`private database detail ${firstRawToken}`));
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(500);
      expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR", status: "INTERNAL_ERROR" });
      expectNoRawToken(body);
      expect(JSON.stringify(body).includes("private database detail")).toBe(false);
      if (stage !== "issuer") expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it.each([
      ["UNAUTHORIZED", 401, { apiKey: null }],
      ["INVALID_REQUEST", 400, { body: {} }],
    ] as const)("%s también expone body.status sin debilitar gates", async (status, http, options) => {
      const response = await POST(makeRequest(options));
      const body = await responseBody(response);
      expect(response.status).toBe(http);
      expect(body).toEqual({ ok: false, code: status, status });
      expectNoRawToken(body);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
      expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    });

    it.each(["active", "missing-user", "missing-business", "not-claimable", "internal-error"] as const)("%s conserva no-store y no-cache", async (state) => {
      if (state === "active") mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: true });
      if (state === "missing-user") mockUsuarioFindUnique.mockResolvedValue(null);
      if (state === "missing-business") mockNegocioFindUnique.mockResolvedValue(null);
      if (state === "not-claimable") mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: false });
      if (state === "internal-error") mockUsuarioFindUnique.mockRejectedValue(new Error("DB unavailable"));
      const response = await POST(makeRequest());
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("pragma")).toBe("no-cache");
      expectNoRawToken(await responseBody(response));
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("ninguna respuesta ni error registra el token o datos de identidad privados", async () => {
      const spies = [jest.spyOn(console, "log"), jest.spyOn(console, "warn"), jest.spyOn(console, "error")];
      for (const spy of spies) spy.mockImplementation(() => undefined);
      try {
        await POST(makeRequest());
        mockIssueAccountClaim.mockRejectedValueOnce(new Error(`issuer private ${firstRawToken}`));
        const errorBody = await responseBody(await POST(makeRequest()));
        expectNoRawToken(errorBody);
        for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      } finally { for (const spy of spies) spy.mockRestore(); }
    });
  });

  /**
   * Idempotent HTTP adapter, not a second claim state machine.
   * Input remains provisioningRef plus an optional, opaque idempotencyKey.
   * Omitting the key retains the temporary legacy path used by myckeo-admin.
   * Providing an invalid key must NEVER fall back to legacy issuance.
   *
   * Server configuration contract: ACCOUNT_CLAIM_KEYRING is JSON containing
   * { activeKeyId, keys: { [keyId]: canonicalBase64Secret } }. Decode secrets to
   * Buffers (at least 32 bytes) for the actual domain API. Retain old versions;
   * never derive from ACCOUNT_PROVISIONING_HMAC_SECRET or accept client keyring
   * configuration. No real secrets, tokens, DB calls or HMAC issuance occur here.
   *
   * Success: 200 / CLAIM_ISSUED or CLAIM_RECOVERED. Domain conflicts: 409 with
   * distinct statuses; expired/revoked: 410. RECOVERY_UNAVAILABLE is 409, not an
   * invitation to retry with a different key. Unexpected errors remain 500.
   * Existing ok/code/rawToken/expiresAt fields remain compatible; callers must
   * migrate from interpreting every 409 as active to reading body.status.
   */
  describe("idempotent activation claim HTTP contract", () => {
    const idempotencyKey = "send-profile-activation:pending-business:business-123";
    const claimId = "synthetic-persisted-claim";
    const keyring: AccountClaimKeyring = {
      activeKeyId: "test-v2",
      keys: { "test-v1": Buffer.alloc(32, 17), "test-v2": Buffer.alloc(32, 34) },
    };
    const encodedKeyring = JSON.stringify({
      activeKeyId: keyring.activeKeyId,
      keys: Object.fromEntries(Object.entries(keyring.keys).map(([id, secret]) => [id, secret.toString("base64")])),
    });
    const previousKeyring = process.env.ACCOUNT_CLAIM_KEYRING;
    const profile = () => ({ userId: usuarioId, businessId: negocioId, slug: negocioSlug });
    const input = () => ({ userId: usuarioId, businessId: negocioId, idempotencyKey });
    const request = () => makeRequest({ body: { provisioningRef, idempotencyKey } });
    const issued = (status: "CREATED" | "RECOVERED"): AccountClaimIssueOrRecoverResult => ({
      status, claimId, rawToken: firstRawToken, expiresAt: firstExpiresAt,
    });

    beforeEach(() => {
      process.env.ACCOUNT_CLAIM_KEYRING = encodedKeyring;
      mockIssueOrRecoverAccountClaim.mockResolvedValue(issued("CREATED"));
    });

    afterEach(() => {
      if (previousKeyring === undefined) delete process.env.ACCOUNT_CLAIM_KEYRING;
      else process.env.ACCOUNT_CLAIM_KEYRING = previousKeyring;
      // The endpoint delegates persistence and concurrency to the domain.
      for (const write of [mockAccountClaimCreate, mockAccountClaimUpdateMany,
        mockUsuarioCreate, mockUsuarioUpdate, mockUsuarioUpsert, mockUsuarioDelete,
        mockNegocioCreate, mockNegocioUpdate, mockNegocioUpsert, mockNegocioDelete]) {
        expect(write).not.toHaveBeenCalled();
      }
    });

    function expectSafeBody(body: unknown, allowToken = false) {
      const serialized = JSON.stringify(body);
      expect(serialized.includes(HMAC_SECRET)).toBe(false);
      for (const secret of Object.values(keyring.keys)) {
        expect(serialized.includes(secret.toString("base64"))).toBe(false);
        expect(serialized.includes(secret.toString("hex"))).toBe(false);
      }
      expect(serialized).not.toMatch(/tokenHash|derivationKeyId|keyring|claimId|password|contraseña/);
      if (!allowToken) {
        expect(serialized.includes(firstRawToken)).toBe(false);
        expect(serialized.includes(secondRawToken)).toBe(false);
        expect(serialized).not.toMatch(/rawToken|"token"/);
      }
    }

    function expectNoCache(response: Awaited<ReturnType<typeof POST>>) {
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("pragma")).toBe("no-cache");
    }

    it.each([
      ["CREATED", "CLAIM_ISSUED"], ["RECOVERED", "CLAIM_RECOVERED"],
    ] as const)("%s maps to 200 %s with the immediate bearer and consulted profile", async (domainStatus, status) => {
      mockIssueOrRecoverAccountClaim.mockResolvedValueOnce(issued(domainStatus));
      const response = await POST(request());
      const body = await responseBody(response);
      expect(response.status).toBe(200);
      const { rawToken, ...publicFields } = body;
      expect(rawToken === firstRawToken).toBe(true);
      expect(publicFields).toEqual({ ok: true, status, expiresAt: firstExpiresAt.toISOString(), profile: profile() });
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledWith(input(), { keyring });
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
      expectNoCache(response);
      expectSafeBody(body, true);
    });

    it("lost response: same key recovers exactly the same token and original expiry", async () => {
      mockIssueOrRecoverAccountClaim.mockResolvedValueOnce(issued("CREATED")).mockResolvedValueOnce(issued("RECOVERED"));
      const first = await POST(request()); // caller loses this HTTP response
      const second = await POST(request());
      const a = await responseBody(first);
      const b = await responseBody(second);
      expect([first.status, second.status]).toEqual([200, 200]);
      expect([a.status, b.status]).toEqual(["CLAIM_ISSUED", "CLAIM_RECOVERED"]);
      expect(a.rawToken === firstRawToken && b.rawToken === a.rawToken).toBe(true);
      expect([a.expiresAt, b.expiresAt]).toEqual([firstExpiresAt.toISOString(), firstExpiresAt.toISOString()]);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(2);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenNthCalledWith(1, input(), { keyring });
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenNthCalledWith(2, input(), { keyring });
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("passes actual consulted identities and the opaque key without knowing PendingBusiness", async () => {
      mockUsuarioFindUnique.mockResolvedValue({ id: "actual-user", isPlaceholder: true, perfilCompleto: false });
      mockNegocioFindUnique.mockResolvedValue({ id: "actual-business", slug: "actual-slug" });
      const response = await POST(makeRequest({ body: { provisioningRef, idempotencyKey: "external-operation:42" } }));
      expect(response.status).toBe(200);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledWith({
        userId: "actual-user", businessId: "actual-business", idempotencyKey: "external-operation:42",
      }, { keyring });
      expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
        where: { placeholderProvisioningKeyHash: expectedProvisioningHash() },
        select: { id: true, isPlaceholder: true, perfilCompleto: true },
      });
      expect(mockNegocioFindUnique).toHaveBeenCalledWith({ where: { usuarioId: "actual-user" }, select: { id: true, slug: true } });
      expect((await responseBody(response)).profile).toEqual({ userId: "actual-user", businessId: "actual-business", slug: "actual-slug" });
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("awaits the idempotent issuer before returning a successful response", async () => {
      let release!: (value: AccountClaimIssueOrRecoverResult) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => { entered = resolve; });
      mockIssueOrRecoverAccountClaim.mockImplementationOnce(() => {
        entered();
        return new Promise((resolve) => { release = resolve; });
      });
      const pending = POST(request());
      try {
        // If the old route rejects the input, fail immediately rather than hang.
        const firstEvent = await Promise.race([started.then(() => "issuer"), pending.then(() => "http")]);
        expect(firstEvent).toBe("issuer");
        expect(mockNextResponseJson).not.toHaveBeenCalled();
      } finally { release?.(issued("CREATED")); }
      expect((await pending).status).toBe(200);
    });

    const outcomes = [
      ["ACCOUNT_ACTIVE", 409, "ACCOUNT_ALREADY_ACTIVE"],
      ["NOT_CLAIMABLE", 409, "USER_NOT_CLAIMABLE"],
      ["CONFLICT", 409, "CLAIM_CONFLICT"],
      ["ALREADY_CONSUMED", 409, "ALREADY_CONSUMED"],
      ["EXPIRED", 410, "CLAIM_EXPIRED"],
      ["REVOKED", 410, "CLAIM_REVOKED"],
      ["ACTIVE_CLAIM_EXISTS", 409, "ACTIVE_CLAIM_EXISTS"],
      ["RECOVERY_UNAVAILABLE", 409, "RECOVERY_UNAVAILABLE"],
    ] as const satisfies ReadonlyArray<readonly [Exclude<AccountClaimIssueOrRecoverResult["status"], "CREATED" | "RECOVERED">, number, string]>;

    it.each(outcomes)("domain %s maps to %s/%s without token or fallback issuance", async (domainStatus, http, status) => {
      mockIssueOrRecoverAccountClaim.mockResolvedValueOnce({ status: domainStatus });
      const response = await POST(request());
      const body = await responseBody(response);
      expect(response.status).toBe(http);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status,
        ...(domainStatus === "ACCOUNT_ACTIVE" ? { profile: profile() } : {}),
      });
      expectSafeBody(body);
      expectNoCache(response);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledWith(input(), { keyring });
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("missing old derivation key delegates RECOVERY_UNAVAILABLE without using the current key as fallback", async () => {
      process.env.ACCOUNT_CLAIM_KEYRING = JSON.stringify({ activeKeyId: "test-v2", keys: { "test-v2": keyring.keys["test-v2"].toString("base64") } });
      mockIssueOrRecoverAccountClaim.mockResolvedValueOnce({ status: "RECOVERY_UNAVAILABLE" });
      const response = await POST(request());
      expect(response.status).toBe(409);
      expect((await responseBody(response)).status).toBe("RECOVERY_UNAVAILABLE");
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledWith(input(), {
        keyring: { activeKeyId: "test-v2", keys: { "test-v2": keyring.keys["test-v2"] } },
      });
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it.each([
      ["missing-user", 404, "USER_NOT_FOUND"],
      ["missing-business", 404, "BUSINESS_NOT_FOUND"],
      ["active", 409, "ACCOUNT_ALREADY_ACTIVE"],
      ["not-claimable", 409, "USER_NOT_CLAIMABLE"],
      ["active-without-business", 404, "BUSINESS_NOT_FOUND"],
    ] as const)("precheck %s returns %s/%s without issuing or recovering", async (scenario, http, status) => {
      if (scenario === "missing-user") mockUsuarioFindUnique.mockResolvedValue(null);
      if (scenario === "missing-business" || scenario === "active-without-business") mockNegocioFindUnique.mockResolvedValue(null);
      if (scenario === "active" || scenario === "active-without-business") mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: true });
      if (scenario === "not-claimable") mockUsuarioFindUnique.mockResolvedValue({ id: usuarioId, isPlaceholder: false, perfilCompleto: false });
      const response = await POST(request());
      const body = await responseBody(response);
      expect(response.status).toBe(http);
      expect(body).toEqual({ ok: false, code: "CLAIM_UNAVAILABLE", status, ...(scenario === "active" ? { profile: profile() } : {}) });
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
      if (scenario === "missing-user") expect(mockNegocioFindUnique).not.toHaveBeenCalled();
      expectSafeBody(body);
    });

    it.each([null, 42, false, "", "   ", " key", "key ", [], {}])("invalid explicit idempotencyKey %j never silently uses legacy issuance", async (invalidKey) => {
      const response = await POST(makeRequest({ body: { provisioningRef, idempotencyKey: invalidKey } }));
      const body = await responseBody(response);
      expect(response.status).toBe(400);
      expect(body).toEqual({ ok: false, code: "INVALID_REQUEST", status: "INVALID_REQUEST" });
      expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
      expectSafeBody(body);
    });

    it.each(["userId", "businessId", "derivationKeyId", "keyring", "secret"])("client cannot override %s", async (field) => {
      const response = await POST(makeRequest({ body: { provisioningRef, idempotencyKey, [field]: "client-controlled" } }));
      expect(response.status).toBe(400);
      expect((await responseBody(response)).status).toBe("INVALID_REQUEST");
      expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("API authentication remains required before any idempotent processing", async () => {
      const response = await POST(makeRequest({ apiKey: null, body: { provisioningRef, idempotencyKey } }));
      expect(response.status).toBe(401);
      expect((await responseBody(response)).status).toBe("UNAUTHORIZED");
      expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", undefined], ["malformed JSON", "{"], ["null", "null"],
      ["missing activeKeyId", JSON.stringify({ keys: {} })],
      ["missing keys", JSON.stringify({ activeKeyId: "test-v2" })],
      ["short secret", JSON.stringify({ activeKeyId: "test-v2", keys: { "test-v2": Buffer.alloc(8, 34).toString("base64") } })],
      ["invalid base64", JSON.stringify({ activeKeyId: "test-v2", keys: { "test-v2": "!".repeat(44) } })],
    ] as const)("invalid server keyring (%s) fails closed without legacy/provisioning-secret fallback", async (_name, config) => {
      if (config === undefined) delete process.env.ACCOUNT_CLAIM_KEYRING;
      else process.env.ACCOUNT_CLAIM_KEYRING = config;
      const response = await POST(request());
      const body = await responseBody(response);
      expect(response.status).toBe(500);
      expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR", status: "INTERNAL_ERROR" });
      expectSafeBody(body);
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it.each(["user", "business", "domain", "unreconciled-P2002"] as const)("unexpected %s failure stays INTERNAL_ERROR, not a domain outcome", async (stage) => {
      const error = Object.assign(new Error(`private failure ${firstRawToken}`), stage === "unreconciled-P2002" ? { code: "P2002" } : {});
      const failing = stage === "user" ? mockUsuarioFindUnique : stage === "business" ? mockNegocioFindUnique : mockIssueOrRecoverAccountClaim;
      failing.mockRejectedValueOnce(error);
      const response = await POST(request());
      const body = await responseBody(response);
      expect(response.status).toBe(500);
      expect(body).toEqual({ ok: false, code: "INTERNAL_ERROR", status: "INTERNAL_ERROR" });
      expectSafeBody(body);
      expect(JSON.stringify(body).includes("private failure")).toBe(false);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(stage === "user" || stage === "business" ? 0 : 1);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("concurrent HTTP requests delegate once each; domain owns convergence without endpoint retry logic", async () => {
      mockIssueOrRecoverAccountClaim.mockResolvedValueOnce(issued("CREATED")).mockResolvedValueOnce(issued("RECOVERED"));
      const responses = await Promise.all([POST(request()), POST(request())]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
      const bodies = await Promise.all(responses.map(responseBody));
      expect(bodies.map((body) => body.status).sort()).toEqual(["CLAIM_ISSUED", "CLAIM_RECOVERED"]);
      expect(bodies.every((body) => body.rawToken === firstRawToken)).toBe(true);
      expect(mockIssueOrRecoverAccountClaim).toHaveBeenCalledTimes(2);
      for (const call of mockIssueOrRecoverAccountClaim.mock.calls) expect(call).toEqual([input(), { keyring }]);
      expect(mockIssueAccountClaim).not.toHaveBeenCalled();
    });

    it("legacy caller without idempotencyKey remains supported without the new keyring configuration", async () => {
      delete process.env.ACCOUNT_CLAIM_KEYRING;
      const response = await POST(makeRequest());
      const body = await responseBody(response);
      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.rawToken === firstRawToken).toBe(true);
      expect(body.expiresAt).toBe(firstExpiresAt.toISOString());
      expect(mockIssueAccountClaim).toHaveBeenCalledTimes(1);
      expect(mockIssueAccountClaim).toHaveBeenCalledWith(usuarioId);
      expect(mockIssueOrRecoverAccountClaim).not.toHaveBeenCalled();
      // Legacy is not advertised as idempotent; existing tests retain reissuance.
    });

    it("idempotent success and error do not log bearer or derivation material", async () => {
      const spies = [jest.spyOn(console, "log"), jest.spyOn(console, "warn"), jest.spyOn(console, "error")];
      spies.forEach((spy) => spy.mockImplementation(() => undefined));
      try {
        expect((await POST(request())).status).toBe(200);
        mockIssueOrRecoverAccountClaim.mockRejectedValueOnce(new Error(`private ${firstRawToken}`));
        const response = await POST(request());
        expect(response.status).toBe(500);
        expectSafeBody(await responseBody(response));
        spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
      } finally { spies.forEach((spy) => spy.mockRestore()); }
    });
  });

});
