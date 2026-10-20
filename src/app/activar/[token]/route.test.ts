import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Guard permanente: /activar/<token> no debe tener un handler de producción.
// No importar ./route: este test debe sobrevivir a la eliminación del archivo.
// El transporte por fragmento y el bootstrap POST tienen sus propias suites.
describe("retirada de la ruta legacy /activar/[token]", () => {
  it("impide reintroducir el handler bearer-in-path", () => {
    assert.equal(
      existsSync(resolve(__dirname, "route.ts")),
      false,
      "LEGACY_BEARER_PATH_ROUTE_STILL_PRESENT: legacy bearer-in-path activation route must remain removed",
    );
  });
});
