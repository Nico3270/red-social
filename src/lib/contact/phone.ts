/**
 * Canonical international form, including `+` so normalization is idempotent
 * even for international numbers that happen to contain ten digits.
 * Only infer Colombia for a national number when the caller explicitly opts in.
 * This checks shape, not whether a number is assigned or registered on WhatsApp.
 */
export function normalizeContactPhone(
  value?: string | null,
  defaultCountry?: "CO",
): string | null {
  const raw = value?.trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return null;

  const digits = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;

  if (!raw.startsWith("+") && digits.length === 10) {
    return defaultCountry === "CO" ? `+57${digits}` : null;
  }

  return `+${digits}`;
}

/** Digits required by wa.me, derived from the canonical phone representation. */
export function toWhatsAppNumber(
  value?: string | null,
  defaultCountry?: "CO",
): string {
  return normalizeContactPhone(value, defaultCountry)?.slice(1) ?? "";
}
