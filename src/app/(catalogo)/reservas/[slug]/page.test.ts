import { readFileSync } from "node:fs";
import { join } from "node:path";

const pageSource = readFileSync(join(__dirname, "page.tsx"), "utf8");
const dashboardSource = readFileSync(
  join(
    process.cwd(),
    "src/reservas/componentes/ReservasUserDashboard.tsx",
  ),
  "utf8",
);
const modalSource = readFileSync(
  join(process.cwd(), "src/reservas/componentes/AddReservationModal.tsx"),
  "utf8",
);
const pageComponentSource = pageSource.slice(
  pageSource.indexOf("export default async function ReservasPage"),
);

describe("reservation page publicSlug propagation", () => {
  it("obtiene el slug desde params async de Next.js", () => {
    expect(pageSource).toContain("params: Promise<{\n    slug: string;");
    expect(pageComponentSource).toContain("const { slug } = await params;");
  });

  it("usa el mismo slug en el loader y ReservasUserDashboard", () => {
    expect(pageComponentSource).toContain(
      "configReservation = await getConfigUserReservation(slug);",
    );
    expect(pageComponentSource).toMatch(
      /<ReservasUserDashboard\s+config=\{configReservation\.config\}\s+publicSlug=\{slug\}\s+\/>/,
    );
  });

  it("conserva config con negocioId indirecto sin cambiar el loader", () => {
    expect(pageComponentSource).toContain(
      "config={configReservation.config}",
    );
    expect(pageComponentSource).toContain(
      "getConfigUserReservation(slug)",
    );
  });

  it("conserva auth y el comportamiento preview sin añadir PUBLISHED al write", () => {
    expect(pageComponentSource).toContain("const session = await auth();");
    expect(pageComponentSource).toContain("if (!session)");
    expect(pageComponentSource).not.toContain("buildPublishedBusinessWhere");
    expect(pageComponentSource).not.toContain("createPublicReservation");
  });

  it("no importa ni invoca Server Actions de mutación", () => {
    for (const action of [
      "createPublicReservation",
      "createOwnerReservation",
      "updateOwnerReservation",
      "createEditarReserva",
    ]) {
      expect(pageSource).not.toContain(action);
    }
  });

  it("completa la cadena page a dashboard a modal", () => {
    expect(pageComponentSource).toContain("publicSlug={slug}");
    expect(dashboardSource).toContain("publicSlug?: string;");
    expect(dashboardSource).toContain("publicSlug={publicSlug}");
    expect(modalSource).toContain("publicSlug?: string;");
  });
});
