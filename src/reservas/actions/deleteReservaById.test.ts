import { readFileSync } from "node:fs";
import { join } from "node:path";

import { deleteReservaById } from "./deleteReservaById";

const unavailableResponse = {
  ok: false,
  code: "RESERVATION_CANCELLATION_UNAVAILABLE",
  message: "La cancelación desde este enlace ya no está disponible.",
} as const;

const source = readFileSync(
  join(process.cwd(), "src/reservas/actions/deleteReservaById.ts"),
  "utf8"
);

describe("deleteReservaById fail-closed", () => {
  it("mantiene la firma compatible y devuelve el error controlado", async () => {
    const result = await deleteReservaById(
      "cm1234567890legacycuid",
      "Cliente",
      "18 de agosto de 2026 a las 10:00 a. m.",
      "negocio-1",
      "+573001112233"
    );
    const clientCompatibleResult: { ok: boolean; message: string } = result;

    expect(result).toEqual(unavailableResponse);
    expect(clientCompatibleResult.ok).toBe(false);
    expect(clientCompatibleResult.message).toBe(unavailableResponse.message);
  });

  it.each([
    ["cm1234567890legacycuid", "Cliente A", "fecha A", "negocio-a", "+573001111111"],
    ["id-arbitrario", "Cliente B", "fecha B", "negocio-b", "+573002222222"],
    ["", "", "", "", ""],
  ])(
    "ignora todos los argumentos legacy y siempre falla cerrado",
    async (id, nombre, fecha, negocioId, telefono) => {
      await expect(
        deleteReservaById(id, nombre, fecha, negocioId, telefono)
      ).resolves.toEqual(unavailableResponse);
    }
  );

  it("es estable ante invocaciones repetidas", async () => {
    const args = [
      "cm1234567890legacycuid",
      "Cliente",
      "fecha",
      "negocio-1",
      "+573001112233",
    ] as const;

    await expect(deleteReservaById(...args)).resolves.toEqual(unavailableResponse);
    await expect(deleteReservaById(...args)).resolves.toEqual(unavailableResponse);
  });

  it("no contiene acceso a DB, hard-delete, notificaciones, auth, policy ni fetch", () => {
    expect(source).not.toMatch(/@\/lib\/prisma|\bPrisma\b|\bprisma\b/);
    expect(source).not.toMatch(/reservation\s*\.|\.delete(?:Many)?\s*\(|\.update\s*\(/);
    expect(source).not.toMatch(/notifyReserva|sendWhatsApp|sendMessagePlantilla/);
    expect(source).not.toMatch(/@\/auth\.config|\bauth\s*\(/);
    expect(source).not.toMatch(/buildPublishedBusinessWhere/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it("no registra argumentos ni datos sensibles", () => {
    expect(source).not.toMatch(/console\s*\./);
    expect(source).not.toMatch(/traceId|maskPhone/);
  });
});
