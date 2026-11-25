import { mkdirSync, writeFileSync } from "node:fs";
import prisma from "../../src/lib/prisma";
import {
  assertIsolatedDatabase,
  resetFixtures,
  insertFixtures,
} from "./fixtures";
async function main() {
  await assertIsolatedDatabase();
  await resetFixtures();
  const sets = {
    products: { local: 27, dept: 3, national: 6 },
    publications: { local: 2, dept: 1, national: 2 },
    services: { local: 1, dept: 1, national: 2 },
    businesses: { local: 2, dept: 1, national: 2 },
  };
  const prefixes = {
    products: "product",
    publications: "publication",
    services: "service",
    businesses: "business",
  };
  const rows = [];
  for (const type of Object.keys(sets) as (keyof typeof sets)[]) {
    const fixture = await insertFixtures(type, sets[type]);
    rows.push(
      ...fixture
        .filter((row) => !/hidden|unavailable/.test(row.id))
        .map((row) => ({
          key: `${prefixes[type]}-${row.id}`,
          id: row.id,
          tier: row.tier,
          type,
        })),
    );
    // Related businesses are independently public entities, even when their
    // product/service/publication is unavailable. Include them in the oracle.
    if (type !== "businesses") {
      rows.push(
        ...fixture
          .filter((row) => !row.id.includes("hidden"))
          .map((row) => ({
            key: `business-b-${row.id}`,
            id: `b-${row.id}`,
            tier: row.tier,
            type: "businesses",
          })),
      );
    }
  }
  mkdirSync("docs/audits/postgres-integration-evidence", { recursive: true });
  writeFileSync(
    "docs/audits/postgres-integration-evidence/browser-fixtures.json",
    JSON.stringify(
      { rows, productSlug: "products-local-00", phone: "573100000000" },
      null,
      2,
    ),
  );
  console.log(
    "Seeded isolated browser fixtures:",
    rows.length,
    "eligible rows",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
