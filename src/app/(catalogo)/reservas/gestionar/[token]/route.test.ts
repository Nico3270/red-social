import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockCapabilityFindUnique = jest.fn();
const mockCapabilityUpdate = jest.fn();
const mockCapabilityUpdateMany = jest.fn();
const mockCapabilityCreate = jest.fn();
const mockCapabilityDelete = jest.fn();
const mockReservationUpdate = jest.fn();
const mockReservationDelete = jest.fn();
const mockGetTokenHash = jest.fn();
const mockIsCapabilityActive = jest.fn();
const mockCreateManagementSession = jest.fn();
const mockGetCookieName = jest.fn();
const mockGetCookieOptions = jest.fn();
const mockGetCookieClearOptions = jest.fn();

jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      reservationCapability: {
        findUnique: mockCapabilityFindUnique,
        update: mockCapabilityUpdate,
        updateMany: mockCapabilityUpdateMany,
        create: mockCapabilityCreate,
        delete: mockCapabilityDelete,
      },
      reservation: {
        update: mockReservationUpdate,
        delete: mockReservationDelete,
      },
    },
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-capability",
  () => ({
    getReservationCapabilityTokenHash: mockGetTokenHash,
    isReservationCapabilityActive: mockIsCapabilityActive,
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-management-session",
  () => ({
    createReservationManagementSession: mockCreateManagementSession,
    getReservationManagementCookieName: mockGetCookieName,
    getReservationManagementCookieOptions: mockGetCookieOptions,
    getReservationManagementCookieClearOptions: mockGetCookieClearOptions,
  }),
  { virtual: true },
);

import { ReservationStatus } from "@prisma/client";
import { GET, HEAD } from "./route";

const fixedNow = new Date("2026-08-19T12:00:00.000Z");
const capabilityExpiresAt = new Date("2026-08-19T14:00:00.000Z");
const sessionExpiresAt = new Date("2026-08-19T12:30:00.000Z");
const rawToken = "S".repeat(43);
const tokenHash = "a".repeat(64);
const capabilityId = "capability-internal-1";
const cookieName = "myckeo-reservation-management";
const managementSessionValue = `v1.${"P".repeat(64)}.${"M".repeat(43)}`;
const createCookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/reservas/gestionar",
  expires: sessionExpiresAt,
};
const clearCookieOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/reservas/gestionar",
  expires: new Date(0),
  maxAge: 0,
};

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function request(token = rawToken): Request {
  return new Request(`http://localhost/reservas/gestionar/${token}`);
}

function context(token = rawToken): RouteContext {
  return {
    params: Promise.resolve({ token }),
  };
}

function activeCapability(
  estado: ReservationStatus = ReservationStatus.PENDIENTE,
) {
  return {
    id: capabilityId,
    expiresAt: capabilityExpiresAt,
    usedAt: null,
    revokedAt: null,
    reservation: {
      estado,
    },
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

async function expectCleanRedirect(response: Response): Promise<void> {
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "http://localhost/reservas/gestionar",
  );
  expectSecurityHeaders(response);
  await expect(response.clone().text()).resolves.toBe("");
}

function expectClearCookie(response: Response): void {
  const setCookie = response.headers.get("set-cookie");

  expect(mockGetCookieName).toHaveBeenCalled();
  expect(mockGetCookieClearOptions).toHaveBeenCalled();
  expect(setCookie).toContain(`${cookieName}=`);
  expect(setCookie).toContain("Path=/reservas/gestionar");
  expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  expect(setCookie).toContain("Max-Age=0");
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=lax");
}

describe("GET/HEAD /reservas/gestionar/[token]", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();

    mockGetTokenHash.mockReturnValue(tokenHash);
    mockIsCapabilityActive.mockReturnValue(true);
    mockCapabilityFindUnique.mockResolvedValue(activeCapability());
    mockCreateManagementSession.mockReturnValue({
      value: managementSessionValue,
      expiresAt: sessionExpiresAt,
    });
    mockGetCookieName.mockReturnValue(cookieName);
    mockGetCookieOptions.mockReturnValue(createCookieOptions);
    mockGetCookieClearOptions.mockReturnValue(clearCookieOptions);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("HEAD siempre redirige sin resolver params, DB, lifecycle, secret ni cookies", async () => {
    const response = await HEAD(request("head-preview-token"));

    await expectCleanRedirect(response);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mockGetTokenHash).not.toHaveBeenCalled();
    expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
    expect(mockIsCapabilityActive).not.toHaveBeenCalled();
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expect(mockGetCookieName).not.toHaveBeenCalled();
    expect(mockGetCookieOptions).not.toHaveBeenCalled();
    expect(mockGetCookieClearOptions).not.toHaveBeenCalled();
  });

  it("rechaza token malformed antes de Prisma y limpia contexto previo", async () => {
    const malformedToken = "A".repeat(42);
    mockGetTokenHash.mockReturnValue(null);

    const response = await GET(
      request(malformedToken),
      context(malformedToken),
    );

    await expectCleanRedirect(response);
    expect(mockGetTokenHash).toHaveBeenCalledWith(malformedToken);
    expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
    expect(mockIsCapabilityActive).not.toHaveBeenCalled();
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expectClearCookie(response);
  });

  it.each([
    ReservationStatus.PENDIENTE,
    ReservationStatus.CONFIRMADA,
  ])("emite management cookie para Reservation %s activa", async (estado) => {
    mockCapabilityFindUnique.mockResolvedValue(activeCapability(estado));

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockGetTokenHash).toHaveBeenCalledWith(rawToken);
    expect(mockCapabilityFindUnique).toHaveBeenCalledTimes(1);
    expect(mockCapabilityFindUnique).toHaveBeenCalledWith({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        reservation: {
          select: {
            estado: true,
          },
        },
      },
    });
    expect(mockIsCapabilityActive).toHaveBeenCalledWith(
      {
        expiresAt: capabilityExpiresAt,
        usedAt: null,
        revokedAt: null,
      },
      expect.any(Date),
    );
    const lifecycleNow = mockIsCapabilityActive.mock.calls[0][1];
    expect(lifecycleNow).toEqual(fixedNow);
    expect(mockCreateManagementSession).toHaveBeenCalledWith(
      {
        capabilityId,
        capabilityExpiresAt,
      },
      lifecycleNow,
    );
    expect(mockGetCookieName).toHaveBeenCalledTimes(1);
    expect(mockGetCookieOptions).toHaveBeenCalledWith(sessionExpiresAt);
    expect(mockGetCookieClearOptions).not.toHaveBeenCalled();

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain(`${cookieName}=${managementSessionValue}`);
    expect(setCookie).toContain("Path=/reservas/gestionar");
    expect(setCookie).toContain(
      "Expires=Wed, 19 Aug 2026 12:30:00 GMT",
    );
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).not.toContain("Secure");
  });

  it("integra la opción Secure entregada por el contrato canónico", async () => {
    mockGetCookieOptions.mockReturnValue({
      ...createCookieOptions,
      secure: true,
    });

    const response = await GET(request(), context());

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("limpia la cookie si el tokenHash no existe", async () => {
    mockCapabilityFindUnique.mockResolvedValue(null);

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockCapabilityFindUnique).toHaveBeenCalledTimes(1);
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expectClearCookie(response);
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-08-19T11:59:59.000Z") }],
    ["revoked", { revokedAt: new Date("2026-08-19T11:00:00.000Z") }],
    ["used", { usedAt: new Date("2026-08-19T11:00:00.000Z") }],
  ])("limpia cookie para capability %s", async (_label, changes) => {
    const capability = {
      ...activeCapability(),
      ...changes,
    };
    mockCapabilityFindUnique.mockResolvedValue(capability);
    mockIsCapabilityActive.mockReturnValue(false);

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockIsCapabilityActive).toHaveBeenCalledWith(
      {
        expiresAt: capability.expiresAt,
        usedAt: capability.usedAt,
        revokedAt: capability.revokedAt,
      },
      fixedNow,
    );
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expectClearCookie(response);
  });

  it.each([
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
    ReservationStatus.BLOQUEADA,
  ])("no emite authority para Reservation %s", async (estado) => {
    mockCapabilityFindUnique.mockResolvedValue(activeCapability(estado));

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockIsCapabilityActive).toHaveBeenCalledTimes(1);
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expectClearCookie(response);
  });

  it("oculta error de configuración del secret y limpia cookie", async () => {
    mockCreateManagementSession.mockImplementation(() => {
      throw new Error("internal configuration failure");
    });

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockCreateManagementSession).toHaveBeenCalledTimes(1);
    expectClearCookie(response);
    expect(await response.clone().text()).not.toContain("configuration");
  });

  it("oculta error Prisma y limpia cookie", async () => {
    mockCapabilityFindUnique.mockRejectedValue(
      new Error("synthetic prisma stack"),
    );

    const response = await GET(request(), context());

    await expectCleanRedirect(response);
    expect(mockCreateManagementSession).not.toHaveBeenCalled();
    expectClearCookie(response);
    expect(await response.clone().text()).not.toContain("prisma");
  });

  it("no expone token raw ni capabilityId en Location, body o headers", async () => {
    const response = await GET(request(), context());
    const externalResponse = [
      response.headers.get("location") ?? "",
      await response.clone().text(),
      ...Array.from(response.headers.entries()).flat(),
    ].join("\n");

    expect(externalResponse).not.toContain(rawToken);
    expect(externalResponse).not.toContain(capabilityId);
    expect(response.headers.get("set-cookie")).toContain(
      managementSessionValue,
    );
  });

  it("GET y HEAD realizan cero writes Prisma", async () => {
    await GET(request(), context());
    await HEAD(request());

    expect(mockCapabilityUpdate).not.toHaveBeenCalled();
    expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
    expect(mockCapabilityCreate).not.toHaveBeenCalled();
    expect(mockCapabilityDelete).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockReservationDelete).not.toHaveBeenCalled();
  });

  it("converge malformed, missing, inactive y terminal al mismo redirect", async () => {
    mockGetTokenHash.mockReturnValueOnce(null).mockReturnValue(tokenHash);
    mockCapabilityFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeCapability())
      .mockResolvedValueOnce(activeCapability(ReservationStatus.CANCELADA));
    mockIsCapabilityActive
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const malformed = await GET(request("A".repeat(42)), context("A".repeat(42)));
    const missing = await GET(request(), context());
    const inactive = await GET(request(), context());
    const terminal = await GET(request(), context());
    const responses = [malformed, missing, inactive, terminal];

    for (const response of responses) {
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        "http://localhost/reservas/gestionar",
      );
      expectClearCookie(response);
    }
  });

  it("es read-only, no usa auth/PUBLISHED/logs ni integra React o analytics", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/(catalogo)/reservas/gestionar/[token]/route.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(
      /\.update\s*\(|\.updateMany\s*\(|\.create\s*\(|\.delete\s*\(|\.deleteMany\s*\(/,
    );
    expect(source).not.toMatch(/\bauth\s*\(|auth\.config|\bcookies\s*\(/);
    expect(source).not.toMatch(
      /buildPublishedBusinessWhere|business-visibility-policy|PUBLISHED/,
    );
    expect(source).not.toMatch(/console\.|AnalyticsBootstrap|react|layout/);
    expect(source).not.toMatch(/tokenHash:\s*true|reservationId|usuarioId|negocioId|telefono|nombre|notas/);
    expect(source).not.toMatch(/createHash|createHmac|timingSafeEqual|randomBytes/);
    expect(source).not.toMatch(/httpOnly:\s*true|sameSite:|secure:|maxAge:/);
    expect(source).not.toContain("/reservas/gestionar/<");
  });
});
