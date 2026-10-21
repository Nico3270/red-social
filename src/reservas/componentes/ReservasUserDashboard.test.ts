import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { BusinessAvailabilityData } from "../actions/getCongifUserReservation";

jest.mock("./AddReservationModal", () => ({
  __esModule: true,
  default: () => null,
}));

import {
  buildPublicReservationSlots,
  type OccupancySlot,
} from "./ReservasUserDashboard";

const componentPath = join(
  process.cwd(),
  "src/reservas/componentes/ReservasUserDashboard.tsx",
);
const source = readFileSync(componentPath, "utf8");
const baseDate = new Date(2026, 7, 20, 0, 0, 0, 0);

function availability(
  overrides: Partial<BusinessAvailabilityData> = {},
): BusinessAvailabilityData {
  return {
    id: "availability-a",
    diasAtencion: ["Jueves"],
    franjaMananaInicio: "08:00",
    franjaMananaFin: "12:00",
    franjaTardeInicio: "14:00",
    franjaTardeFin: "18:00",
    intervaloMinutos: 30,
    capacidadPorIntervalo: 2,
    duracionMinimaIntervalos: 1,
    camposCustom: false,
    negocioId: "business-a",
    ...overrides,
  };
}

function instant(hours: number, minutes: number): string {
  return new Date(2026, 7, 20, hours, minutes, 0, 0).toISOString();
}

function slot(
  config: BusinessAvailabilityData,
  label: string,
  occupancy: OccupancySlot[] = [],
) {
  return buildPublicReservationSlots(config, baseDate, occupancy).find(
    (candidate) => candidate.label === label,
  );
}

describe("ReservasUserDashboard public slot algorithm", () => {
  it("usa un intervalo cuando la duración mínima es 1", () => {
    const candidate = slot(availability(), "10:00");

    expect(candidate).toBeDefined();
    expect(candidate!.end.getTime() - candidate!.start.getTime()).toBe(
      30 * 60_000,
    );
  });

  it("usa dos intervalos cuando la duración mínima es 2", () => {
    const candidate = slot(
      availability({ duracionMinimaIntervalos: 2 }),
      "10:00",
    );

    expect(candidate).toBeDefined();
    expect(candidate!.end.getTime() - candidate!.start.getTime()).toBe(
      60 * 60_000,
    );
  });

  it("calcula 60 minutos para intervalo 15 y mínimo 4", () => {
    const candidate = slot(
      availability({ intervaloMinutos: 15, duracionMinimaIntervalos: 4 }),
      "10:00",
    );

    expect(candidate).toBeDefined();
    expect(candidate!.end.getTime() - candidate!.start.getTime()).toBe(
      60 * 60_000,
    );
  });

  it("usa 1 como default cuando la duración mínima está ausente", () => {
    const candidate = slot(
      availability({ duracionMinimaIntervalos: undefined }),
      "10:00",
    );

    expect(candidate).toBeDefined();
    expect(candidate!.end.getTime() - candidate!.start.getTime()).toBe(
      30 * 60_000,
    );
  });

  it("elimina candidatos cuya duración mínima excede el cierre", () => {
    const labels = buildPublicReservationSlots(
      availability({
        franjaTardeInicio: undefined,
        franjaTardeFin: undefined,
        duracionMinimaIntervalos: 2,
      }),
      baseDate,
      [],
    ).map((candidate) => candidate.label);

    expect(labels).toContain("11:00");
    expect(labels).not.toContain("11:30");
  });

  it("no extiende un candidato de la mañana sobre el hueco", () => {
    const labels = buildPublicReservationSlots(
      availability({ duracionMinimaIntervalos: 2 }),
      baseDate,
      [],
    ).map((candidate) => candidate.label);

    expect(labels).not.toContain("11:30");
    expect(labels).toContain("14:00");
  });

  it("bloquea el candidato si su segundo intervalo está lleno", () => {
    const candidate = slot(
      availability({ duracionMinimaIntervalos: 2 }),
      "10:00",
      [
        {
          start: instant(10, 30),
          end: instant(11, 0),
          count: 2,
          blocked: false,
        },
      ],
    );

    expect(candidate?.available).toBe(false);
  });

  it("bloquea el candidato si su segundo intervalo está bloqueado", () => {
    const candidate = slot(
      availability({ duracionMinimaIntervalos: 2 }),
      "10:00",
      [
        {
          start: instant(10, 30),
          end: instant(11, 0),
          count: 0,
          blocked: true,
        },
      ],
    );

    expect(candidate?.available).toBe(false);
  });

  it("detecta una reserva larga que comienza antes del candidato", () => {
    const candidate = slot(
      availability({
        capacidadPorIntervalo: 1,
        duracionMinimaIntervalos: 2,
      }),
      "10:00",
      [
        {
          start: instant(9, 30),
          end: instant(10, 30),
          count: 1,
          blocked: false,
        },
      ],
    );

    expect(candidate?.available).toBe(false);
  });

  it("trata occupancy sin end como un intervalo legacy", () => {
    const candidate = slot(
      availability({
        capacidadPorIntervalo: 1,
        duracionMinimaIntervalos: 2,
      }),
      "10:00",
      [
        {
          start: instant(10, 30),
          count: 1,
          blocked: false,
        },
      ],
    );

    expect(candidate?.available).toBe(false);
  });

  it("considera libres los intervalos sin occupancy", () => {
    expect(
      slot(
        availability({ capacidadPorIntervalo: 1, duracionMinimaIntervalos: 2 }),
        "10:00",
      )?.available,
    ).toBe(true);
  });

  it.each([
    ["intervalo cero", { intervaloMinutos: 0 }],
    ["intervalo negativo", { intervaloMinutos: -1 }],
    ["intervalo decimal", { intervaloMinutos: 1.5 }],
    ["intervalo infinito", { intervaloMinutos: Number.POSITIVE_INFINITY }],
    ["intervalo NaN", { intervaloMinutos: Number.NaN }],
    ["capacidad cero", { capacidadPorIntervalo: 0 }],
    ["capacidad decimal", { capacidadPorIntervalo: 1.5 }],
    ["mínimo cero", { duracionMinimaIntervalos: 0 }],
    ["mínimo decimal", { duracionMinimaIntervalos: 1.5 }],
    ["mínimo infinito", { duracionMinimaIntervalos: Number.POSITIVE_INFINITY }],
    ["mínimo NaN", { duracionMinimaIntervalos: Number.NaN }],
    ["franja parcial", { franjaMananaInicio: undefined }],
    [
      "franja invertida",
      { franjaMananaInicio: "12:00", franjaMananaFin: "08:00" },
    ],
    ["hora inválida", { franjaMananaInicio: "8:00" }],
    [
      "sin franjas",
      {
        franjaMananaInicio: undefined,
        franjaMananaFin: undefined,
        franjaTardeInicio: undefined,
        franjaTardeFin: undefined,
      },
    ],
  ])("falla cerrado y termina ante configuración inválida: %s", (_label, overrides) => {
    expect(
      buildPublicReservationSlots(availability(overrides), baseDate, []),
    ).toEqual([]);
  });

  it("entrega start y end ISO del mismo candidato calculado al modal", () => {
    const candidate = slot(
      availability({ duracionMinimaIntervalos: 2 }),
      "10:00",
    );

    expect(candidate?.start.toISOString()).toBe(instant(10, 0));
    expect(candidate?.end.toISOString()).toBe(instant(11, 0));
    expect(source).toContain("horaInicio={selectedSlot.start.toISOString()}");
    expect(source).toContain("horaFin={selectedSlot.end.toISOString()}");
    expect(source).not.toContain("getSlotTimes");
  });
});

describe("ReservasUserDashboard occupancy adapter regressions", () => {
  it("mantiene el request actual y acepta los contratos legacy y agregado", () => {
    expect(source).toContain(
      "/api/reservasConfigUser?date=${dateStr}&negocioId=${config.negocioId}",
    );
    expect(source).toMatch(/if \("occupancy" in payload\)/);
    expect(source).toMatch(/normalizeFutureOccupancy\(payload\.occupancy\)/);
    expect(source).toMatch(/if \("reservas" in payload\)/);
    expect(source).toMatch(/normalizeLegacyReservations\(payload\.reservas\)/);
  });

  it("normaliza el contrato legacy sin conservar objetos Reservation", () => {
    expect(source).toMatch(/const occupancyByRange = new Map<string, OccupancySlot>/);
    expect(source).toMatch(/candidate\.estado === "BLOQUEADA"/);
    expect(source).toMatch(/current\.blocked = true/);
    expect(source).toMatch(/current\.count \+= 1/);
    expect(source).toMatch(
      /const \[occupancy, setOccupancy\] = useState<OccupancySlot\[\]>/,
    );
    expect(source).not.toMatch(/useState<ReservationDayData\[\]>/);
  });

  it("mantiene count y blocked como dimensiones separadas", () => {
    expect(source).toContain("occupiedCount += item.count");
    expect(source).toContain("blocked = blocked || item.blocked");
    expect(source).toContain("blocked || occupiedCount >= capacity");
  });

  it("ignora PII e identificadores de reservas en lógica, state y render", () => {
    for (const sensitiveAccess of [
      ".id",
      ".nombre",
      ".telefono",
      ".notas",
      ".usuarioId",
    ]) {
      expect(source).not.toContain(`candidate${sensitiveAccess}`);
      expect(source).not.toContain(`item${sensitiveAccess}`);
    }

    expect(source).not.toMatch(/reserva\.(id|nombre|telefono|notas|usuarioId)/);
    expect(source).not.toContain("ReservationDayData");
  });

  it("falla cerrado ante HTTP, BUSINESS_NOT_AVAILABLE o payload inválido", () => {
    expect(source).toMatch(/payload\.ok !== true/);
    expect(source).toMatch(/response\.ok[\s\S]*normalizeOccupancyResponse/);
    expect(source).toMatch(/if \(!normalized\)[\s\S]*setOccupancy\(\[\]\)/);
    expect(source).toContain("No pudimos cargar la disponibilidad.");
  });

  it("mantiene AddReservationModal sin introducir cambios de backend", () => {
    expect(source).toContain('import AddReservationModal from "./AddReservationModal"');
    expect(source).toMatch(/<AddReservationModal/);
    expect(source).not.toContain("buildPublishedBusinessWhere");
  });

  it("acepta publicSlug como prop opcional y conserva el caller actual", () => {
    expect(source).toContain("publicSlug?: string;");
    expect(source).toMatch(
      /const ReservasUserDashboard = \(\{ config, publicSlug \}: ReservasUserDashboardProps\)/,
    );
  });

  it("propaga publicSlug directamente a AddReservationModal", () => {
    const modal = source.match(/<AddReservationModal[\s\S]*?\/>/)?.[0];

    expect(modal).toBeDefined();
    expect(modal).toContain("publicSlug={publicSlug}");
    expect(source.match(/publicSlug=\{publicSlug\}/g)).toHaveLength(1);
  });

  it("mantiene negocioId en el modal y el fetch actual", () => {
    const modal = source.match(/<AddReservationModal[\s\S]*?\/>/)?.[0];

    expect(modal).toContain("negocioId={config.negocioId}");
    expect(source).toContain(
      "/api/reservasConfigUser?date=${dateStr}&negocioId=${config.negocioId}",
    );
  });

  it("no importa ni invoca Server Actions directamente", () => {
    expect(source).not.toContain("createPublicReservation");
    expect(source).not.toContain("createOwnerReservation");
    expect(source).not.toContain("updateOwnerReservation");
    expect(source).not.toContain("createEditarReserva");
  });

  it("usa publicSlug únicamente como propagación de prop", () => {
    expect(source.match(/\bpublicSlug\b/g)).toHaveLength(4);
    expect(source).not.toMatch(/if\s*\(\s*publicSlug/);
    expect(source).not.toMatch(/data=\{[^}]*publicSlug/);
  });
});
