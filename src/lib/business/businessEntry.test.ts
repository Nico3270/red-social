import {
  BUSINESS_REGISTER_PATH,
  getBusinessEntryDestination,
  internalAuthCallback,
} from "./businessEntry";

describe("public business entry", () => {
  it("starts business registration for visitors", () =>
    expect(getBusinessEntryDestination()).toBe(BUSINESS_REGISTER_PATH));
  it("uses the current account without asking it to register again", () =>
    expect(
      getBusinessEntryDestination({ id: "user-1", perfilCompleto: true }),
    ).toBe("/crear_negocio/user-1"));
  it.each([
    { id: "user-1", hasManagedBusiness: true },
    { id: "user-1", hasManagedBusiness: true, role: "negocio" },
    { id: "user-1", negocioId: "business-1" },
    { id: "user-1", role: "admin" },
  ])(
    "keeps existing owners/restricted businesses/admins in management: %o",
    (user) => expect(getBusinessEntryDestination(user)).toBe("/dashboard"),
  );
  it("resumes incomplete personal details before creating a business", () =>
    expect(
      getBusinessEntryDestination({ id: "user-1", perfilCompleto: false }),
    ).toBe("/dashboard/editar-usuario?negocio=1"));
  it("preserves the existing placeholder route", () =>
    expect(
      getBusinessEntryDestination({
        id: "user-1",
        isPlaceholder: true,
        perfilCompleto: false,
      }),
    ).toBe("/dashboard/editar-perfil"));
  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "/\n/evil",
    null,
  ])("rejects unsafe auth destination %s", (value) =>
    expect(internalAuthCallback(value)).toBe("/"),
  );
  it("preserves ordinary internal callbacks", () =>
    expect(internalAuthCallback("/carro?from=login")).toBe(
      "/carro?from=login",
    ));
  it("preserves NextAuth same-origin absolute callbacks without allowing other origins", () => {
    expect(
      internalAuthCallback(
        "https://myckeo.com/carro?from=login",
        "https://myckeo.com",
      ),
    ).toBe("/carro?from=login");
    expect(
      internalAuthCallback("https://example.com/carro", "https://myckeo.com"),
    ).toBe("/");
  });
});
