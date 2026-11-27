/** Numeric API values stay numeric; text uses Colombian grouping or a plain decimal. */
export function parseCopPrice(input: unknown): number {
  let price: number;
  if (typeof input === "number") price = input;
  else if (typeof input === "string") {
    const text = input.trim().replace(/^(?:COP\s*\$?|\$)\s*/i, "");
    let canonical: string;
    if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text))
      canonical = text.replace(/\./g, "").replace(",", ".");
    else if (/^\d+(?:,\d{1,2})?$/.test(text))
      canonical = text.replace(",", ".");
    else if (/^\d+\.\d{1,2}$/.test(text)) canonical = text;
    else throw new Error("Precio COP inválido. Usa 28000 o 28.000,50.");
    price = Number(canonical);
  } else throw new Error("Precio COP inválido.");
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(Math.round(price * 100)) ||
    Math.abs(price * 100 - Math.round(price * 100)) > 0.00001
  )
    throw new Error("Precio COP inválido.");
  return price;
}
