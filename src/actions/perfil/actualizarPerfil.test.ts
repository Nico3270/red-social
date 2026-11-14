const mockAuth = jest.fn();
const mockFindBusiness = jest.fn();
const mockFindUser = jest.fn();
const mockBusinessUpdate = jest.fn();
const mockUserUpdate = jest.fn();
const mockCategoryCount = jest.fn();
const mockSectionCount = jest.fn();
const mockTransaction = jest.fn();
const mockRevalidatePath = jest.fn();
const mockRevalidateTag = jest.fn();
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    negocio: { findUnique: mockFindBusiness },
    usuario: { findUnique: mockFindUser },
    category: { count: mockCategoryCount },
    section: { count: mockSectionCount },
    $transaction: mockTransaction,
  },
}));
jest.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
}));

import { actualizarPerfilNegocio } from "./actualizarPerfil";
import { editarPerfilNegocio } from "../auth/editarPerfilNegocio";
import type { InformacionInicialNegocio } from "@/lib/business/profileEditor";

const fixture: InformacionInicialNegocio = {
  nombreNegocio: "Negocio ficticio",
  slugNegocio: "negocio-ficticio",
  descripcionNegocio: "Descripción",
  telefonoNegocio: "+573001234567",
  ciudadNegocio: "Medellín",
  departamentoNegocio: "Antioquia",
  direccionNegocio: "Calle 10",
  imagenPerfil: "https://example.com/perfil.png",
  imagenPortada: "https://example.com/portada.png",
  sitioWeb: "https://example.com",
  instagram: "https://instagram.com/ficticio",
  urlGoogleMaps: "https://www.google.com/maps?q=6.24,-75.58",
  latitudNegocio: 6.24,
  longitudNegocio: -75.58,
  categoriaIds: ["c1"],
  seccionesIds: ["s1"],
  estadoNegocio: "activo",
};
let stored: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "owner" } });
  stored = {
    id: "business",
    usuarioId: "owner",
    nombre: fixture.nombreNegocio,
    slug: fixture.slugNegocio,
    descripcion: fixture.descripcionNegocio,
    telefonoContacto: fixture.telefonoNegocio,
    ciudad: fixture.ciudadNegocio,
    departamento: fixture.departamentoNegocio,
    direccion: fixture.direccionNegocio,
    latitud: fixture.latitudNegocio,
    longitud: fixture.longitudNegocio,
    urlGoogleMaps: fixture.urlGoogleMaps,
    fotoPerfil: fixture.imagenPerfil,
    fotoPortada: fixture.imagenPortada,
    sitioWeb: fixture.sitioWeb,
    estado: "activo",
    categorias: [{ categoryId: "c1" }],
    secciones: [{ sectionId: "s1", prioridad: 7 }],
  };
  mockFindBusiness.mockImplementation(async () => ({ ...stored }));
  mockFindUser.mockImplementation(async () => ({
    instagram: fixture.instagram,
    negocio: { ...stored },
  }));
  mockCategoryCount.mockResolvedValue(1);
  mockSectionCount.mockResolvedValue(1);
  mockBusinessUpdate.mockImplementation(async ({ data }) => {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) stored[key] = value;
    });
    return { ...stored };
  });
  mockUserUpdate.mockResolvedValue({});
  mockTransaction.mockImplementation(async (work) =>
    work({
      negocio: { update: mockBusinessUpdate },
      usuario: { update: mockUserUpdate },
    }),
  );
});

describe("persistencia segura de editar-perfil (Prisma simulado)", () => {
  it("guarda y vuelve a cargar la ubicación exacta sin intercambiar latitud y longitud", async () => {
    const result = await actualizarPerfilNegocio("owner", {
      ...fixture,
      latitudNegocio: 4.65,
      longitudNegocio: -74.05,
    });
    expect(result.ok).toBe(true);
    const reload = await editarPerfilNegocio("owner");
    expect(reload.negocio).toMatchObject({
      latitudNegocio: 4.65,
      longitudNegocio: -74.05,
      urlGoogleMaps: "https://www.google.com/maps?q=4.65,-74.05",
    });
    expect(mockBusinessUpdate.mock.calls[0][0].data).toMatchObject({
      telefonoContacto: fixture.telefonoNegocio,
      direccion: fixture.direccionNegocio,
      fotoPerfil: fixture.imagenPerfil,
      fotoPortada: fixture.imagenPortada,
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "owner" },
      data: expect.objectContaining({ instagram: fixture.instagram }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/editar-perfil");
  });
  it("no reescribe coordenadas ni relaciones sin cambios y conserva la prioridad de secciones", async () => {
    expect((await actualizarPerfilNegocio("owner", fixture)).ok).toBe(true);
    const data = mockBusinessUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("latitud");
    expect(data).not.toHaveProperty("longitud");
    expect(data).not.toHaveProperty("categorias");
    expect(data).not.toHaveProperty("secciones");
    expect(stored.secciones).toEqual([{ sectionId: "s1", prioridad: 7 }]);
  });
  it.each([null, undefined])(
    "omitir la ubicación (%s) no borra coordenadas previas",
    async (value) => {
      expect(
        (
          await actualizarPerfilNegocio("owner", {
            ...fixture,
            latitudNegocio: value,
            longitudNegocio: value,
            descripcionNegocio: "Otra descripción",
          })
        ).ok,
      ).toBe(true);
      expect((await editarPerfilNegocio("owner")).negocio).toMatchObject({
        latitudNegocio: 6.24,
        longitudNegocio: -75.58,
      });
    },
  );
  it("mantiene ausencia real al guardar otro campo y recargar un negocio sin ubicación", async () => {
    stored.latitud = null;
    stored.longitud = null;
    const loaded = await editarPerfilNegocio("owner");
    expect(loaded.negocio).toMatchObject({
      latitudNegocio: null,
      longitudNegocio: null,
    });
    await actualizarPerfilNegocio("owner", {
      ...fixture,
      latitudNegocio: null,
      longitudNegocio: null,
    });
    expect((await editarPerfilNegocio("owner")).negocio).toMatchObject({
      latitudNegocio: null,
      longitudNegocio: null,
    });
  });
  it("conserva cero al guardar y cargar, incluyendo el enlace generado", async () => {
    await actualizarPerfilNegocio("owner", {
      ...fixture,
      latitudNegocio: 0,
      longitudNegocio: 0,
    });
    expect((await editarPerfilNegocio("owner")).negocio).toMatchObject({
      latitudNegocio: 0,
      longitudNegocio: 0,
      urlGoogleMaps: "https://www.google.com/maps?q=0,0",
    });
  });
  it.each([
    { latitudNegocio: NaN },
    { longitudNegocio: Infinity },
    { latitudNegocio: 91 },
    { longitudNegocio: -181 },
    { latitudNegocio: null },
    { categoriaIds: [] },
    { facebook: "https://facebook.com.evil.example/u" },
  ])("rechaza datos inválidos antes de escribir %j", async (change) => {
    expect(
      (await actualizarPerfilNegocio("owner", { ...fixture, ...change })).ok,
    ).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
  it("no borra campos opcionales omitidos; permite vaciarlos explícitamente", async () => {
    await actualizarPerfilNegocio("owner", {
      ...fixture,
      imagenPerfil: undefined,
      sitioWeb: undefined,
      direccionNegocio: undefined,
      instagram: undefined,
    });
    expect(stored).toMatchObject({
      fotoPerfil: fixture.imagenPerfil,
      sitioWeb: fixture.sitioWeb,
      direccion: fixture.direccionNegocio,
    });
    expect(mockUserUpdate.mock.calls[0][0].data.instagram).toBeUndefined();
    await actualizarPerfilNegocio("owner", {
      ...fixture,
      imagenPerfil: "",
      sitioWeb: "",
      direccionNegocio: "",
      instagram: "",
    });
    expect(stored).toMatchObject({
      fotoPerfil: null,
      sitioWeb: null,
      direccion: null,
    });
    expect(mockUserUpdate.mock.calls[1][0].data.instagram).toBeNull();
  });
  it("rechaza sesión caducada y usuario ajeno tanto al leer como al escribir", async () => {
    mockAuth.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect((await actualizarPerfilNegocio("owner", fixture)).ok).toBe(false);
    expect((await editarPerfilNegocio("owner")).ok).toBe(false);
    expect((await actualizarPerfilNegocio("other", fixture)).ok).toBe(false);
    expect((await editarPerfilNegocio("other")).ok).toBe(false);
    expect(mockFindBusiness).not.toHaveBeenCalled();
    expect(mockFindUser).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
  it("rechaza idNegocio que pertenece a otro dueño", async () => {
    mockFindBusiness.mockResolvedValueOnce({ ...stored, usuarioId: "other" });
    expect(
      (
        await actualizarPerfilNegocio("owner", {
          ...fixture,
          idNegocio: "foreign",
        })
      ).ok,
    ).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
  it("no acepta cambiar el estado operativo desde el perfil", async () => {
    await actualizarPerfilNegocio("owner", {
      ...fixture,
      estadoNegocio: "suspendido",
    });
    expect(mockBusinessUpdate.mock.calls[0][0].data).not.toHaveProperty(
      "estado",
    );
  });
  it("devuelve un fallo recuperable sin éxito ante error de persistencia", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    mockTransaction.mockRejectedValueOnce(
      new Error("db-unavailable-sensitive-detail"),
    );
    expect(await actualizarPerfilNegocio("owner", fixture)).toEqual({
      ok: false,
      message: expect.stringContaining("Tus datos siguen en el formulario"),
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    error.mockRestore();
  });
  it("rechaza negocio inexistente y slug en uso", async () => {
    mockFindBusiness.mockResolvedValueOnce(null);
    expect((await actualizarPerfilNegocio("owner", fixture)).ok).toBe(false);
    mockFindBusiness
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce({ id: "different" });
    expect(
      (
        await actualizarPerfilNegocio("owner", {
          ...fixture,
          slugNegocio: "otra-tienda",
        })
      ).ok,
    ).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
  it.each(["category", "section"])("rechaza %s inexistente", async (entity) => {
    if (entity === "category") mockCategoryCount.mockResolvedValueOnce(0);
    else mockSectionCount.mockResolvedValueOnce(0);
    expect((await actualizarPerfilNegocio("owner", fixture)).ok).toBe(false);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
