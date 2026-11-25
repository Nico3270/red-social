// Build-only fixtures: the existing guard verifies 127.0.0.1:55439 and current_database().
import prisma from "../../src/lib/prisma";
import { assertIsolatedDatabase, resetFixtures, insertFixtures } from "../../scripts/public-ui-pg/fixtures";
async function main() {
  const info = await assertIsolatedDatabase();
  await resetFixtures();
  for (const type of ["products", "publications", "services", "businesses"] as const)
    await insertFixtures(type, { local: 1, dept: 1, national: 1 }, false);
  console.log({ database: info.database, version: info.version, businesses: await prisma.negocio.count(), products: await prisma.product.count() });
}
main().finally(() => prisma.$disconnect());
