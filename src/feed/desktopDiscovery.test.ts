import { distributeDesktopDiscovery } from "./desktopDiscovery";
import type { FeedItem } from "./feed.interfaces";

const item = (type: FeedItem["type"], id: number): FeedItem => ({
  type, id: `${type}-${id}`, data: { negocioId: "same-business", multimedia: [] },
} as unknown as FeedItem);

const fixtures = (publications: number, products: number) => [
  ...Array.from({ length: publications }, (_, i) => item("publication", i)),
  ...Array.from({ length: products }, (_, i) => item("product", i)),
];

describe("desktop discovery presentation", () => {
  test.each([[5, 12], [1, 40], [12, 0], [0, 17], [1, 1], [0, 1], [0, 0]])(
    "%i publications and %i products retain all identities exactly once", (pubs, products) => {
      const input = fixtures(pubs, products);
      const before = JSON.stringify(input);
      const { main, side } = distributeDesktopDiscovery(input);
      const output = [...main.flatMap(block => block.items), ...side];
      expect(output.map(i => i.id).sort()).toEqual(input.map(i => i.id).sort());
      expect(new Set(output.map(i => i.id)).size).toBe(input.length);
      expect(side.every(i => i.type !== "publication")).toBe(true);
      expect(main.flatMap(b => b.items).filter(i => i.type === "publication").map(i => i.id))
        .toEqual(input.filter(i => i.type === "publication").map(i => i.id));
      expect(JSON.stringify(input)).toBe(before);
      if (input.length) expect(main.length).toBeGreaterThan(0);
    },
  );
  test("services and businesses remain available, including several items from one business", () => {
    const input = [...fixtures(1, 20), item("business", 1), item("service", 2)];
    const { main, side } = distributeDesktopDiscovery(input);
    const output = [...main.flatMap(b => b.items), ...side];
    expect(output).toHaveLength(input.length);
    expect(output).toEqual(expect.arrayContaining(input));
    expect(main.some(block => block.kind === "commerce")).toBe(true);
    expect(main.filter(b => b.kind === "commerce").every(b => b.items.length <= 2)).toBe(true);
  });
  test("continuations retain each existing lane and refresh DTOs without mutating the previous plan", () => {
    const first = fixtures(1, 20);
    const previous = distributeDesktopDiscovery(first);
    const snapshot = JSON.stringify(previous);
    const updated = first.map(item => ({ ...item, title: "fresh DTO" }));
    const next = distributeDesktopDiscovery([...updated, item("publication", 99), item("product", 99)], previous);
    const previousMain = previous.main.flatMap(b => b.items).map(i => i.id);
    const nextMain = next.main.flatMap(b => b.items).map(i => i.id);
    expect(nextMain.filter(id => previousMain.includes(id))).toEqual(previousMain);
    expect(next.side.filter(i => previous.side.some(old => old.id === i.id)).map(i => i.id))
      .toEqual(previous.side.map(i => i.id));
    expect([...next.main.flatMap(b => b.items), ...next.side].filter(i => i.id !== "publication-99" && i.id !== "product-99").every(i => i.title === "fresh DTO")).toBe(true);
    expect(JSON.stringify(previous)).toBe(snapshot);
  });
  test("removed input identities are not retained by the presentation plan", () => {
    const input = fixtures(1, 8);
    const previous = distributeDesktopDiscovery(input);
    const remaining = input.filter(i => i.id !== "product-0");
    const next = distributeDesktopDiscovery(remaining, previous);
    expect([...next.main.flatMap(b => b.items), ...next.side].map(i => i.id).sort()).toEqual(remaining.map(i => i.id).sort());
  });

});
