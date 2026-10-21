import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboardSource = readFileSync(
  join(process.cwd(), "src/reservas/componentes/ReservasDashboard.tsx"),
  "utf8",
);

describe("ReservasDashboard unblockSlot caller", () => {
  it("importa unblockSlot y deja de importar deleteReserva", () => {
    expect(dashboardSource).toContain(
      'import { unblockSlot } from "@/reservas/actions/unblockSlot";',
    );
    expect(dashboardSource).not.toMatch(/\bdeleteReserva\b/);
  });

  it("envía únicamente reservationId al boundary de desbloqueo", () => {
    expect(dashboardSource).toMatch(
      /const handleUnblockSlot = async \(reservationId: string\) => \{\s*const res = await unblockSlot\(\{ reservationId \}\);/,
    );
    expect(dashboardSource).not.toMatch(
      /unblockSlot\(\{[^}]*negocioId[^}]*\}\)/,
    );
  });

  it("conserva feedback de éxito/error y refresh sólo tras éxito", () => {
    const handler = dashboardSource.match(
      /const handleUnblockSlot[\s\S]*?\n  \};/,
    )?.[0];

    expect(handler).toBeDefined();
    expect(handler).toContain("toast.success(res.message");
    expect(handler).toContain("await fetchReservas()");
    expect(handler).toContain("toast.error(res.message");
  });

  it("mantiene Desbloquear limitado a la fila BLOQUEADA seleccionada", () => {
    expect(dashboardSource).toContain(
      'slotReservas.some((res) => res.estado === "BLOQUEADA")',
    );
    expect(dashboardSource).toContain("handleUnblockSlot(blockedReserva.id)");
    expect(dashboardSource).toContain('title="Desbloquear"');
  });
});
