import { initialData } from "@/seed/seed";

export function normalizeSectionSlugForUrl(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "");
}

export function resolveSectionSlugToId(sectionSlug?: string | null): string | null {
  if (!sectionSlug) {
    return null;
  }

  const normalizedSectionSlug = normalizeSectionSlugForUrl(sectionSlug);
  const section = initialData.secciones.find(
    (candidate) => normalizeSectionSlugForUrl(candidate.slug) === normalizedSectionSlug
  );

  return section?.id ?? null;
}

export function resolveSectionIdToSlug(sectionId?: string | null): string | null {
  if (!sectionId) {
    return null;
  }

  const section = initialData.secciones.find((candidate) => candidate.id === sectionId);
  return section?.slug ?? null;
}