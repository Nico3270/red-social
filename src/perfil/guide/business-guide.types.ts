import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";

export type BusinessGuideVertical =
  | "restaurant"
  | "fashion"
  | "flowers_gifts"
  | "tech"
  | "home"
  | "generic";

export type BusinessGuidePresetKind = "universal" | "contextual" | "section";

export type UniversalGuidePresetId =
  | "universal:catalog"
  | "universal:popular"
  | "universal:budget"
  | "universal:new"
  | "universal:contact";

export type ContextualGuidePresetId =
  | "contextual:quick"
  | "contextual:drinks"
  | "contextual:share"
  | "contextual:casual"
  | "contextual:elegant"
  | "contextual:gift"
  | "contextual:birthday"
  | "contextual:romantic"
  | "contextual:audio"
  | "contextual:gaming"
  | "contextual:setup"
  | "contextual:decor"
  | "contextual:cozy_home";

export type SectionGuidePresetId = `section:${string}`;

export type BusinessGuidePresetId =
  | UniversalGuidePresetId
  | ContextualGuidePresetId
  | SectionGuidePresetId;

export type BusinessGuideIcon =
  | "catalog"
  | "popular"
  | "budget"
  | "new"
  | "contact"
  | "quick"
  | "drink"
  | "share"
  | "casual"
  | "elegant"
  | "gift"
  | "birthday"
  | "romantic"
  | "audio"
  | "gaming"
  | "setup"
  | "decor"
  | "home"
  | "section";

export interface BusinessGuideBusinessInfo {
  nombreNegocio: string;
  slugNegocio: string;
  descripcionNegocio: string;
  categoriaIds: string[];
  seccionesIds: string[];
}

export interface BusinessGuidePreset {
  id: BusinessGuidePresetId;
  kind: BusinessGuidePresetKind;
  vertical: BusinessGuideVertical;
  label: string;
  hint: string;
  shortResultLabel: string;
  icon: BusinessGuideIcon;
  preferredSectionId?: string | null;
  evidence?: string[];
}

export interface BusinessGuideConfig {
  vertical: BusinessGuideVertical;
  title: string;
  subtitle: string;
  helperText: string;
  presets: BusinessGuidePreset[];
}

export interface BusinessGuideSelectionState {
  selectedPresetId: BusinessGuidePresetId | null;
}

export interface ProductGuideExploreContext {
  requestKey: string;
  presetId: BusinessGuidePresetId;
  title: string;
  summary: string;
  preferredSectionId?: string | null;
}

export interface BusinessGuideAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface BusinessGuideRecommendation {
  key: string;
  product: ProductRedSocial;
  reason: string;
  matchedSignals: string[];
  score: number;
}

export interface BusinessGuideResolvedPreset {
  preset: BusinessGuidePreset;
  title: string;
  summary: string;
  items: BusinessGuideRecommendation[];
  exploreContext: ProductGuideExploreContext;
  isFallback: boolean;
  primaryAction?: BusinessGuideAction | null;
}
