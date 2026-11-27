import {
  assistedBusinessInput,
  normalizeBusinessName,
  demoSnapshotSchema,
} from "./contracts";
const data = {
  operationId: "30cd63b9-5fb2-4f7b-9437-2215d419113f",
  nombre: "Taller Ficticio",
  departamento: "Cundinamarca",
  ciudad: "Bogotá",
  categoriaIds: ["1"],
  seccionIds: ["s4"],
};
describe("assisted input contracts", () => {
  it("does not require or accept owner credentials and personal data", () => {
    expect(assistedBusinessInput.safeParse(data).success).toBe(true);
    for (const key of [
      "email",
      "password",
      "nombrePropietario",
      "apellido",
      "fechaNacimiento",
      "role",
      "estado",
      "usuarioId",
    ])
      expect(
        assistedBusinessInput.safeParse({ ...data, [key]: "injected" }).success,
      ).toBe(false);
  });
  it("uses the actual department/city catalog", () => {
    expect(
      assistedBusinessInput.safeParse({ ...data, ciudad: "Ciudad inventada" })
        .success,
    ).toBe(false);
    expect(
      assistedBusinessInput.safeParse({ ...data, departamento: "Antioquia" })
        .success,
    ).toBe(false);
  });
  it("requires category and section", () => {
    expect(
      assistedBusinessInput.safeParse({ ...data, categoriaIds: [] }).success,
    ).toBe(false);
    expect(
      assistedBusinessInput.safeParse({ ...data, seccionIds: [] }).success,
    ).toBe(false);
  });
  it("normalizes name duplicates across accents, punctuation and whitespace", () =>
    expect(normalizeBusinessName("  CAFÉ - El   Taller! ")).toBe(
      normalizeBusinessName("Cafe el taller"),
    ));
  it("accepts an optional authorized Colombian commercial phone only", () => {
    expect(
      assistedBusinessInput.safeParse({
        ...data,
        telefonoContacto: "+573000000000",
      }).success,
    ).toBe(true);
    expect(
      assistedBusinessInput.safeParse({
        ...data,
        telefonoContacto: "3000000000",
      }).success,
    ).toBe(false);
  });
  it("snapshot projection strips unrelated personal data", () => {
    const result = demoSnapshotSchema.parse({
      version: 1,
      businessId: "b",
      nombre: "Demo",
      descripcion: null,
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      direccion: null,
      telefono: null,
      fotoPerfil: null,
      fotoPortada: null,
      products: [],
      usuario: { contraseña: "not-to-be-shared" },
      email: "not-to-be-shared",
    });
    expect(result).not.toHaveProperty("usuario");
    expect(result).not.toHaveProperty("email");
  });
});
