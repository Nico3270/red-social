import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createEditarReserva } from "./createEditarReserva";

const source = readFileSync(
  join(process.cwd(), "src/reservas/actions/createEditarReserva.ts"),
  "utf8",
);

const disabledResult = {
  ok: false,
  code: "RESERVATION_LEGACY_ACTION_DISABLED",
  message: "Esta operación de reservas ya no está disponible.",
};

const payloads: unknown[] = [
  {},
  {
    nombre: "Cliente sintético",
    telefono: "+570000000000",
    estado: "PENDIENTE",
    fechaHoraInicio: "2026-09-01T14:00:00.000Z",
    fechaHoraFin: "2026-09-01T15:00:00.000Z",
    negocioId: "business-synthetic",
  },
  {
    id: "reservation-synthetic",
    nombre: "Edición sintética",
    telefono: "+570000000001",
    estado: "CONFIRMADA",
    fechaHoraInicio: "2026-09-02T14:00:00.000Z",
    fechaHoraFin: "2026-09-02T15:00:00.000Z",
    negocioId: "business-synthetic",
  },
  {
    id: "cm1234567890syntheticcuid",
    negocioId: "business-other",
  },
  {
    arbitrary: ["payload", 42, null],
  },
];

describe("createEditarReserva disabled legacy Server Action", () => {
  it.each(payloads)("responde uniformemente para %#", async (payload) => {
    await expect(createEditarReserva(payload)).resolves.toEqual(disabledResult);
  });

  it("mantiene el mismo resultado en llamadas repetidas", async () => {
    const results = await Promise.all([
      createEditarReserva({ id: "reservation-a" }),
      createEditarReserva({ id: "reservation-a" }),
      createEditarReserva({ id: "reservation-b" }),
    ]);

    expect(results).toEqual([disabledResult, disabledResult, disabledResult]);
  });

  it("preserva la exportación async y no inspecciona el input", () => {
    expect(source).toContain('"use server";');
    expect(source).toMatch(
      /export async function createEditarReserva\(\s*_data: unknown,\s*\)/,
    );
    expect(source).not.toMatch(/_data\s*\.|safeParse|parse\(|\.id\b|negocioId/);
  });

  it("no ejecuta auth, Prisma, transacciones ni writes", () => {
    expect(source).not.toMatch(
      /@\/auth\.config|\bauth\s*\(|@\/lib\/prisma|\bprisma\b|\$transaction|findUnique|findFirst|findMany|\.create\s*\(|\.update\s*\(|\.delete\s*\(/i,
    );
  });

  it("no usa capabilities ni notificaciones", () => {
    expect(source).not.toMatch(
      /reservation-capability|rotateReservationCapabilityInTx|reissueReservationCapability|revokeActiveReservationCapabilitiesInTx|notifyReserva|WhatsApp|PlantillaWhatsApp/i,
    );
  });

  it("no construye links, usa CUID ni carga PII", () => {
    expect(source).not.toMatch(
      /\/reservas\/eliminar\/|\/reservas\/gestionar\/|result\.id|Reservation\.id|cuid|nombre|telefono|notas|fechaHora|usuarioId|negocioId/i,
    );
  });

  it("no contiene logs", async () => {
    const logSpies = [
      jest.spyOn(console, "log").mockImplementation(() => undefined),
      jest.spyOn(console, "info").mockImplementation(() => undefined),
      jest.spyOn(console, "warn").mockImplementation(() => undefined),
      jest.spyOn(console, "error").mockImplementation(() => undefined),
    ];

    try {
      await createEditarReserva({ id: "reservation-synthetic" });
      logSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
      expect(source).not.toMatch(/console\s*\./);
    } finally {
      logSpies.forEach((spy) => spy.mockRestore());
    }
  });
});
