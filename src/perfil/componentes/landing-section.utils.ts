import type { CSSProperties } from "react";

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const normalizedUnit = (seed: string, salt: string) =>
  (hashString(`${seed}:${salt}`) % 1000) / 999;

const toPercent = (value: number) => `${value.toFixed(3)}%`;
const toPixels = (value: number) => `${value.toFixed(3)}px`;

export const getDeterministicFloatingCardStyle = (
  seed: string,
  index: number
): CSSProperties => {
  const scopedSeed = `${seed}:${index}`;

  return {
    top: toPercent(6 + normalizedUnit(scopedSeed, "top") * 64),
    left: toPercent(5 + normalizedUnit(scopedSeed, "left") * 67),
    width: toPixels(180 + normalizedUnit(scopedSeed, "width") * 160),
    height: toPixels(140 + normalizedUnit(scopedSeed, "height") * 180),
    rotate: `${(-10 + normalizedUnit(scopedSeed, "rotate") * 20).toFixed(3)}deg`,
  };
};

export const pickStablePreviewItems = <T>(
  items: T[],
  count: number,
  getKey: (item: T, index: number) => string
) => {
  if (items.length <= count) {
    return items;
  }

  return [...items]
    .map((item, index) => ({
      item,
      rank: hashString(getKey(item, index)),
    }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, count)
    .map(({ item }) => item);
};
