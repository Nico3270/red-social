import { createHash } from "node:crypto";
import type { FeedQueryParams } from "../feed.interfaces";
import type { FeedContentType } from "../feed-ids";
import { extractSeenRawIds } from "../feed-ids";
import type { FeedLocationTier } from "../geography";

export interface FeedPageParams extends FeedQueryParams {
  categoriaSlug?: string;
  userId?: string | null;
  userLat?: number | null;
  userLong?: number | null;
  /** Internal query: reread the pending buffer under the same public filters. */
  onlyIds?: string[];
}

type CursorState = {
  v: 2;
  scope: string;
  tier: FeedLocationTier;
  after?: string;
  pending: string[];
  exhausted: boolean;
  seen: string[];
};
type Candidate = { id: string };
type Ranked<T> = { item: T; score: number };
type Fetch<T> = (params: FeedPageParams) => Promise<T[]>;
export type FeedFetchers<T> = [Fetch<T>, Fetch<T>, Fetch<T>];
const PREFIX = "fg2.";

function scopeFor(type: FeedContentType, params: FeedPageParams) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        type,
        params.ciudad,
        params.departamento,
        params.categoriaSlug ?? "",
        params.limit,
        params.userId ?? null,
        params.userLat ?? null,
        params.userLong ?? null,
        params.preferencias ?? [],
        params.secciones ?? [],
        params.followedBusinessIds ?? [],
      ]),
    )
    .digest("hex");
}

function initialState(
  type: FeedContentType,
  params: FeedPageParams,
): CursorState {
  const scope = scopeFor(type, params);
  if (!params.cursor)
    return {
      v: 2,
      scope,
      tier: 0,
      pending: [],
      exhausted: false,
      seen: extractSeenRawIds(params.seenIds, type),
    };
  let state: CursorState;
  try {
    if (!params.cursor.startsWith(PREFIX) || params.cursor.length > 100_000)
      throw new Error();
    state = JSON.parse(
      Buffer.from(params.cursor.slice(PREFIX.length), "base64url").toString(),
    );
    if (
      state.v !== 2 ||
      state.scope !== scope ||
      ![0, 1, 2].includes(state.tier) ||
      typeof state.exhausted !== "boolean" ||
      (state.after !== undefined && typeof state.after !== "string") ||
      !Array.isArray(state.pending) ||
      state.pending.length > params.limit + 10 ||
      !Array.isArray(state.seen) ||
      ![...state.pending, ...state.seen].every((id) => typeof id === "string")
    )
      throw new Error();
  } catch {
    throw new Error(
      "Cursor de feed inválido o de otra selección. Reinicia la exploración.",
    );
  }
  return state;
}

/**
 * Continue each geographic DB cursor separately. The ranked buffer is consumed
 * before scanning again, so its unreturned candidates are never skipped.
 * No snapshot: pending rows are reread with current category/visibility filters.
 */
export async function getGeographicPage<T extends Candidate>(
  type: FeedContentType,
  params: FeedPageParams,
  fetchers: FeedFetchers<T>,
  rank: (items: T[]) => Ranked<T>[],
): Promise<{
  rankedItems: Ranked<T>[];
  nextCursor?: string;
  nextTier?: FeedLocationTier;
}> {
  if (
    !Number.isInteger(params.limit) ||
    params.limit < 1 ||
    params.limit > 100
  ) {
    throw new Error("Límite de feed inválido");
  }
  const state = initialState(type, params);
  const rankedItems: Ranked<T>[] = [];
  let queue: Ranked<T>[] = [];

  if (state.pending.length) {
    const pending = await fetchers[state.tier]({
      ...params,
      cursor: undefined,
      onlyIds: state.pending,
      seenIds: state.seen,
      limit: state.pending.length,
    });
    const byId = new Map(rank(pending).map((entry) => [entry.item.id, entry]));
    queue = state.pending.flatMap((id) =>
      byId.has(id) ? [byId.get(id)!] : [],
    );
    state.pending = [];
  }

  while (true) {
    if (queue.length) {
      if (rankedItems.length === params.limit) {
        state.pending = queue.map((entry) => entry.item.id);
        return {
          rankedItems,
          nextCursor:
            PREFIX + Buffer.from(JSON.stringify(state)).toString("base64url"),
          nextTier: state.tier,
        };
      }
      rankedItems.push(queue.shift()!);
      continue;
    }
    if (state.exhausted || (state.tier === 1 && !params.departamento)) {
      if (state.tier === 2) return { rankedItems };
      state.tier = (state.tier + 1) as FeedLocationTier;
      state.after = undefined;
      state.exhausted = false;
      continue;
    }
    const windowSize = params.limit + 10;
    const candidates = await fetchers[state.tier]({
      ...params,
      cursor: state.after,
      onlyIds: undefined,
      seenIds: state.seen,
      limit: windowSize,
    });
    state.exhausted = candidates.length < windowSize;
    if (candidates.length) state.after = candidates[candidates.length - 1].id;
    queue = rank(candidates);
  }
}

export function feedIdWhere(params: FeedPageParams, type: FeedContentType) {
  return params.onlyIds
    ? { in: params.onlyIds }
    : { notIn: extractSeenRawIds(params.seenIds, type) };
}

/** City and department queries are disjoint; national must exclude both. */
export function nationalLocationWhere(params: FeedPageParams) {
  return {
    ciudad: { not: params.ciudad },
    ...(params.departamento
      ? { departamento: { not: params.departamento } }
      : {}),
  };
}
