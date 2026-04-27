import { FeedItem } from "./feed.interfaces";
import { buildSeenFeedId } from "./feed-ids";

const CANDIDATE_WINDOW = 8;
const DISCOVERY_LEAD_WINDOW = 18;

type DiscoveryContext = "home" | "category";

const DISCOVERY_LEAD_RECIPES: Record<DiscoveryContext, FeedItem["type"][]> = {
  home: [
    "product",
    "publication",
    "business",
    "product",
    "service",
    "publication",
    "product",
    "business",
    "publication",
    "service",
    "product",
    "publication",
  ],
  category: [
    "product",
    "publication",
    "product",
    "business",
    "product",
    "service",
    "product",
    "publication",
  ],
};

const getBusinessId = (item: FeedItem): string => {
  const data = item.data as { negocioId?: string };
  return data.negocioId ?? item.id;
};

const compareFeedItems = (a: FeedItem, b: FeedItem) => {
  if (b.score !== a.score) return b.score - a.score;

  const createdA = new Date(a.createdAt).getTime();
  const createdB = new Date(b.createdAt).getTime();

  if (createdB !== createdA) return createdB - createdA;

  return buildSeenFeedId(a.type, a.id).localeCompare(buildSeenFeedId(b.type, b.id));
};

export const dedupeFeedItems = (items: FeedItem[]) => {
  const uniqueMap = new Map<string, FeedItem>();

  items.forEach((item) => {
    const key = buildSeenFeedId(item.type, item.id);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });

  return Array.from(uniqueMap.values());
};

export const buildForYouFeed = (items: FeedItem[]) => {
  const pool = dedupeFeedItems(items).sort(compareFeedItems);
  const result: FeedItem[] = [];

  while (pool.length > 0) {
    const recentTypes = result.slice(-2).map((item) => item.type);
    const recentBusinesses = result.slice(-2).map(getBusinessId);
    const typeCounts = result.reduce<Record<FeedItem["type"], number>>(
      (acc, item) => {
        acc[item.type] += 1;
        return acc;
      },
      { publication: 0, product: 0, service: 0, business: 0 }
    );
    const allowOnlyFreshTypes = result.length < 4;
    const leastUsedTypeCount = Math.min(...Object.values(typeCounts));

    let selectedIndex = pool.findIndex((candidate, index) => {
      if (index >= CANDIDATE_WINDOW) return false;

      const sameRecentBusiness = recentBusinesses.includes(getBusinessId(candidate));
      const sameRecentType = recentTypes.includes(candidate.type);
      const typeIsOverused = allowOnlyFreshTypes && typeCounts[candidate.type] > leastUsedTypeCount;

      return !sameRecentBusiness && !sameRecentType && !typeIsOverused;
    });

    if (selectedIndex === -1) {
      selectedIndex = pool.findIndex((candidate, index) => {
        if (index >= CANDIDATE_WINDOW) return false;
        if (recentBusinesses.includes(getBusinessId(candidate))) return false;
        if (allowOnlyFreshTypes && typeCounts[candidate.type] > leastUsedTypeCount + 1) return false;
        return true;
      });
    }

    if (selectedIndex === -1) {
      selectedIndex = 0;
    }

    result.push(pool.splice(selectedIndex, 1)[0]);
  }

  return result;
};

const isLeadCompatible = (candidate: FeedItem, lead: FeedItem[]) => {
  const recentTypes = lead.slice(-2).map((item) => item.type);
  const recentBusinesses = lead.slice(-2).map(getBusinessId);

  const repeatsTypeTooMuch =
    recentTypes.length === 2 && recentTypes.every((type) => type === candidate.type);
  const repeatsBusinessTooMuch = recentBusinesses.includes(getBusinessId(candidate));

  return !repeatsTypeTooMuch && !repeatsBusinessTooMuch;
};

const findLeadCandidateIndex = (
  pool: FeedItem[],
  lead: FeedItem[],
  preferredType: FeedItem["type"]
) => {
  const candidatesWithinWindow = pool.slice(0, DISCOVERY_LEAD_WINDOW);

  const preferredCompatibleIndex = candidatesWithinWindow.findIndex(
    (candidate) => candidate.type === preferredType && isLeadCompatible(candidate, lead)
  );
  if (preferredCompatibleIndex !== -1) return preferredCompatibleIndex;

  const compatibleIndex = candidatesWithinWindow.findIndex((candidate) => isLeadCompatible(candidate, lead));
  if (compatibleIndex !== -1) return compatibleIndex;

  const preferredAnywhereIndex = pool.findIndex((candidate) => candidate.type === preferredType);
  if (preferredAnywhereIndex !== -1) return preferredAnywhereIndex;

  const compatibleAnywhereIndex = pool.findIndex((candidate) => isLeadCompatible(candidate, lead));
  if (compatibleAnywhereIndex !== -1) return compatibleAnywhereIndex;

  return 0;
};

export const buildDiscoveryFeed = (items: FeedItem[], context: DiscoveryContext) => {
  const baseFeed = buildForYouFeed(items);

  if (baseFeed.length <= 4) {
    return baseFeed;
  }

  const pool = [...baseFeed];
  const lead: FeedItem[] = [];

  DISCOVERY_LEAD_RECIPES[context].forEach((preferredType) => {
    if (pool.length === 0) return;

    const selectedIndex = findLeadCandidateIndex(pool, lead, preferredType);
    lead.push(pool.splice(selectedIndex, 1)[0]);
  });

  return [...lead, ...pool];
};
