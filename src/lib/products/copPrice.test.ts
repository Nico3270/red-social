import { parseCopPrice } from "./copPrice";

describe("COP prices", () => {
  it.each([
    [28000, 28000],
    ["28000", 28000],
    ["28.000", 28000],
    ["$ 28.000", 28000],
    ["COP 28.000", 28000],
    ["28.000,50", 28000.5],
    ["28000.50", 28000.5],
    ["1.234.567,89", 1234567.89],
    [0, 0],
  ])("parses %p exactly", (input, expected) =>
    expect(parseCopPrice(input)).toBe(expected),
  );
  it.each([
    "28,000",
    "",
    "gratis",
    "1e3",
    "-3",
    "28.00.0",
    "1,234.50",
    "1.234,567",
    NaN,
    Infinity,
    null,
    undefined,
    -1,
    0.001,
    Number.MAX_SAFE_INTEGER,
  ])("rejects %p", (input) => expect(() => parseCopPrice(input)).toThrow());
});
