import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { Prisma } from "@prisma/client";
import prisma from "../../src/lib/prisma";
import { getFeedDataByType } from "../../src/feed/actions/getFeedData";
import { getFeedDataByCategory } from "../../src/feed/actions/getFeedDataByCategory";
import { buildSeenFeedId, type FeedContentType } from "../../src/feed/feed-ids";
import type { FeedPageParams } from "../../src/feed/actions/feedPage";
import type { FeedResponse, FeedItem } from "../../src/feed/feed.interfaces";
import {
  assertIsolatedDatabase,
  resetFixtures,
  insertFixtures,
} from "./fixtures";

const params: FeedPageParams = {
  ciudad: "Tunja",
  departamento: "Boyacá",
  limit: 4,
  seenIds: [],
  categoriaSlug: "comida",
};
const types: FeedContentType[] = [
  "products",
  "publications",
  "services",
  "businesses",
];
const evidence = "docs/audits/postgres-integration-evidence";
const results: { name: string; details: unknown }[] = [];
const cursorState = (cursor: string) =>
  JSON.parse(Buffer.from(cursor.slice(4), "base64url").toString()) as {
    pending: string[];
    after?: string;
    tier: number;
  };
async function page(
  type: FeedContentType,
  p: FeedPageParams = params,
  category = true,
) {
  return (category ? getFeedDataByCategory : getFeedDataByType)(type, p);
}
async function collect(
  type: FeedContentType,
  p: FeedPageParams = params,
  category = true,
  initial?: FeedResponse,
) {
  const items: FeedItem[] = initial ? [...initial.items] : [];
  const pages: FeedResponse[] = initial ? [initial] : [];
  let cursor = initial?.nextCursor;
  const cursors = new Set<string>();
  do {
    if (initial && !cursor) break;
    const next = await page(
      type,
      {
        ...p,
        cursor,
        seenIds: [
          ...p.seenIds,
          ...items.map((i) => buildSeenFeedId(i.type, i.id)),
        ],
      },
      category,
    );
    pages.push(next);
    items.push(...next.items);
    assert(next.items.length <= p.limit);
    if (next.nextCursor) {
      assert(next.nextTier !== undefined);
      assert(!cursors.has(next.nextCursor));
      cursors.add(next.nextCursor);
    } else assert.equal(next.nextTier, undefined);
    cursor = next.nextCursor;
    assert(pages.length < 80, "pagination must terminate");
  } while (cursor);
  assert.equal(
    new Set(items.map((i) => i.id)).size,
    items.length,
    "duplicates",
  );
  assert.deepEqual(
    items.map((i) => i.locationTier),
    items.map((i) => i.locationTier).sort(),
    "geographic order across pages",
  );
  return { items, pages };
}
function exact(items: FeedItem[], expected: string[]) {
  assert.deepEqual(
    items.map((i) => i.id).sort(),
    [...expected].sort(),
    "complete eligible ID set",
  );
}
async function check(name: string, run: () => Promise<unknown>) {
  const details = await run();
  results.push({ name, details });
  console.log("PASS", name);
}
async function main() {
  mkdirSync(evidence, { recursive: true });
  const database = await assertIsolatedDatabase();
  const columns = await prisma.$queryRaw<
    { column_name: string; is_nullable: string }[]
  >`SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='Negocio' AND column_name IN ('ciudad','departamento') ORDER BY column_name`;
  assert(columns.every((c) => c.is_nullable === "NO"));
  for (const type of types) {
    for (const [name, counts] of Object.entries({
      A: { local: 27, dept: 3, national: 6 },
      B: { local: 5, dept: 3, national: 5 },
      C: { local: 0, dept: 0, national: 9 },
      D: { local: 1, dept: 1, national: 2 },
      empty: { local: 0, dept: 0, national: 0 },
    })) {
      await check(`${type}/${name}/category`, async () => {
        await resetFixtures();
        const rows = await insertFixtures(type, counts, name !== "A");
        const expected = rows
          .filter((r) => !/wrong-category|hidden|unavailable/.test(r.id))
          .map((r) => r.id);
        const { items, pages } = await collect(type);
        exact(items, expected);
        pages.slice(0, -1).forEach((current, index) => {
          assert.equal(
            current.nextTier,
            pages[index + 1].items[0].locationTier,
            "nextTier must describe the next eligible item",
          );
        });
        if (name === "A") {
          assert.deepEqual(
            items.map((item) => item.id),
            expected,
            "equal order/date/score ties must retain deterministic ID order across windows",
          );
          assert.equal(items.length, 36);
          assert(items.slice(0, 27).every((i) => i.locationTier === 0));
          assert(items.slice(27, 30).every((i) => i.locationTier === 1));
          assert.equal(pages.length, 9);
          const global = await collect(type, params, false);
          exact(global.items, expected);
          assert.deepEqual(
            global.items.map((i) => i.id),
            items.map((i) => i.id),
          );
        }
        if (name === "D")
          assert.equal(
            pages.length,
            1,
            "exactly full final page has no phantom cursor",
          );
        if (name === "C") assert.equal(pages.length, 3);
        return {
          count: items.length,
          pages: pages.length,
          ids: items.map((i) => i.id),
          tiers: items.map((i) => i.locationTier),
        };
      });
    }
  }
  await check("compound-order/pending-buffer-restoration", async () => {
    await resetFixtures();
    await insertFixtures(
      "products",
      { local: 27, dept: 0, national: 0 },
      false,
    );
    for (let priority = 0; priority < 5; priority++)
      await prisma.product.updateMany({
        where: {
          id: {
            in: Array.from({ length: 27 }, (_, i) => i)
              .filter((i) => i % 5 === priority)
              .map((i) => `products-local-${String(i).padStart(2, "0")}`),
          },
        },
        data: { prioridad: priority },
      });
    const first = await page("products");
    const state = cursorState(first.nextCursor!);
    const dbRead = await prisma.product.findMany({
      where: { id: { in: state.pending } },
      orderBy: [{ orden: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      select: { id: true },
    });
    assert.notDeepEqual(
      state.pending,
      dbRead.map((r) => r.id),
      "fixture must distinguish ranked pending order from DB order",
    );
    const next = await page("products", {
      ...params,
      cursor: first.nextCursor,
    });
    assert.deepEqual(
      next.items.map((i) => i.id),
      state.pending.slice(0, 4),
    );
    const all = await collect("products", params, true, first);
    assert.equal(all.items.length, 27);
    return {
      pending: state.pending,
      databaseOrder: dbRead.map((r) => r.id),
      next: next.items.map((i) => i.id),
    };
  });
  for (const type of ["products", "businesses", "publications"] as const) {
    await check(`${type}/current-visibility-on-buffer-reread`, async () => {
      await resetFixtures();
      const rows = await insertFixtures(
        type,
        { local: 27, dept: 3, national: 6 },
        false,
      );
      const first = await page(type);
      const target = cursorState(first.nextCursor!).pending[0];
      if (type === "products") {
        const product = await prisma.product.findUniqueOrThrow({
          where: { id: target },
          select: { negocioId: true },
        });
        await prisma.negocio.update({
          where: { id: product.negocioId },
          data: { isTestData: true },
        });
      } else if (type === "businesses")
        await prisma.negocio.update({
          where: { id: target },
          data: { archivedAt: new Date() },
        });
      else
        await prisma.publicacion.update({
          where: { id: target },
          data: { visibilidad: "PRIVADA" },
        });
      const all = await collect(type, params, true, first);
      exact(
        all.items,
        rows.map((r) => r.id).filter((id) => id !== target),
      );
      return {
        hiddenPending: target,
        count: all.items.length,
        notDelivered: !all.items.some((i) => i.id === target),
      };
    });
  }
  await check(
    "location-nullability-and-deliberate-publication-policy",
    async () => {
      await resetFixtures();
      const rows = await insertFixtures(
        "businesses",
        { local: 3, dept: 0, national: 0 },
        false,
      );
      await prisma.negocio.update({
        where: { id: rows[1].id },
        data: { ciudad: "" },
      });
      await prisma.negocio.update({
        where: { id: rows[2].id },
        data: { ciudad: "", departamento: "" },
      });
      const all = await collect("businesses");
      exact(
        all.items,
        rows.map((r) => r.id),
      );
      assert.deepEqual(
        all.items.map((i) => i.locationTier),
        [0, 1, 2],
      );
      await prisma.usuario.update({
        where: { id: `u-${rows[2].id}` },
        data: { perfilCompleto: false },
      });
      const published = await collect("businesses");
      assert.equal(published.items.length, 2);
      const owner = `u-${rows[0].id}`;
      await prisma.publicacion.create({
        data: {
          id: "audit-unattached-publication",
          usuarioId: owner,
          tipo: "CARRUSEL_IMAGENES",
          visibilidad: "PUBLICA",
          descripcion: "Synthetic without business",
        },
      });
      assert.equal(
        (await collect("publications")).items.length,
        0,
        "publication without a business is deliberately ineligible",
      );
      return {
        columns,
        emptyStringsClassified: [0, 1, 2],
        incompleteExcluded: true,
        unattachedExcluded: true,
      };
    },
  );
  await check("deleted-database-cursor/documented-restart", async () => {
    await resetFixtures();
    const rows = await insertFixtures(
      "businesses",
      { local: 27, dept: 3, national: 6 },
      false,
    );
    const first = await page("businesses");
    const state = cursorState(first.nextCursor!);
    assert(state.after);
    await prisma.negocio.delete({ where: { id: state.after } });
    const continuation = await collect("businesses", params, true, first);
    const fresh = await collect("businesses");
    exact(
      fresh.items,
      rows.map((r) => r.id).filter((id) => id !== state.after),
    );
    const missed = fresh.items
      .filter((i) => !continuation.items.some((old) => old.id === i.id))
      .map((i) => i.id);
    assert(missed.length > 0, "deleted cursor limitation must be reproduced");
    return {
      deleted: state.after,
      continued: continuation.items.length,
      missed,
      recoveredByFreshTraversal: fresh.items.length,
    };
  });
  writeFileSync(
    `${evidence}/postgres-results.json`,
    JSON.stringify(
      {
        database,
        prisma: Prisma.prismaVersion.client,
        adapter: "real PrismaClient; no memory injection",
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    `${results.length} PostgreSQL scenarios passed; Prisma ${Prisma.prismaVersion.client}`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
