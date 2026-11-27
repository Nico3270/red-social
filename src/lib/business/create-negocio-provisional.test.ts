jest.mock("server-only", () => ({}), { virtual: true });
const mockUser = jest.fn(),
  mockBusiness = jest.fn(),
  mockCategories = jest.fn(),
  mockSections = jest.fn();
const mockCreate = jest.fn(),
  mockUpdate = jest.fn(),
  mockCategoryLinks = jest.fn(),
  mockSectionLinks = jest.fn(),
  mockCurrent = jest.fn(),
  mockLock = jest.fn();
const mockTx = {
  $queryRaw: mockLock,
  usuario: { findUnique: mockCurrent, update: mockUpdate },
  negocio: { create: mockCreate },
  negocioCategory: { createMany: mockCategoryLinks },
  negocioSection: { createMany: mockSectionLinks },
};
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      usuario: { findUnique: mockUser },
      negocio: { findUnique: mockBusiness },
      category: { findMany: mockCategories },
      section: { findMany: mockSections },
      $transaction: (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
    },
  }),
  { virtual: true },
);
import { createNegocioCore } from "./create-negocio-core";
const input = {
  usuarioId: "pending-user",
  nombre: "Ensayo ficticio",
  descripcion: "Información autorizada de prueba",
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  direccion: "",
  telefonoContacto: null,
  categoriaIds: ["c"],
  seccionIds: ["s"],
  prepararOculto: true,
};
describe("provisional creation compatibility", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUser.mockResolvedValue({ id: "pending-user", isPlaceholder: true });
    mockBusiness.mockResolvedValue(null);
    mockCategories.mockResolvedValue([{ id: "c", isActive: true }]);
    mockSections.mockResolvedValue([
      { id: "s", isActive: true, categoryId: "c" },
    ]);
    mockCurrent.mockResolvedValue({ isPlaceholder: true, estado: "activo" });
    mockCreate.mockResolvedValue({
      id: "b",
      slug: "ficticio",
      usuarioId: "pending-user",
    });
  });
  it("writes a suspended business from the first insert and leaves placeholder flags untouched", async () => {
    expect((await createNegocioCore(input)).ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.estado).toBe("suspendido");
    expect(mockUpdate.mock.calls[0][0].data).toEqual({ role: "negocio" });
    expect(mockLock).toHaveBeenCalledTimes(1);
  });
  it("conventional registration still inserts an active business", async () => {
    expect(
      (await createNegocioCore({ ...input, prepararOculto: undefined })).ok,
    ).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.estado).toBe("activo");
    expect(mockLock).not.toHaveBeenCalled();
  });
  it("cannot prepare a verified existing user", async () => {
    mockUser.mockResolvedValue({ id: "pending-user", isPlaceholder: false });
    expect((await createNegocioCore(input)).ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it("rechecks the placeholder after locking its identity", async () => {
    mockCurrent.mockResolvedValue({ isPlaceholder: false, estado: "activo" });
    expect((await createNegocioCore(input)).ok).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it.each(["activo", "eliminado"])(
    "does not overwrite or reactivate an existing %s business",
    async (estado) => {
      mockBusiness.mockResolvedValue({
        id: "b",
        slug: "b",
        usuarioId: "pending-user",
        estado,
      });
      expect((await createNegocioCore(input)).ok).toBe(false);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    },
  );
  it("reuses a suspended business without writing fields", async () => {
    mockBusiness.mockResolvedValue({
      id: "b",
      slug: "b",
      usuarioId: "pending-user",
      estado: "suspendido",
    });
    expect(await createNegocioCore(input)).toMatchObject({
      ok: true,
      status: "ALREADY_CREATED",
      negocioId: "b",
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it.each(["inactive-category", "inactive-section", "wrong-category"])(
    "rejects %s before creation",
    async (mode) => {
      if (mode === "inactive-category")
        mockCategories.mockResolvedValue([{ id: "c", isActive: false }]);
      else
        mockSections.mockResolvedValue([
          {
            id: "s",
            isActive: mode !== "inactive-section",
            categoryId: mode === "wrong-category" ? "other" : "c",
          },
        ]);
      expect((await createNegocioCore(input)).ok).toBe(false);
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );
  it("returns controlled failure when a relationship write fails", async () => {
    mockSectionLinks.mockRejectedValue(
      new Error("synthetic relationship failure"),
    );
    expect((await createNegocioCore(input)).ok).toBe(false);
  });
});
