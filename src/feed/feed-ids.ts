import { FeedItemType } from "./feed.interfaces";

export type FeedContentType =
  | "products"
  | "publications"
  | "services"
  | "businesses";

const CONTENT_TYPE_PREFIX: Record<FeedContentType, string> = {
  products: "product-",
  publications: "pub-",
  services: "serv-",
  businesses: "bus-",
};

const ITEM_TYPE_PREFIX: Record<FeedItemType, string> = {
  product: CONTENT_TYPE_PREFIX.products,
  publication: CONTENT_TYPE_PREFIX.publications,
  service: CONTENT_TYPE_PREFIX.services,
  business: CONTENT_TYPE_PREFIX.businesses,
};

const KNOWN_PREFIXES = Object.values(CONTENT_TYPE_PREFIX);

export const buildSeenFeedId = (type: FeedItemType, id: string) =>
  `${ITEM_TYPE_PREFIX[type]}${id}`;

export const extractSeenRawIds = (
  seenIds: string[],
  type: FeedContentType
): string[] => {
  const prefix = CONTENT_TYPE_PREFIX[type];

  const prefixedIds = seenIds
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length));

  // Compatibilidad con seenIds antiguos guardados sin prefijo.
  const legacyIds = seenIds.filter(
    (value) => !KNOWN_PREFIXES.some((knownPrefix) => value.startsWith(knownPrefix))
  );

  return Array.from(new Set([...legacyIds, ...prefixedIds]));
};
