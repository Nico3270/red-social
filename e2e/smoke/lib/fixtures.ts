import fixturesData from "../.generated/fixtures.json";

export type SmokeCatalogGroupsProfileStatus = "existing" | "bootstrapped" | "missing";

export interface SmokeProductFixture {
  slug: string;
  name: string;
  hasWhatsApp: boolean;
  hasVariants: boolean;
  isOutOfStock: boolean;
}

export interface SmokeGroupTargetFixture {
  id: string;
  slug: string;
  name: string;
  rootName: string;
  sampleProduct: SmokeProductFixture;
}

export interface SmokeProfileFixture {
  slug: string;
  businessName: string;
}

export interface TraditionalSmokeProfileFixture extends SmokeProfileFixture {
  product: SmokeProductFixture;
}

export interface CatalogGroupsSmokeProfileFixture extends SmokeProfileFixture {
  fixtureSource: Exclude<SmokeCatalogGroupsProfileStatus, "missing">;
  fallbackTarget: SmokeGroupTargetFixture;
  ungroupedSampleProduct?: SmokeProductFixture | null;
}

export interface SmokeFixtures {
  fixtureVersion: number;
  generatedAt: string;
  invalidGroupSlug: string;
  catalogGroupsProfileStatus: SmokeCatalogGroupsProfileStatus;
  catalogGroupsProfileReason?: string;
  traditionalProfile: TraditionalSmokeProfileFixture;
  catalogGroupsProfile?: CatalogGroupsSmokeProfileFixture | null;
  restaurantProfile: CatalogGroupsSmokeProfileFixture;
}

export const smokeFixtures = fixturesData as SmokeFixtures;

export function getCatalogGroupsProfileFixture(): CatalogGroupsSmokeProfileFixture | null {
  return smokeFixtures.catalogGroupsProfile ?? null;
}

export function getCatalogGroupsProfileSkipReason(): string | null {
  if (smokeFixtures.catalogGroupsProfile) {
    return null;
  }

  return (
    smokeFixtures.catalogGroupsProfileReason ??
    "No hay fixture de CatalogGroups no-restaurante disponible para esta base."
  );
}

export function getTraditionalProfileUrl(slug: string, search = ""): string {
  return `/perfil/${slug}${search}`;
}

export function getProductDetailUrl(slug: string): string {
  return `/producto/${slug}`;
}
