import type { FeedItem } from "./feed.interfaces";

export type DesktopDiscoveryBlock = { kind: "publication" | "commerce"; items: FeedItem[] };

/** Presentation only. All input items are mounted exactly once; no queries or seen IDs. */
export interface DesktopDiscoveryPlan { main: DesktopDiscoveryBlock[]; side: FeedItem[] }
const identity = (item: FeedItem) => `${item.type}-${item.id}`;
const commerceHeight = (item: FeedItem) => item.type === "product" ? 400 : item.type === "business" ? 360 : 250;

export function distributeDesktopDiscovery(items: FeedItem[], previous?: DesktopDiscoveryPlan): DesktopDiscoveryPlan {
  const current = new Map(items.map(item => [identity(item), item]));
  const refresh = (rows: FeedItem[]) => rows.flatMap(item => {
    const updated = current.get(identity(item));
    return updated ? [updated] : [];
  });
  const main: DesktopDiscoveryBlock[] = (previous?.main ?? [])
    .map(block => ({ ...block, items: refresh(block.items) }))
    .filter(block => block.items.length > 0);
  const side = refresh(previous?.side ?? []);
  const assigned = new Set([...main.flatMap(block => block.items), ...side].map(identity));
  main.push(...items.filter(item => item.type === "publication" && !assigned.has(identity(item)))
    .map(item => ({ kind: "publication" as const, items: [item] })));
  // Bounded card previews make these estimates useful without measuring/reordering
  // live cards after image load. The final row may contain one commercial card.
  let mainHeight = main.reduce((height, block) => {
    if (block.kind === "commerce") return height + block.items.reduce((sum, item) => sum + commerceHeight(item) / 2, 0);
    const data = block.items[0].data as { tipo?: string; multimedia?: unknown[] };
    return height + (data.tipo === "TESTIMONIO" || !data.multimedia?.length ? 260 : 530);
  }, 0);
  let sideHeight = side.reduce((height, item) => height + commerceHeight(item), 0);
  for (const item of items) {
    if (item.type === "publication" || assigned.has(identity(item))) continue;
    const height = commerceHeight(item);
    const last = main.at(-1);
    // Complete an open pair before starting another side card.
    if (last?.kind === "commerce" && last.items.length === 1) {
      last.items.push(item);
      mainHeight += height / 2;
    } else if (sideHeight <= mainHeight) {
      side.push(item);
      sideHeight += height;
    } else {
      main.push({ kind: "commerce", items: [item] });
      mainHeight += height / 2;
    }
  }
  // A single commercial item should not leave the primary column empty.
  if (!main.length && side.length) main.push({ kind: "commerce", items: side.splice(0) });
  return { main, side };
}
