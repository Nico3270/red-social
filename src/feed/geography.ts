import type { FeedItem, FeedResponse } from "./feed.interfaces";

export type FeedLocationTier = 0 | 1 | 2;
type Location = { ciudad?: string; departamento?: string };

export function getLocationTier(
  location: Location,
  selected: Location,
): FeedLocationTier {
  if (selected.ciudad && location.ciudad === selected.ciudad) return 0;
  if (selected.departamento && location.departamento === selected.departamento)
    return 1;
  return 2;
}

export function getFeedItemTier(
  item: FeedItem,
  selected: Location,
): FeedLocationTier {
  if (item.locationTier !== undefined) return item.locationTier;
  const data = item.data as Location & { negocio?: Location };
  return getLocationTier(data.negocio ?? data, selected);
}

export function groupFeedByLocation(
  items: FeedItem[],
  selected: Location,
): FeedItem[][] {
  const groups: FeedItem[][] = [[], [], []];
  items.forEach((item) => groups[getFeedItemTier(item, selected)].push(item));
  return groups.filter((group) => group.length > 0);
}

/** A faster content stream must not expose other cities before slower locals. */
export function availableDiscoveryTier(
  queries: Array<{
    isPending: boolean;
    isError: boolean;
    hasNextPage: boolean;
    data?: { pages: FeedResponse[] };
  }>,
): FeedLocationTier {
  return Math.min(
    ...queries.map((query) => {
      if (query.isPending || query.isError || !query.data?.pages.length)
        return 0;
      const last = query.data.pages[query.data.pages.length - 1];
      return query.hasNextPage ? (last.nextTier ?? 0) : 2;
    }),
  ) as FeedLocationTier;
}
