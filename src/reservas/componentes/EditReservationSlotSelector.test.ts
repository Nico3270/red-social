import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addMinutes, parse } from "date-fns";

const selectorSource = readFileSync(
  join(
    process.cwd(),
    "src/reservas/componentes/EditReservationSlotSelector.tsx",
  ),
  "utf8",
);

const buildSlotRange = (
  selectedSlot: string,
  currentDate: Date,
  intervaloMinutos: number,
) => {
  const startDate = parse(selectedSlot, "HH:mm", currentDate);
  const endDate = addMinutes(startDate, intervaloMinutos);

  return {
    fechaHoraInicio: startDate.toISOString(),
    fechaHoraFin: endDate.toISOString(),
  };
};

const localDate = (day: number, hour = 0, minute = 0) =>
  new Date(2026, 7, day, hour, minute, 0, 0);

describe("EditReservationSlotSelector fechaHoraFin", () => {
  it("entrega a data el mismo rango nuevo que muestra AddReservationModal", () => {
    expect(selectorSource).toContain(
      'const startDate = parse(selectedSlot, "HH:mm", currentDate);',
    );
    expect(selectorSource).toContain(
      "const endDate = addMinutes(startDate, initialconfig?.intervaloMinutos || 30);",
    );
    expect(selectorSource).toContain(
      "fechaHoraInicio: startDate.toISOString(),",
    );
    expect(selectorSource).toContain("fechaHoraFin: endDate.toISOString(),");
    expect(selectorSource).toContain("horaInicio={startDate.toISOString()}");
    expect(selectorSource).toContain("horaFin={endDate.toISOString()}");
  });

  it("no reutiliza el fin original en el objeto final", () => {
    const updatedDataBlock = selectorSource.match(
      /const updatedData: ReservationFormData = \{[\s\S]*?\n\s*\};/,
    )?.[0];

    expect(updatedDataBlock).toBeDefined();
    expect(updatedDataBlock).not.toContain("reservaData.fechaHoraFin");
  });

  it("mueve 10:00-11:00 a 14:00-15:00 con un intervalo de 60 minutos", () => {
    const range = buildSlotRange(
      "14:00",
      localDate(20),
      60,
    );

    expect(range).toEqual({
      fechaHoraInicio: localDate(20, 14).toISOString(),
      fechaHoraFin: localDate(20, 15).toISOString(),
    });
  });

  it("respeta la duración visual configurada sin reutilizar la duración histórica", () => {
    const range = buildSlotRange(
      "14:00",
      localDate(20),
      90,
    );

    expect(range.fechaHoraFin).toBe(localDate(20, 15, 30).toISOString());
  });

  it("construye el fin en el nuevo día seleccionado", () => {
    const range = buildSlotRange(
      "15:00",
      localDate(21),
      60,
    );

    expect(range).toEqual({
      fechaHoraInicio: localDate(21, 15).toISOString(),
      fechaHoraFin: localDate(21, 16).toISOString(),
    });
  });

  it("mantiene un fin nuevo definido aunque el fin original sea null", () => {
    const originalEnd: string | null = null;
    const range = buildSlotRange("14:00", localDate(20), 30);

    expect(originalEnd).toBeNull();
    expect(range.fechaHoraFin).toBe(localDate(20, 14, 30).toISOString());
    expect(selectorSource).not.toMatch(
      /fechaHoraFin:\s*reservaData\.fechaHoraFin/,
    );
  });

  it("mantiene equivalencia temporal al seleccionar el mismo slot", () => {
    const range = buildSlotRange(
      "10:00",
      localDate(20),
      60,
    );

    expect(range).toEqual({
      fechaHoraInicio: localDate(20, 10).toISOString(),
      fechaHoraFin: localDate(20, 11).toISOString(),
    });
  });

  it("mantiene el shape de ReservationFormData y no modifica los consumidores", () => {
    expect(selectorSource).toContain("const updatedData: ReservationFormData");
    expect(selectorSource).toContain("data={updatedData}");
    expect(selectorSource).toContain('<AddReservationModal');
    expect(selectorSource).not.toContain("updateOwnerReservation");
  });
});
