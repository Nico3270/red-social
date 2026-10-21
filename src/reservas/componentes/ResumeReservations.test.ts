import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src/reservas/componentes/ResumeReservations.tsx"),
  "utf8",
);

describe("ResumeReservations secure cancellation caller", () => {
  it("elimina el caller legacy y reutiliza changeStatusReservations", () => {
    expect(source).toContain(
      'import { changeStatusReservations } from "../actions/reservasActions";',
    );
    expect(source).not.toMatch(/\bdeleteReserva\b/);
    expect(source).not.toContain("FaTrash");
  });

  it("envía el payload exacto para transición a CANCELADA", () => {
    expect(source).toMatch(
      /changeStatusReservations\(\{\s*negocioId,\s*reservaId: confirmCancelId,\s*nuevoStatus: "CANCELADA",\s*\}\)/,
    );
  });

  it("limita Cancelar a PENDIENTE y CONFIRMADA", () => {
    expect(source).toMatch(
      /status === "PENDIENTE" \|\| status === "CONFIRMADA"/,
    );
    expect(source).toContain("isCancellableStatus(reserva.estado) && (");
    expect(source).toContain('aria-label="Cancelar reserva"');
    expect(source).toContain('title="Cancelar reserva"');
  });

  it("no ofrece acciones de estado para CANCELADA, COMPLETADA o BLOQUEADA", () => {
    expect(source).toMatch(
      /const filteredOptions = isCancellableStatus\(reserva\.estado\)[\s\S]*?: \[\];/,
    );
    expect(source).toContain("filteredOptions.length > 0 && (");
    expect(source).not.toContain("unblockSlot");
  });

  it("conserva la fila y actualiza optimísticamente su estado", () => {
    expect(source).toMatch(
      /r\.id === confirmCancelId \? \{ \.\.\.r, estado: "CANCELADA" \} : r/,
    );
    expect(source).not.toMatch(/filter\(\(r\) => r\.id !== confirmCancelId\)/);
  });

  it("usa semántica textual de cancelación y no de borrado", () => {
    expect(source).toContain("¿Estás seguro de cancelar esta reserva?");
    expect(source).toContain("Confirmar cancelación");
    expect(source).not.toContain("Eliminar reserva");
    expect(source).not.toContain("eliminar esta reserva");
  });

  it("conserva feedback y refresh sólo en éxito", () => {
    const handler = source.match(/const confirmCancel[\s\S]*?\n  \};/)?.[0];

    expect(handler).toBeDefined();
    expect(handler).toContain(
      "setResponseMessage({ message: res.message, isError: !res.ok })",
    );
    expect(handler).toMatch(/if \(res\.ok\) \{[\s\S]*?onSuccess\(\)/);
    expect(handler).toMatch(/else \{[\s\S]*?setLocalReservas\(initialReservas\)/);
  });

  it("no gestiona capabilities ni visibility pública en el cliente", () => {
    expect(source).not.toContain("ReservationCapability");
    expect(source).not.toContain("reservation-capability");
    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(source).not.toContain("business-visibility-policy");
  });
});
