import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Prisma, ReservationStatus } from "@prisma/client";

const mockHeaders = jest.fn();
const mockCookies = jest.fn();
const mockHeaderGet = jest.fn();
const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();
const mockTransaction = jest.fn();
const mockCapabilityFindUnique = jest.fn();
const mockCapabilityUpdateMany = jest.fn();
const mockReservationUpdateMany = jest.fn();
const mockVerifyManagementSession = jest.fn();
const mockGetCookieName = jest.fn();
const mockGetCookieClearOptions = jest.fn();
const mockIsCapabilityActive = jest.fn();
const mockRevokeCapabilities = jest.fn();
const mockNotify = jest.fn();
const TEST_SITE_ORIGIN = "https://reservas.staging.test";

const transactionClient = {
  reservationCapability: {
    findUnique: mockCapabilityFindUnique,
    updateMany: mockCapabilityUpdateMany,
  },
  reservation: {
    updateMany: mockReservationUpdateMany,
  },
};

jest.mock(
  "next/headers",
  () => ({
    headers: mockHeaders,
    cookies: mockCookies,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      $transaction: mockTransaction,
    },
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-management-session",
  () => ({
    getReservationManagementCookieName: mockGetCookieName,
    getReservationManagementCookieClearOptions: mockGetCookieClearOptions,
    verifyReservationManagementSession: mockVerifyManagementSession,
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-capability",
  () => ({
    isReservationCapabilityActive: mockIsCapabilityActive,
    revokeActiveReservationCapabilitiesInTx: mockRevokeCapabilities,
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/helpers/notifyReserva",
  () => ({ notifyReservaConfirmadaCliente: mockNotify }),
  { virtual: true },
);
jest.mock(
  "@/reservas/interfaces/interfaces.whatsapp",
  () => ({
    PlantillaWhatsApp: {
      RESERVA_CANCELADA_NEGOCIO: "reserva_cancelada_negocio",
    },
  }),
  { virtual: true },
);

import { cancelManagedReservation } from "./cancelManagedReservation";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";

const fixedNow = new Date("2026-08-19T12:00:00.000Z");
const capabilityExpiresAt = new Date("2026-08-19T13:00:00.000Z");
const capabilityId = "capability-management-1";
const reservationId = "reservation-management-1";
const businessId = "business-management-1";
const cookieName = "myckeo-reservation-management";
const cookieValue = `v1.${"P".repeat(64)}.${"S".repeat(43)}`;
const startsAt = new Date("2026-08-20T14:00:00.000Z");
const usedAt = new Date("2026-08-19T11:30:00.000Z");
const revokedAt = new Date("2026-08-19T11:45:00.000Z");
const clearOptions = {
  httpOnly: true as const,
  secure: false,
  sameSite: "lax" as const,
  path: "/reservas/gestionar",
  expires: new Date(0),
  maxAge: 0 as const,
};

let events: string[];
let transactionActive: boolean;

function capabilityRow(
  overrides: {
    expiresAt?: Date;
    usedAt?: Date | null;
    revokedAt?: Date | null;
    estado?: ReservationStatus;
    telefonoContacto?: string | null;
  } = {},
) {
  return {
    id: capabilityId,
    expiresAt: overrides.expiresAt ?? capabilityExpiresAt,
    usedAt: overrides.usedAt ?? null,
    revokedAt: overrides.revokedAt ?? null,
    reservation: {
      id: reservationId,
      estado: overrides.estado ?? ReservationStatus.PENDIENTE,
      nombre: "Cliente Gestionado",
      telefono: "+573001112233",
      fechaHoraInicio: startsAt,
      negocio: {
        id: businessId,
        telefonoContacto:
          overrides.telefonoContacto === undefined
            ? "+573004445566"
            : overrides.telefonoContacto,
      },
    },
  };
}

function knownPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma request failed", {
    code,
    clientVersion: "6.18.0",
  });
}

function successfulTransactionImplementation() {
  return async (
    callback: (tx: typeof transactionClient) => Promise<unknown>,
  ) => {
    transactionActive = true;
    events.push("transaction:start");
    try {
      return await callback(transactionClient);
    } finally {
      transactionActive = false;
      events.push("transaction:end");
    }
  };
}

function expectNoWritesOrNotification(): void {
  expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
  expect(mockReservationUpdateMany).not.toHaveBeenCalled();
  expect(mockRevokeCapabilities).not.toHaveBeenCalled();
  expect(mockNotify).not.toHaveBeenCalled();
}

function expectCookieCleared(): void {
  expect(mockGetCookieClearOptions).toHaveBeenCalledTimes(1);
  expect(mockCookieSet).toHaveBeenCalledWith(cookieName, "", clearOptions);
}

async function expectSiteConfigurationFailure(): Promise<void> {
  const result = await cancelManagedReservation();

  expect(result).toEqual({
    ok: false,
    code: "INTERNAL_ERROR",
    message: "No pudimos procesar la cancelación. Inténtalo nuevamente.",
  });
  expect(mockHeaders).not.toHaveBeenCalled();
  expect(mockHeaderGet).not.toHaveBeenCalled();
  expect(mockCookies).not.toHaveBeenCalled();
  expect(mockCookieGet).not.toHaveBeenCalled();
  expect(mockGetCookieName).not.toHaveBeenCalled();
  expect(mockVerifyManagementSession).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
  expectNoWritesOrNotification();
}

describe("cancelManagedReservation", () => {
  const originalSiteUrl = process.env.SITE_URL;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();

    events = [];
    transactionActive = false;
    process.env.SITE_URL = TEST_SITE_ORIGIN;

    mockHeaderGet.mockImplementation((name: string) =>
      name.toLowerCase() === "origin" ? TEST_SITE_ORIGIN : null,
    );
    mockHeaders.mockResolvedValue({ get: mockHeaderGet });
    mockCookieGet.mockReturnValue({ value: cookieValue });
    mockCookies.mockResolvedValue({
      get: mockCookieGet,
      set: mockCookieSet,
    });
    mockGetCookieName.mockReturnValue(cookieName);
    mockGetCookieClearOptions.mockReturnValue(clearOptions);
    mockVerifyManagementSession.mockReturnValue({
      capabilityId,
      expiresAt: new Date("2026-08-19T12:30:00.000Z"),
    });
    mockIsCapabilityActive.mockReturnValue(true);
    mockCapabilityFindUnique.mockImplementation(async () => {
      events.push("capability:find");
      expect(transactionActive).toBe(true);
      return capabilityRow();
    });
    mockCapabilityUpdateMany.mockImplementation(async () => {
      events.push("capability:claim");
      expect(transactionActive).toBe(true);
      return { count: 1 };
    });
    mockReservationUpdateMany.mockImplementation(async () => {
      events.push("reservation:cancel");
      expect(transactionActive).toBe(true);
      return { count: 1 };
    });
    mockRevokeCapabilities.mockImplementation(async () => {
      events.push("capabilities:revoke");
      expect(transactionActive).toBe(true);
      return { revokedCount: 1, revokedAt: fixedNow };
    });
    mockNotify.mockImplementation(async () => {
      events.push("notification");
      expect(transactionActive).toBe(false);
      return { ok: true };
    });
    mockTransaction.mockImplementation(successfulTransactionImplementation());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
  });

  it("expone una Server Action sin parámetros ni autoridad enviada por browser", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/cancelManagedReservation.ts"),
      "utf8",
    );

    expect(source.startsWith('"use server";')).toBe(true);
    expect(source).toMatch(
      /export async function cancelManagedReservation\(\): Promise<CancelManagedReservationResult>/,
    );
    expect(cancelManagedReservation.length).toBe(0);
    expect(source).not.toMatch(
      /\b(FormData|reservationId|negocioId|usuarioId|tokenHash)\b.*\): Promise<CancelManagedReservationResult>/,
    );
  });

  it("rechaza Origin ausente antes de cookie, DB y notification", async () => {
    mockHeaderGet.mockReturnValue(null);

    await expect(cancelManagedReservation()).resolves.toEqual({
      ok: false,
      code: "RESERVATION_ACCESS_DENIED",
      message: "No se puede acceder a la gestión de esta reserva.",
    });

    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it.each([
    "https://evil.example",
    "https://reservas.staging.test.evil.example",
    "https://reservas.staging.test/",
  ])("rechaza Origin no idéntico sin limpiar cookie: %s", async (origin) => {
    mockHeaderGet.mockReturnValue(origin);

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it.each([
    ["ausente", undefined],
    ["vacía", ""],
    ["con whitespace exterior", ` ${TEST_SITE_ORIGIN} `],
    ["con path", `${TEST_SITE_ORIGIN}/foo`],
    ["con query", `${TEST_SITE_ORIGIN}?x=1`],
    ["con hash", `${TEST_SITE_ORIGIN}/#x`],
    ["con userinfo", "https://user:pass@reservas.staging.test"],
    ["con protocolo no HTTP", "ftp://reservas.staging.test"],
    ["no parseable", "not-a-valid-url"],
  ])(
    "falla cerrado con SITE_URL %s antes de Origin, cookie, HMAC y DB",
    async (_caseName, siteUrl) => {
      if (siteUrl === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = siteUrl;
      }

      await expectSiteConfigurationFailure();
    },
  );

  it.each([
    [TEST_SITE_ORIGIN, TEST_SITE_ORIGIN],
    [`${TEST_SITE_ORIGIN}/`, TEST_SITE_ORIGIN],
    ["https://myckeo.com", "https://myckeo.com"],
  ])(
    "acepta SITE_URL explícita %s con Origin canónico exacto",
    async (siteUrl, requestOrigin) => {
      process.env.SITE_URL = siteUrl;
      mockHeaderGet.mockImplementation((name: string) =>
        name.toLowerCase() === "origin" ? requestOrigin : null,
      );

      await expect(cancelManagedReservation()).resolves.toEqual({
        ok: true,
        code: "RESERVATION_CANCELLED",
        message: "Tu reserva fue cancelada correctamente.",
      });
    },
  );

  it("permite loopback explícito fuera de producción", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    process.env.SITE_URL = "http://localhost:3000";
    mockHeaderGet.mockImplementation((name: string) =>
      name.toLowerCase() === "origin" ? "http://localhost:3000" : null,
    );

    await expect(cancelManagedReservation()).resolves.toEqual(
      expect.objectContaining({ ok: true, code: "RESERVATION_CANCELLED" }),
    );
  });

  it("rechaza loopback en producción antes de Origin, cookie, HMAC y DB", async () => {
    const replacedNodeEnv = jest.replaceProperty(
      process.env,
      "NODE_ENV",
      "production",
    );
    process.env.SITE_URL = "http://127.0.0.1:3000";

    try {
      await expectSiteConfigurationFailure();
    } finally {
      replacedNodeEnv.restore();
    }
  });

  it("sin cookie niega acceso sin DB ni limpieza", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expect(mockCookieGet).toHaveBeenCalledWith(cookieName);
    expect(mockVerifyManagementSession).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("cookie inválida se limpia y falla antes de DB", async () => {
    mockVerifyManagementSession.mockReturnValue(null);

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expect(mockVerifyManagementSession).toHaveBeenCalledWith(
      cookieValue,
      fixedNow,
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expectCookieCleared();
  });

  it("error de secret devuelve INTERNAL_ERROR y conserva cookie", async () => {
    mockVerifyManagementSession.mockImplementation(() => {
      throw new Error("internal secret error");
    });

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "cancela %s con claim, update, revocación y notification post-commit",
    async (estado) => {
      mockCapabilityFindUnique.mockResolvedValue(capabilityRow({ estado }));

      const result = await cancelManagedReservation();

      expect(result).toEqual({
        ok: true,
        code: "RESERVATION_CANCELLED",
        message: "Tu reserva fue cancelada correctamente.",
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(mockCapabilityFindUnique).toHaveBeenCalledWith({
        where: {
          id: capabilityId,
        },
        select: {
          id: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          reservation: {
            select: {
              id: true,
              estado: true,
              nombre: true,
              telefono: true,
              fechaHoraInicio: true,
              negocio: {
                select: {
                  id: true,
                  telefonoContacto: true,
                },
              },
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
        fixedNow,
      );
      expect(mockCapabilityUpdateMany).toHaveBeenCalledWith({
        where: {
          id: capabilityId,
          usedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: fixedNow,
          },
        },
        data: {
          usedAt: fixedNow,
        },
      });
      expect(mockReservationUpdateMany).toHaveBeenCalledWith({
        where: {
          id: reservationId,
          estado: {
            in: [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
          },
        },
        data: {
          estado: ReservationStatus.CANCELADA,
        },
      });
      expect(mockRevokeCapabilities).toHaveBeenCalledWith(
        transactionClient,
        reservationId,
      );
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith({
        to: "+573004445566",
        nombre_cliente: "Cliente Gestionado",
        telefono_cliente: "+573001112233",
        fechaHora: expect.any(String),
        template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
        negocioId: businessId,
      });
      expect(events.indexOf("capability:claim")).toBeLessThan(
        events.indexOf("reservation:cancel"),
      );
      expect(events.indexOf("reservation:cancel")).toBeLessThan(
        events.indexOf("capabilities:revoke"),
      );
      expect(events.indexOf("transaction:end")).toBeLessThan(
        events.indexOf("notification"),
      );
      expectCookieCleared();
    },
  );

  it("usedAt + CANCELADA responde idempotentemente sin writes ni notification", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ usedAt, estado: ReservationStatus.CANCELADA }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual({
      ok: true,
      code: "RESERVATION_ALREADY_CANCELLED",
      message: "Esta reserva ya fue cancelada.",
    });
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("usedAt con estado no cancelado niega sin writes", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ usedAt, estado: ReservationStatus.PENDIENTE }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("revoked niega incluso si Reservation está CANCELADA", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({
        usedAt,
        revokedAt,
        estado: ReservationStatus.CANCELADA,
      }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("expired niega mediante lifecycle canónico", async () => {
    const expiredAt = new Date("2026-08-19T11:59:59.000Z");
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ expiresAt: expiredAt }),
    );
    mockIsCapabilityActive.mockReturnValue(false);

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expect(mockIsCapabilityActive).toHaveBeenCalledWith(
      {
        expiresAt: expiredAt,
        usedAt: null,
        revokedAt: null,
      },
      fixedNow,
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("CANCELADA con capability activa falla cerrada sin consumirla", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ estado: ReservationStatus.CANCELADA }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("COMPLETADA revoca capabilities residuales y no cancela ni notifica", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ estado: ReservationStatus.COMPLETADA }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual({
      ok: false,
      code: "RESERVATION_NOT_AVAILABLE",
      message: "Esta reserva ya no se puede cancelar.",
    });
    expect(mockCapabilityUpdateMany).not.toHaveBeenCalled();
    expect(mockReservationUpdateMany).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).toHaveBeenCalledWith(
      transactionClient,
      reservationId,
    );
    expect(mockNotify).not.toHaveBeenCalled();
    expectCookieCleared();
  });

  it("BLOQUEADA nunca es gestionable por cliente", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ estado: ReservationStatus.BLOQUEADA }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("capability inexistente niega de forma genérica", async () => {
    mockCapabilityFindUnique.mockResolvedValue(null);

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_ACCESS_DENIED",
      }),
    );
    expectNoWritesOrNotification();
    expectCookieCleared();
  });

  it("claim count=0 aborta antes de actualizar Reservation y conserva cookie", async () => {
    mockCapabilityUpdateMany.mockResolvedValue({ count: 0 });

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockReservationUpdateMany).not.toHaveBeenCalled();
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("Reservation update count=0 aborta la transacción y no notifica", async () => {
    mockReservationUpdateMany.mockResolvedValue({ count: 0 });

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockCapabilityUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRevokeCapabilities).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("reintenta P2034 y permite éxito en el segundo intento", async () => {
    mockTransaction.mockRejectedValueOnce(knownPrismaError("P2034"));

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: true, code: "RESERVATION_CANCELLED" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expectCookieCleared();
  });

  it("tres P2034 terminan en INTERNAL_ERROR sin limpiar cookie", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2034"));

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("otro error Prisma no se reintenta y conserva cookie", async () => {
    mockTransaction.mockRejectedValue(knownPrismaError("P2025"));

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "INTERNAL_ERROR" }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("doble POST produce cancelled + already-cancelled y una notification total", async () => {
    const active = capabilityRow();
    const consumed = capabilityRow({
      usedAt,
      estado: ReservationStatus.CANCELADA,
    });
    mockCapabilityFindUnique
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce(consumed);

    const first = await cancelManagedReservation();
    const second = await cancelManagedReservation();

    expect(first).toEqual(
      expect.objectContaining({ ok: true, code: "RESERVATION_CANCELLED" }),
    );
    expect(second).toEqual(
      expect.objectContaining({
        ok: true,
        code: "RESERVATION_ALREADY_CANCELLED",
      }),
    );
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockCapabilityUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("fallo del notifier no revierte cancelación ni cambia éxito", async () => {
    mockNotify.mockRejectedValue(new Error("provider unavailable"));

    const result = await cancelManagedReservation();

    expect(result).toEqual({
      ok: true,
      code: "RESERVATION_CANCELLED",
      message: "Tu reserva fue cancelada correctamente.",
    });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expectCookieCleared();
  });

  it("resultado fallido del notifier no revierte cancelación ni cambia éxito", async () => {
    mockNotify.mockResolvedValue({ ok: false, errorMessage: "remote failure" });

    const result = await cancelManagedReservation();

    expect(result).toEqual({
      ok: true,
      code: "RESERVATION_CANCELLED",
      message: "Tu reserva fue cancelada correctamente.",
    });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expectCookieCleared();
  });

  it("sin teléfono autoritativo del negocio conserva cancelación sin notificar", async () => {
    mockCapabilityFindUnique.mockResolvedValue(
      capabilityRow({ telefonoContacto: null }),
    );

    const result = await cancelManagedReservation();

    expect(result).toEqual(
      expect.objectContaining({ ok: true, code: "RESERVATION_CANCELLED" }),
    );
    expect(mockNotify).not.toHaveBeenCalled();
    expectCookieCleared();
  });

  it("no contiene auth, PUBLISHED, hard-delete, links legacy, tokens ni logs", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/actions/cancelManagedReservation.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/from ["']@\/auth\.config["']/);
    expect(source).not.toMatch(/buildPublishedBusinessWhere|DIRECT/);
    expect(source).not.toMatch(/reservation\.(?:delete|deleteMany)\s*\(/);
    expect(source).not.toMatch(/\/reservas\/(?:eliminar|gestionar)\//);
    expect(source).not.toMatch(
      /tokenHash|rawToken|createReservationManagementSession/,
    );
    expect(source).not.toMatch(/console\.(?:log|warn|error|debug)/);
  });

  it("no filtra errores internos en el contrato externo", async () => {
    mockTransaction.mockRejectedValue(
      new Error("sensitive database internal detail"),
    );

    const result = await cancelManagedReservation();
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "No pudimos procesar la cancelación. Inténtalo nuevamente.",
    });
    expect(serialized).not.toContain("database");
    expect(serialized).not.toContain(capabilityId);
    expect(serialized).not.toContain(reservationId);
    expect(serialized).not.toContain(cookieValue);
  });
});
