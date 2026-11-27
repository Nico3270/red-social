import { availableDiscoveryTier, groupFeedByLocation } from "./geography";
import type { FeedItem, FeedResponse } from "./feed.interfaces";

const ready = (nextTier?: 0 | 1 | 2) => ({
  isPending: false,
  isError: false,
  hasNextPage: nextTier !== undefined,
  data: { pages: [{ items: [], nextTier } as FeedResponse] },
});
it("holds fast external streams until every local continuation is exhausted", () => {
  expect(availableDiscoveryTier([ready(2), ready(0), ready(1), ready()])).toBe(
    0,
  );
  expect(availableDiscoveryTier([ready(2), ready(1), ready(1), ready()])).toBe(
    1,
  );
  expect(availableDiscoveryTier([ready(2), ready(), ready(2), ready()])).toBe(
    2,
  );
  expect(
    availableDiscoveryTier([ready(2), { ...ready(), isPending: true }]),
  ).toBe(0);
  expect(
    availableDiscoveryTier([ready(2), { ...ready(), isError: true }]),
  ).toBe(0);
});
it("keeps geographic groups ordered while preserving their secondary order", () => {
  const items = [
    { id: "external", locationTier: 2 },
    { id: "local-b", locationTier: 0 },
    { id: "dept", locationTier: 1 },
    { id: "local-a", locationTier: 0 },
  ] as FeedItem[];
  expect(
    groupFeedByLocation(items, {}).map((group) => group.map((item) => item.id)),
  ).toEqual([["local-b", "local-a"], ["dept"], ["external"]]);
});
