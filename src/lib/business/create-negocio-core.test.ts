import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockUsuarioFindUnique = jest.fn();
const mockNegocioFindUnique = jest.fn();
const mockCategoryFindMany = jest.fn();
const mockSectionFindMany = jest.fn();
const mockTransaction = jest.fn();

const mockTxNegocioCreate = jest.fn();
const mockTxUsuarioUpdate = jest.fn();
const mockTxNegocioCategoryCreateMany = jest.fn();
const mockTxNegocioSectionCreateMany = jest.fn();

const mockTx = {
  negocio: { create: mockTxNegocioCreate },
  usuario: { update: mockTxUsuarioUpdate },
  negocioCategory: { createMany: mockTxNegocioCategoryCreateMany },
  negocioSection: { createMany: mockTxNegocioSectionCreateMany },
};

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      usuario: { findUnique: mockUsuarioFindUnique },
      negocio: { findUnique: mockNegocioFindUnique },
      category: { findMany: mockCategoryFindMany },
      section: { findMany: mockSectionFindMany },
      $transaction: mockTransaction,
    },
  }),
  { virtual: true },
);

import {
  createNegocioCore,
  type CreateNegocioCoreInput,
} from "./create-negocio-core";

const validInput: CreateNegocioCoreInput = {
  usuarioId: "usuario-1",
  nombre: "Panadería Central",
  descripcion: "Pan artesanal",
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  direccion: "Calle 1 # 2-3",
  telefonoContacto: "+573001234567",
  categoriaIds: ["categoria-1", "categoria-2"],
  seccionIds: ["seccion-1", "seccion-2"],
};

describe("createNegocioCore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuarioFindUnique.mockResolvedValue({ id: validInput.usuarioId });
    mockNegocioFindUnique.mockResolvedValue(null);
    mockCategoryFindMany.mockResolvedValue(
      validInput.categoriaIds.map((id) => ({ id })),
    );
    mockSectionFindMany.mockResolvedValue(
      validInput.seccionIds.map((id) => ({ id })),
    );
    mockTxNegocioCreate.mockResolvedValue({
      id: "negocio-1",
      slug: "panaderia-central-bogota-abcd",
    });
    mockTxUsuarioUpdate.mockResolvedValue({ id: validInput.usuarioId });
    mockTxNegocioCategoryCreateMany.mockResolvedValue({ count: 2 });
    mockTxNegocioSectionCreateMany.mockResolvedValue({ count: 2 });
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
        callback(mockTx),
    );
  });

  it("crea el negocio y conserva el contrato de éxito", async () => {
    const result = await createNegocioCore(validInput);

    expect(result).toEqual({
      ok: true,
      message: "Negocio creado exitosamente.",
      negocioId: "negocio-1",
      slugNegocio: expect.stringMatching(/^panaderia-central-bogota-/),
    });
    expect(mockTxNegocioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: validInput.nombre,
        descripcion: validInput.descripcion,
        ciudad: validInput.ciudad,
        departamento: validInput.departamento,
        direccion: validInput.direccion,
        telefonoContacto: validInput.telefonoContacto,
        usuarioId: validInput.usuarioId,
        imagenes: [],
      }),
    });
  });

  it("bloquea cuando faltan datos obligatorios", async () => {
    const result = await createNegocioCore({ ...validInput, nombre: "" });

    expect(result).toEqual({
      ok: false,
      message: "Faltan datos obligatorios.",
      negocioId: "",
      slugNegocio: "",
    });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bloquea cuando falta usuarioId", async () => {
    const result = await createNegocioCore({ ...validInput, usuarioId: "" });

    expect(result.message).toBe("El ID del usuario es obligatorio.");
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bloquea un usuario inexistente sin escrituras", async () => {
    mockUsuarioFindUnique.mockResolvedValueOnce(null);

    const result = await createNegocioCore(validInput);

    expect(mockUsuarioFindUnique).toHaveBeenCalledWith({
      where: { id: validInput.usuarioId },
    });
    expect(result.message).toBe("El usuario especificado no existe.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bloquea un usuario que ya tiene negocio", async () => {
    mockNegocioFindUnique.mockResolvedValueOnce({ id: "negocio-existente" });

    const result = await createNegocioCore(validInput);

    expect(mockNegocioFindUnique).toHaveBeenCalledWith({
      where: { usuarioId: validInput.usuarioId },
    });
    expect(result.message).toBe("El usuario ya tiene un negocio asociado.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bloquea una categoría inexistente antes de la transacción", async () => {
    mockCategoryFindMany.mockResolvedValueOnce([{ id: "categoria-1" }]);

    const result = await createNegocioCore(validInput);

    expect(mockCategoryFindMany).toHaveBeenCalledWith({
      where: { id: { in: validInput.categoriaIds } },
    });
    expect(result.message).toBe("Una o más categorías no existen.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bloquea una sección inexistente antes de la transacción", async () => {
    mockSectionFindMany.mockResolvedValueOnce([{ id: "seccion-1" }]);

    const result = await createNegocioCore(validInput);

    expect(mockSectionFindMany).toHaveBeenCalledWith({
      where: { id: { in: validInput.seccionIds } },
    });
    expect(result.message).toBe("Una o más secciones no existen.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("incluye creación, role, categorías y secciones en una sola transacción", async () => {
    await createNegocioCore(validInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxUsuarioUpdate).toHaveBeenCalledWith({
      where: { id: validInput.usuarioId },
      data: { role: "negocio" },
    });
    expect(mockTxNegocioCategoryCreateMany).toHaveBeenCalledWith({
      data: validInput.categoriaIds.map((categoryId) => ({
        negocioId: "negocio-1",
        categoryId,
      })),
    });
    expect(mockTxNegocioSectionCreateMany).toHaveBeenCalledWith({
      data: validInput.seccionIds.map((sectionId) => ({
        negocioId: "negocio-1",
        sectionId,
        prioridad: 0,
      })),
    });
  });

  it("preserva la generación y resolución de colisiones del slug", async () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456);
    const randomId = (0.123456).toString(36).substring(2, 6);
    mockNegocioFindUnique.mockImplementation(({ where }) => {
      if (where.usuarioId) return Promise.resolve(null);
      if (where.slug === `panaderia-central-bogota-${randomId}`) {
        return Promise.resolve({ id: "colision" });
      }
      return Promise.resolve(null);
    });

    await createNegocioCore(validInput);

    expect(mockTxNegocioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: `panaderia-central-bogota-${randomId}-1`,
      }),
    });
    randomSpy.mockRestore();
  });

  it("devuelve el error genérico sin continuar escrituras ante un fallo transaccional", async () => {
    mockTxNegocioCreate.mockRejectedValueOnce(new Error("fallo de prueba"));

    const result = await createNegocioCore(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Error al crear el negocio.",
      negocioId: "",
      slugNegocio: "",
    });
    expect(mockTxUsuarioUpdate).not.toHaveBeenCalled();
    expect(mockTxNegocioCategoryCreateMany).not.toHaveBeenCalled();
    expect(mockTxNegocioSectionCreateMany).not.toHaveBeenCalled();
  });

  it("es una primitive server-only sin autoridad, transporte ni FormData", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/business/create-negocio-core.ts"),
      "utf8",
    );

    expect(source).toContain('import "server-only";');
    expect(source).not.toMatch(/["']use server["']/);
    expect(source).not.toMatch(/\bFormData\b/);
    expect(source).not.toMatch(/\bauth\s*\(/);
    expect(source).not.toMatch(/\bsession\b/i);
    expect(source).not.toContain("MYCKEO_ADMIN_KEY");
    expect(source).not.toContain("x-api-key");
    expect(source).not.toMatch(/\bNextResponse\b/);
    expect(source).not.toMatch(/\bRequest\b/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/console\./);
  });
});
