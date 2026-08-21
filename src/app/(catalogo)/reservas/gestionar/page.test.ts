import { ReservationStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

const mockCookieGet = jest.fn();
const mockCookieSet = jest.fn();
const mockCookieDelete = jest.fn();
const mockCookies = jest.fn();
const mockCapabilityFindUnique = jest.fn();
const mockGetCookieName = jest.fn();
const mockVerifyManagementSession = jest.fn();
const mockIsCapabilityActive = jest.fn();
const mockManagedReservationCancelForm = jest.fn(
  () => "managed-reservation-cancel-form",
);

jest.mock(
  "next/headers",
  () => ({
    cookies: mockCookies,
  }),
  { virtual: true },
);
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      reservationCapability: {
        findUnique: mockCapabilityFindUnique,
      },
    },
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-management-session",
  () => ({
    getReservationManagementCookieName: mockGetCookieName,
    verifyReservationManagementSession: mockVerifyManagementSession,
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/lib/reservation-capability",
  () => ({
    isReservationCapabilityActive: mockIsCapabilityActive,
  }),
  { virtual: true },
);
jest.mock(
  "@/reservas/componentes/ManagedReservationCancelForm",
  () => ({
    __esModule: true,
    default: mockManagedReservationCancelForm,
  }),
  { virtual: true },
);

import ReservationManagementPage, {
  dynamic,
  metadata,
  revalidate,
} from "./page";

const fixedNow = new Date("2026-08-19T12:00:00.000Z");
const capabilityId = "capability-test-internal";
const cookieName = "myckeo-reservation-management";
const cookieValue = `v1.${"P".repeat(64)}.${"S".repeat(43)}`;
const capabilityExpiresAt = new Date("2026-08-19T13:00:00.000Z");
const startsAt = new Date("2026-08-19T12:00:00.000Z");
const endsAt = new Date("2026-08-19T13:30:00.000Z");

function capability(estado: ReservationStatus = ReservationStatus.PENDIENTE) {
  return {
    id: capabilityId,
    expiresAt: capabilityExpiresAt,
    usedAt: null,
    revokedAt: null,
    reservation: {
      estado,
      fechaHoraInicio: startsAt,
      fechaHoraFin: endsAt,
      negocio: {
        nombre: "Café Seguro",
      },
    },
  };
}

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await ReservationManagementPage());
}

function expectGenericUnavailable(html: string): void {
  expect(html).toContain("No se puede acceder a la gestión de esta reserva.");
  expect(html).not.toContain("Café Seguro");
  expect(html).not.toContain("Pendiente");
  expect(html).not.toContain("Confirmada");
  expect(html).not.toContain("managed-reservation-cancel-form");
  expect(mockManagedReservationCancelForm).not.toHaveBeenCalled();
}

describe("/reservas/gestionar clean management page", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();

    mockCookies.mockResolvedValue({
      get: mockCookieGet,
      set: mockCookieSet,
      delete: mockCookieDelete,
    });
    mockGetCookieName.mockReturnValue(cookieName);
    mockCookieGet.mockReturnValue({ value: cookieValue });
    mockVerifyManagementSession.mockReturnValue({
      capabilityId,
      expiresAt: new Date("2026-08-19T12:30:00.000Z"),
    });
    mockCapabilityFindUnique.mockResolvedValue(capability());
    mockIsCapabilityActive.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sin cookie muestra estado genérico sin DB", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const html = await renderPage();

    expectGenericUnavailable(html);
    expect(mockGetCookieName).toHaveBeenCalledTimes(1);
    expect(mockVerifyManagementSession).not.toHaveBeenCalled();
    expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
  });

  it("cookie malformed o expirada falla antes de DB", async () => {
    mockVerifyManagementSession.mockReturnValue(null);

    const html = await renderPage();

    expectGenericUnavailable(html);
    expect(mockVerifyManagementSession).toHaveBeenCalledWith(
      cookieValue,
      fixedNow,
    );
    expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
  });

  it("oculta error interno de secret y no consulta DB", async () => {
    mockVerifyManagementSession.mockImplementation(() => {
      throw new Error("secret configuration detail");
    });

    const html = await renderPage();

    expectGenericUnavailable(html);
    expect(html).not.toContain("secret");
    expect(mockCapabilityFindUnique).not.toHaveBeenCalled();
  });

  it("consulta capabilityId autenticado con select mínimo exacto", async () => {
    await renderPage();

    expect(mockCapabilityFindUnique).toHaveBeenCalledTimes(1);
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
            estado: true,
            fechaHoraInicio: true,
            fechaHoraFin: true,
            negocio: {
              select: {
                nombre: true,
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
  });

  it.each([
    [ReservationStatus.PENDIENTE, "Pendiente"],
    [ReservationStatus.CONFIRMADA, "Confirmada"],
  ])("muestra resumen y formulario una vez para %s", async (estado, label) => {
    mockCapabilityFindUnique.mockResolvedValue(capability(estado));

    const html = await renderPage();

    expect(html).toContain("Café Seguro");
    expect(html).toContain(label);
    expect(html).toContain("Puedes cancelar esta reserva desde aquí.");
    expect(html).toContain("managed-reservation-cancel-form");
    expect(html).not.toContain("No se puede acceder");
    expect(mockManagedReservationCancelForm).toHaveBeenCalledTimes(1);
  });

  it("capability inexistente muestra estado genérico", async () => {
    mockCapabilityFindUnique.mockResolvedValue(null);

    expectGenericUnavailable(await renderPage());
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-08-19T11:59:59.000Z") }],
    ["revoked", { revokedAt: new Date("2026-08-19T11:00:00.000Z") }],
    ["used", { usedAt: new Date("2026-08-19T11:00:00.000Z") }],
  ])("capability %s muestra estado genérico", async (_label, changes) => {
    const row = { ...capability(), ...changes };
    mockCapabilityFindUnique.mockResolvedValue(row);
    mockIsCapabilityActive.mockReturnValue(false);

    const html = await renderPage();

    expectGenericUnavailable(html);
    expect(mockIsCapabilityActive).toHaveBeenCalledWith(
      {
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        revokedAt: row.revokedAt,
      },
      fixedNow,
    );
  });

  it.each([
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
    ReservationStatus.BLOQUEADA,
  ])("Reservation %s no es gestionable", async (estado) => {
    mockCapabilityFindUnique.mockResolvedValue(capability(estado));

    expectGenericUnavailable(await renderPage());
  });

  it("falla cerrado ante error Prisma sin revelar detalle", async () => {
    mockCapabilityFindUnique.mockRejectedValue(
      new Error("synthetic prisma stack"),
    );

    const html = await renderPage();

    expectGenericUnavailable(html);
    expect(html).not.toContain("prisma");
  });

  it("renderiza fecha y horas explícitamente en America/Bogota", async () => {
    const html = await renderPage();

    expect(html).toContain("miércoles, 19 de agosto de 2026");
    expect(html).toContain("7:00 a. m.");
    expect(html).toContain("8:30 a. m.");
  });

  it("no renderiza PII, IDs ni token aunque el mock incluya campos extra", async () => {
    const rowWithForbiddenData = {
      ...capability(),
      tokenHash: "forbidden-token-hash",
      reservationId: "forbidden-reservation-id",
      reservation: {
        ...capability().reservation,
        id: "forbidden-reservation-id",
        nombre: "Cliente Privado",
        telefono: "+573001112233",
        notas: "Nota privada",
        usuarioId: "forbidden-user-id",
        negocioId: "forbidden-business-id",
      },
    };
    mockCapabilityFindUnique.mockResolvedValue(rowWithForbiddenData);

    const html = await renderPage();

    for (const forbiddenValue of [
      capabilityId,
      cookieValue,
      "forbidden-token-hash",
      "forbidden-reservation-id",
      "Cliente Privado",
      "+573001112233",
      "Nota privada",
      "forbidden-user-id",
      "forbidden-business-id",
    ]) {
      expect(html).not.toContain(forbiddenValue);
    }
  });

  it("sólo lee cookie y nunca ejecuta set/delete", async () => {
    await renderPage();

    expect(mockCookies).toHaveBeenCalledTimes(1);
    expect(mockCookieGet).toHaveBeenCalledWith(cookieName);
    expect(mockCookieSet).not.toHaveBeenCalled();
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });

  it("declara metadata privada y rendering dinámico sin canonical", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
    expect(metadata).toEqual({
      title: "Gestionar reserva | Myckeo",
      robots: {
        index: false,
        follow: false,
        noarchive: true,
      },
    });
    expect(metadata).not.toHaveProperty("alternates");
    expect(metadata).not.toHaveProperty("openGraph");
  });

  it("es server-only de facto: sin client, auth, visibility, params, logs o writes", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(catalogo)/reservas/gestionar/page.tsx"),
      "utf8",
    );

    expect(source).not.toContain('"use client"');
    expect(source).not.toContain('"use server"');
    expect(source).toContain(
      'import ManagedReservationCancelForm from "@/reservas/componentes/ManagedReservationCancelForm";',
    );
    expect(source).toContain("<ManagedReservationCancelForm />");
    expect(source).not.toContain("cancelManagedReservation");
    expect(source).not.toMatch(/\bauth\s*\(|auth\.config/);
    expect(source).not.toMatch(
      /buildPublishedBusinessWhere|business-visibility-policy|PUBLISHED|DIRECT/,
    );
    expect(source).not.toMatch(/\bparams\b|searchParams/);
    expect(source).not.toMatch(
      /console\.|AnalyticsBootstrap|localStorage|useEffect|useState/,
    );
    expect(source).not.toMatch(
      /cookies\(\)\.set|cookies\(\)\.delete|cookieStore\.set|cookieStore\.delete/,
    );
    expect(source).not.toMatch(/\.update\s*\(|\.create\s*\(|\.delete\s*\(/);
    expect(source).not.toMatch(
      /tokenHash:\s*true|reservationId|usuarioId|negocioId|telefono|notas/,
    );
  });
});
