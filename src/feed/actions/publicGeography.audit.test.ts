/** Regressions replacing the earlier characterization of GEO-01 / GEO-02. */
import type { FeedContentType } from "../feed-ids";
import type { FeedResponse } from "../feed.interfaces";
import type { RawData } from "./selects";
import { buildSeenFeedId } from "../feed-ids";
import {
  makeRows,
  queryRows,
} from "../../../e2e/geography-pagination/data.cjs";
const mockDataset: Record<string, RawData[]> = {};
const mockQuery = (type: string) =>
  jest.fn(async (args) => queryRows(mockDataset[type] || [], args));
const mockProduct = mockQuery("products"),
  mockPublication = mockQuery("publications");
const mockService = mockQuery("services"),
  mockBusiness = mockQuery("businesses");
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      product: { findMany: mockProduct },
      publicacion: { findMany: mockPublication },
      servicio: { findMany: mockService },
      negocio: { findMany: mockBusiness },
      interaccion: { findMany: jest.fn(async () => []) },
    },
  }),
  { virtual: true },
);
import { getFeedDataByType } from "./getFeedData";
import { getFeedDataByCategory } from "./getFeedDataByCategory";
import type { FeedPageParams } from "./feedPage";
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

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of types) mockDataset[key] = [];
});
async function collect(
  type: FeedContentType,
  p: FeedPageParams,
  category = true,
) {
  const pages: FeedResponse[] = [];
  const seen: string[] = [...p.seenIds];
  let cursor: string | undefined;
  const cursors = new Set<string>();
  do {
    const page = await (category ? getFeedDataByCategory : getFeedDataByType)(
      type,
      { ...p, seenIds: seen, cursor },
    );
    pages.push(page);
    expect(page.items.length).toBeLessThanOrEqual(p.limit);
    expect(pages.length).toBeLessThan(50);
    seen.push(...page.items.map((item) => buildSeenFeedId(item.type, item.id)));
    cursor = page.nextCursor;
    if (cursor) {
      expect(cursors.has(cursor)).toBe(false);
      cursors.add(cursor);
      expect(page.nextTier).toBeDefined();
    } else expect(page.nextTier).toBeUndefined();
  } while (cursor);
  const items = pages.flatMap((page) => page.items);
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  expect(items.map((item) => item.locationTier)).toEqual(
    [...items.map((item) => item.locationTier)].sort(),
  );
  return { pages, items };
}

for (const type of types)
  describe(`${type}: geographic cursor across complete sequences`, () => {
    it("A: drains multiple local pages before higher-scoring external rows", async () => {
      mockDataset[type] = makeRows(type) as RawData[];
      const { items, pages } = await collect(type, params);
      expect(items).toHaveLength(36);
      expect(items.slice(0, 27).every((item) => item.locationTier === 0)).toBe(
        true,
      );
      expect(items.slice(27, 30).every((item) => item.locationTier === 1)).toBe(
        true,
      );
      expect(items.slice(30).every((item) => item.locationTier === 2)).toBe(
        true,
      );
      expect(pages.at(-1)?.nextCursor).toBeUndefined();
    });
    it("B: crosses both geographic boundaries without losing buffered candidates", async () => {
      mockDataset[type] = makeRows(type, {
        local: 5,
        dept: 3,
        national: 5,
      }) as RawData[];
      const { items, pages } = await collect(type, params);
      const eligible = mockDataset[type].filter(
        (row) =>
          !row.id.includes("wrong-category") &&
          !row.id.includes("hidden") &&
          !row.id.includes("unavailable"),
      );
      expect(items.map((item) => item.id).sort()).toEqual(
        eligible.map((row) => row.id).sort(),
      );
      expect(pages[1].items.map((item) => item.locationTier)).toEqual([
        0, 1, 1, 1,
      ]);
    });
    it("C: a city with no matches can paginate other cities", async () => {
      mockDataset[type] = makeRows(type, {
        local: 0,
        dept: 0,
        national: 9,
      }) as RawData[];
      const { items, pages } = await collect(type, params);
      expect(items).toHaveLength(9);
      expect(pages).toHaveLength(3);
      expect(items.every((item) => item.locationTier === 2)).toBe(true);
    });
    it("D: applies visibility/category/type at every tier and returns a coherent final page", async () => {
      mockDataset[type] = makeRows(type, {
        local: 1,
        dept: 1,
        national: 2,
      }) as RawData[];
      const { items, pages } = await collect(type, params);
      expect(items).toHaveLength(4);
      expect(pages).toHaveLength(1);
      expect(
        items.every(
          (item) => !/hidden|unavailable|wrong-category/.test(item.id),
        ),
      ).toBe(true);
      mockDataset[type] = makeRows(type, {
        local: 0,
        dept: 0,
        national: 0,
      }) as RawData[];
      expect((await collect(type, params)).items).toEqual([]);
    });
    it("keeps fixed-data tie order stable despite input order and mutable seenIds", async () => {
      mockDataset[type] = makeRows(
        type,
        { local: 25, dept: 4, national: 5 },
        false,
      ) as RawData[];
      const first = await collect(type, params, false);
      mockDataset[type].reverse();
      const second = await collect(type, params, false);
      expect(second.items.map((item) => item.id)).toEqual(
        first.items.map((item) => item.id),
      );
    });
  });

it("binds continuation to city, category, content type and secondary ranking inputs", async () => {
  mockDataset.businesses = makeRows("businesses") as RawData[];
  const first = await getFeedDataByCategory("businesses", params);
  for (const changed of [
    { ciudad: "Bogotá" },
    { categoriaSlug: "moda" },
    { preferencias: ["moda"] },
    { limit: 2 },
  ]) {
    await expect(
      getFeedDataByCategory("businesses", {
        ...params,
        ...changed,
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow("otra selección");
  }
  await expect(
    getFeedDataByCategory("products", { ...params, cursor: first.nextCursor }),
  ).rejects.toThrow("otra selección");
});

it("does not expand past a failed local query as if the city were empty", async () => {
  mockBusiness.mockRejectedValueOnce(new Error("synthetic failure"));
  await expect(getFeedDataByType("businesses", params)).rejects.toThrow(
    "synthetic failure",
  );
  expect(mockBusiness).toHaveBeenCalledTimes(1);
});

it("continues without a department and beyond the client's 500 seen-id limit", async () => {
  mockDataset.businesses = makeRows(
    "businesses",
    { local: 503, dept: 2, national: 1 },
    false,
  ) as RawData[];
  const { items, pages } = await collect(
    "businesses",
    { ...params, departamento: "", limit: 100 },
    false,
  );
  expect(items).toHaveLength(506);
  expect(items.slice(0, 503).every((item) => item.locationTier === 0)).toBe(
    true,
  );
  expect(items.slice(503).every((item) => item.locationTier === 2)).toBe(true);
  expect(
    Math.max(...pages.map((page) => page.nextCursor?.length ?? 0)),
  ).toBeLessThan(10_000);
});
