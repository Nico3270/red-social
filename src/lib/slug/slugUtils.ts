const DEFAULT_SUFFIX_LENGTH = 4;
const SHORT_SUFFIX_PATTERN = /-[a-z0-9]{4}$/;

export function normalizeUrlSlug(value: string, maxLength = 140) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-$/g, "");
}

export function hasShortSlugSuffix(value: string) {
  return SHORT_SUFFIX_PATTERN.test(value);
}

export function generateShortSlugSuffix(length = DEFAULT_SUFFIX_LENGTH) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const cryptoSource =
    typeof globalThis.crypto !== "undefined" ? globalThis.crypto : null;
  const bytes = new Uint8Array(length);

  if (cryptoSource?.getRandomValues) {
    cryptoSource.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function buildSlugBase(
  preferredValue: string,
  fallbackValue: string,
  maxLength = 140,
) {
  const normalizedPreferred = normalizeUrlSlug(preferredValue, maxLength);
  if (normalizedPreferred) return normalizedPreferred;

  return normalizeUrlSlug(fallbackValue, maxLength);
}

export function withShortSlugSuffix(baseSlug: string, maxLength = 140) {
  const normalizedBase = normalizeUrlSlug(baseSlug, maxLength);

  if (!normalizedBase) return "";
  if (hasShortSlugSuffix(normalizedBase)) return normalizedBase;

  const suffix = generateShortSlugSuffix();
  const maxBaseLength = Math.max(1, maxLength - suffix.length - 1);
  const trimmedBase = normalizeUrlSlug(normalizedBase, maxBaseLength);

  return `${trimmedBase}-${suffix}`;
}
