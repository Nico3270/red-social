import prisma from "../../src/lib/prisma";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55441");
  assert.equal(url.pathname, "/myckeo_owner_audit");
  const users = await prisma.usuario.findMany({
    where: { email: { endsWith: "@business-audit.invalid" } },
    select: {
      email: true,
      role: true,
      perfilCompleto: true,
      negocio: {
        select: {
          nombre: true,
          telefonoContacto: true,
          categorias: { select: { categoryId: true } },
          secciones: { select: { sectionId: true } },
        },
      },
    },
  });
  assert.equal(users.length, 3);
  const owner = users.find(
    (u) => u.email === "new-owner@business-audit.invalid",
  );
  assert(owner);
  assert.equal(owner.role, "negocio");
  assert(owner.perfilCompleto);
  assert.equal(owner.negocio?.nombre, "Negocio Sintético Auditoría");
  assert.equal(owner.negocio.telefonoContacto, "+573100000000");
  assert.deepEqual(owner.negocio.categorias, [{ categoryId: "2" }]);
  assert.deepEqual(owner.negocio.secciones, [{ sectionId: "s8" }]);
  assert(
    users.find((u) => u.email === "incomplete-personal@business-audit.invalid")
      ?.perfilCompleto,
  );
  assert.equal(users.filter((u) => u.negocio).length, 1);
  writeFileSync(
    "docs/audits/business-entry-evidence/database-after-flow.json",
    JSON.stringify(
      {
        realPrisma: true,
        realPostgreSQL: true,
        syntheticUsers: users,
        newBusinessCount: 1,
      },
      null,
      2,
    ),
  );
  console.log(
    "Database confirms one created business, session role, reference relations and completed profile; no duplicate registration",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
