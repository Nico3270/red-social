export interface CatalogAccentTheme {
  id: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  border: string;
  text: string;
  textSoft: string;
  solid: string;
  solidSoft: string;
  solidText: string;
  badge: string;
  badgeText: string;
  shadow: string;
}

const THEMES: CatalogAccentTheme[] = [
  {
    id: "amber-gold",
    surface: "#FFF4DB",
    surfaceMuted: "#FFF9EE",
    surfaceStrong: "#FFD98A",
    border: "#F2B94B",
    text: "#7A4B00",
    textSoft: "#A46A12",
    solid: "#D48A00",
    solidSoft: "rgba(212,138,0,0.18)",
    solidText: "#FFFFFF",
    badge: "#FFE2A8",
    badgeText: "#8A5600",
    shadow: "0 20px 48px rgba(212,138,0,0.20)",
  },
  {
    id: "royal-blue",
    surface: "#EAF3FF",
    surfaceMuted: "#F5F9FF",
    surfaceStrong: "#B8D5FF",
    border: "#5C9CFF",
    text: "#0F3D91",
    textSoft: "#3F67B2",
    solid: "#2563EB",
    solidSoft: "rgba(37,99,235,0.18)",
    solidText: "#FFFFFF",
    badge: "#CFE2FF",
    badgeText: "#1E4FAF",
    shadow: "0 20px 48px rgba(37,99,235,0.20)",
  },
  {
    id: "emerald-green",
    surface: "#EAFBF0",
    surfaceMuted: "#F4FDF7",
    surfaceStrong: "#BFECCB",
    border: "#47C266",
    text: "#14532D",
    textSoft: "#2F7B47",
    solid: "#16A34A",
    solidSoft: "rgba(22,163,74,0.18)",
    solidText: "#FFFFFF",
    badge: "#CEF4D8",
    badgeText: "#166534",
    shadow: "0 20px 48px rgba(22,163,74,0.18)",
  },
  {
    id: "coral-red",
    surface: "#FFF0EC",
    surfaceMuted: "#FFF7F4",
    surfaceStrong: "#FFC6B8",
    border: "#FF8A6B",
    text: "#7A2E1F",
    textSoft: "#A25243",
    solid: "#EA5A3D",
    solidSoft: "rgba(234,90,61,0.18)",
    solidText: "#FFFFFF",
    badge: "#FFD5CB",
    badgeText: "#943C2A",
    shadow: "0 20px 48px rgba(234,90,61,0.20)",
  },
  {
    id: "violet-indigo",
    surface: "#F1EDFF",
    surfaceMuted: "#F8F6FF",
    surfaceStrong: "#CEC2FF",
    border: "#8D73FF",
    text: "#3F2E7A",
    textSoft: "#6551A3",
    solid: "#6D4CFF",
    solidSoft: "rgba(109,76,255,0.18)",
    solidText: "#FFFFFF",
    badge: "#DDD4FF",
    badgeText: "#543CB2",
    shadow: "0 20px 48px rgba(109,76,255,0.20)",
  },
  {
    id: "teal-cyan",
    surface: "#E9FBFB",
    surfaceMuted: "#F4FEFE",
    surfaceStrong: "#BDEEEE",
    border: "#3CC6C6",
    text: "#0F5252",
    textSoft: "#377979",
    solid: "#0EA5A8",
    solidSoft: "rgba(14,165,168,0.18)",
    solidText: "#FFFFFF",
    badge: "#CFF5F5",
    badgeText: "#146B6D",
    shadow: "0 20px 48px rgba(14,165,168,0.18)",
  },
];

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getCatalogAccentTheme(seed?: string | null): CatalogAccentTheme {
  if (!seed) {
    return THEMES[0];
  }

  return THEMES[hashSeed(seed) % THEMES.length];
}