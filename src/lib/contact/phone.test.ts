import { normalizeContactPhone, toWhatsAppNumber } from "./phone";

describe("public business contact numbers", () => {
  it.each([
    ["3182293083", "+573182293083"],
    ["(318) 229-30.83", "+573182293083"],
    ["573182293083", "+573182293083"],
    ["+57 318 229 3083", "+573182293083"],
    ["  +57 (318) 229-3083  ", "+573182293083"],
    ["+1 (202) 555-0123", "+12025550123"],
    ["12025550123", "+12025550123"],
    ["+34 612 345 678", "+34612345678"],
    ["34612345678", "+34612345678"],
    ["+57 601 234 5678", "+576012345678"],
    // Explicit international ten-digit number must never be reinterpreted as CO.
    ["+3312345678", "+3312345678"],
  ])("normalizes %s without duplicating the country code", (input, expected) => {
    const canonical = normalizeContactPhone(input, "CO");
    expect(canonical).toBe(expected);
    expect(normalizeContactPhone(canonical, "CO")).toBe(canonical);
    expect(toWhatsAppNumber(input, "CO")).toBe(expected.slice(1));
  });

  it("requires an explicit default country for national numbers", () => {
    expect(normalizeContactPhone("3182293083")).toBeNull();
    expect(toWhatsAppNumber("3182293083")).toBe("");
    expect(normalizeContactPhone("+573182293083")).toBe("+573182293083");
  });

  it.each([null, undefined, "", "  ", "---", "123", "0000000000", "1234567890123456", "318ABC2293083", "57+3182293083", "+57 3182293083 ext 2"])("omits malformed or absent contact %s", (input) => {
    expect(normalizeContactPhone(input, "CO")).toBeNull();
    expect(toWhatsAppNumber(input, "CO")).toBe("");
  });

  it("preserves an already encoded contextual message when composing the URL", () => {
    const text = "¡Hola! *Café & pan*\nPrecio: $ 23.000\nVariante: Grande\nhttps://myckeo.com/producto/cafe";
    const message = encodeURIComponent(text);
    const url = new URL(`https://wa.me/${toWhatsAppNumber("+57 3182293083", "CO")}?text=${message}`);
    expect(url.pathname).toBe("/573182293083");
    expect(url.searchParams.get("text")).toBe(text);
  });
});
