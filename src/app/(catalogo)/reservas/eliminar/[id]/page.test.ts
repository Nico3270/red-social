import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockNotFound = jest.fn((): never => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next/navigation", () => ({ notFound: mockNotFound }));

import EliminarReservaUsuarioPage from "./page";

const source = readFileSync(
  join(
    process.cwd(),
    "src/app/(catalogo)/reservas/eliminar/[id]/page.tsx"
  ),
  "utf8"
);

type LegacyPageInvocation = (props: {
  params: Promise<{ id: string }>;
}) => never;

function invokeLegacyRoute(id: string): never {
  return (EliminarReservaUsuarioPage as LegacyPageInvocation)({
    params: Promise.resolve({ id }),
  });
}

const consoleSpies = [
  jest.spyOn(console, "log").mockImplementation(() => undefined),
  jest.spyOn(console, "info").mockImplementation(() => undefined),
  jest.spyOn(console, "warn").mockImplementation(() => undefined),
  jest.spyOn(console, "error").mockImplementation(() => undefined),
];

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  consoleSpies.forEach((spy) => spy.mockRestore());
});

describe("legacy reservation cancellation page", () => {
  it.each(["cm1234567890syntheticcuid", "id-invalido", "cualquier-string"])(
    "responde notFound uniformemente para %s",
    (id) => {
      expect(() => invokeLegacyRoute(id)).toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalledTimes(1);
    }
  );

  it("mantiene el mismo resultado en llamadas repetidas", () => {
    expect(() => invokeLegacyRoute("cm1234567890syntheticcuid")).toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(() => invokeLegacyRoute("cm1234567890syntheticcuid")).toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockNotFound).toHaveBeenCalledTimes(2);
  });

  it("no importa loaders, Prisma ni acciones y no monta el modal", () => {
    expect(() => invokeLegacyRoute("cm1234567890syntheticcuid")).toThrow(
      "NEXT_NOT_FOUND"
    );

    expect(source).not.toMatch(
      /getInformacionReserva|ClientCancelModal|deleteReservaById|@\/lib\/prisma|\bPrisma\b/
    );
  });

  it("no recibe ni resuelve params y no contiene PII", () => {
    expect(source).not.toMatch(/\bparams\b|await\s+params|params\.id/);
    expect(source).not.toMatch(
      /telefono|nombreCliente|notas|fecha_hora|negocioId|usuarioId|Reservation\.id/
    );
  });

  it("sólo conserva notFound, sin auth, visibility, metadata ni logs", () => {
    expect(source).toContain('import { notFound } from "next/navigation"');
    expect(source).not.toMatch(
      /getInformacionReserva|ClientCancelModal|deleteReservaById|@\/lib\/prisma|\bPrisma\b/
    );
    expect(source).not.toMatch(
      /\bauth\s*\(|buildPublishedBusinessWhere|buildDirectVisibleBusinessWhere|visibility/
    );
    expect(source).not.toMatch(/generateMetadata|export\s+const\s+metadata|console\s*\./);
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
