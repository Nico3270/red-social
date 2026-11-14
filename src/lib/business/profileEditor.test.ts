import {
  profileEditorSchema,
  validProfileUrl,
  SOCIAL_HOSTS,
} from "./profileEditor";

export const profileFixture = {
  nombreNegocio: "Negocio ficticio",
  slugNegocio: "negocio-ficticio",
  descripcionNegocio: "Descripción de prueba",
  telefonoNegocio: "+573001234567",
  telefonoContacto: "+573001234567",
  ciudadNegocio: "Medellín",
  departamentoNegocio: "Antioquia",
  direccionNegocio: "Calle 10 # 20-30",
  latitudNegocio: 6.24,
  longitudNegocio: -75.58,
  categoriaIds: ["category-1"],
  seccionesIds: ["section-1"],
  estadoNegocio: "activo" as const,
};

describe("validación del editor de perfil", () => {
  it("acepta el contrato y campos opcionales vacíos", () => {
    expect(
      profileEditorSchema.safeParse({
        ...profileFixture,
        facebook: "",
        sitioWeb: "",
        urlGoogleMaps: "",
      }).success,
    ).toBe(true);
  });
  it.each([
    [null, null],
    [undefined, undefined],
    [0, 0],
  ])(
    "acepta ausencia o cero válidos %s/%s",
    (latitudNegocio, longitudNegocio) => {
      expect(
        profileEditorSchema.safeParse({
          ...profileFixture,
          latitudNegocio,
          longitudNegocio,
        }).success,
      ).toBe(true);
    },
  );
  it.each([
    [null, 0],
    [4, null],
    [NaN, 3],
    [Infinity, 3],
    [0, 181],
    [91, 0],
    ["4.7", "-74"],
  ])("rechaza par inválido %s/%s", (latitudNegocio, longitudNegocio) => {
    expect(
      profileEditorSchema.safeParse({
        ...profileFixture,
        latitudNegocio,
        longitudNegocio,
      }).success,
    ).toBe(false);
  });
  it.each([
    { nombreNegocio: " " },
    { slugNegocio: "MAL!" },
    { descripcionNegocio: "" },
    { telefonoNegocio: "123" },
    { categoriaIds: [] },
    { seccionesIds: [] },
    { categoriaIds: ["category-1", "category-1"] },
    { ciudadNegocio: "Tunja" },
    { facebook: "javascript:alert(1)" },
    { instagram: "https://instagram.com.evil.example/perfil" },
  ])("rechaza datos inválidos %j", (change) => {
    expect(
      profileEditorSchema.safeParse({ ...profileFixture, ...change }).success,
    ).toBe(false);
  });
  it.each(["https://x.com/myckeo", "https://www.twitter.com/myckeo"])(
    "acepta enlaces de X y Twitter %s",
    (url) => {
      expect(validProfileUrl(url, SOCIAL_HOSTS.twitter)).toBe(true);
    },
  );
  it.each([
    "https://example.com",
    "example.com",
    "http://example.com/path?q=test",
    "",
  ])("conserva formatos existentes del sitio web %s", (url) => {
    expect(validProfileUrl(url)).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "https://example.com@evil.com/x",
    "https://example.com.evil.com/x",
    "no-url",
  ])("rechaza URL social inválida %s", (url) => {
    expect(validProfileUrl(url, ["example.com"])).toBe(false);
  });
});
