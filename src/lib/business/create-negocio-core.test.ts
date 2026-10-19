import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";

const mockUsuarioFindUnique = jest.fn();
const mockNegocioFindUnique = jest.fn();
const mockCategoryFindMany = jest.fn();
const mockSectionFindMany = jest.fn();
const mockTransaction = jest.fn();
const mockNegocioUpdate = jest.fn();
const mockUsuarioCreate = jest.fn();
const mockRootNegocioCreate = jest.fn();
const mockRootUsuarioUpdate = jest.fn();
const mockRootCategoryCreateMany = jest.fn();
const mockRootSectionCreateMany = jest.fn();

const mockTxNegocioCreate = jest.fn();
const mockTxUsuarioUpdate = jest.fn();
const mockTxNegocioCategoryCreateMany = jest.fn();
const mockTxNegocioSectionCreateMany = jest.fn();

const mockTx = {
  negocio: { create: mockTxNegocioCreate, update: mockNegocioUpdate },
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
      usuario: {
        findUnique: mockUsuarioFindUnique,
        create: mockUsuarioCreate,
        update: mockRootUsuarioUpdate,
      },
      negocio: {
        findUnique: mockNegocioFindUnique,
        create: mockRootNegocioCreate,
        update: mockNegocioUpdate,
      },
      negocioCategory: { createMany: mockRootCategoryCreateMany },
      negocioSection: { createMany: mockRootSectionCreateMany },
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

    // Conserva los campos consumidos hoy; el nuevo resultado añade status/negocio.
    expect(result).toMatchObject({
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

  it("recupera un usuario que ya tiene negocio como ALREADY_CREATED", async () => {
    const existente = {
      id: "negocio-existente",
      slug: "negocio-existente",
      usuarioId: validInput.usuarioId,
    };
    mockNegocioFindUnique.mockResolvedValueOnce(existente);

    const result = await createNegocioCore(validInput);

    expect(mockNegocioFindUnique).toHaveBeenCalledWith({
      where: { usuarioId: validInput.usuarioId },
    });
    expect(result).toMatchObject({
      ok: true,
      status: "ALREADY_CREATED",
      negocio: existente,
      negocioId: existente.id,
      slugNegocio: existente.slug,
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
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


// Contrato nuevo: identidad local = usuarioId. No introduce la identidad del
// prospecto administrativo. Los tipos temporales viven únicamente en este test.
// status/negocio amplían los campos legacy para conservar los callers actuales.
type PublicOpeningHours = {
  timezone: string | null;
  days: Array<{
    day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    closed: boolean;
    intervals: Array<{ opensAt: string; closesAt: string; closesNextDay: boolean }>;
  }>;
};
type ConfirmedCoreInput = CreateNegocioCoreInput & {
  sitioWeb: string | null;
  horarios: PublicOpeningHours | null;
};

function confirmedInput(): ConfirmedCoreInput {
  return {
    ...validInput,
    nombre: "Restaurante Confirmado",
    ciudad: "Tunja",
    departamento: "Boyacá",
    sitioWeb: "https://confirmado.example.test",
    horarios: {
      timezone: null,
      days: [
        { day: 1, closed: false, intervals: [
          { opensAt: "08:00", closesAt: "12:00", closesNextDay: false },
          { opensAt: "14:00", closesAt: "18:00", closesNextDay: false },
        ] },
        { day: 6, closed: false, intervals: [
          { opensAt: "18:00", closesAt: "02:00", closesNextDay: true },
        ] },
        { day: 7, closed: true, intervals: [] },
      ],
    },
  };
}

function uniqueConflict(target: string[] | string, modelName = "Negocio") {
  return new Prisma.PrismaClientKnownRequestError("conflicto de fixture", {
    code: "P2002", clientVersion: "test", meta: { modelName, target },
  });
}

const existingBusiness = {
  id: "negocio-existente",
  slug: "restaurante-a-tunja",
  usuarioId: validInput.usuarioId,
  nombre: "Restaurante A",
  ciudad: "Tunja",
  departamento: "Boyacá",
  sitioWeb: "https://existente.example.test",
  horarios: null,
};

function expectIdentity(
  result: unknown,
  status: "CREATED" | "ALREADY_CREATED",
  negocio: { id: string; slug: string; usuarioId: string },
) {
  expect(result).toMatchObject({
    ok: true, status,
    negocio: { id: negocio.id, slug: negocio.slug, usuarioId: negocio.usuarioId },
    negocioId: negocio.id,
    slugNegocio: negocio.slug,
  });
}

function expectNoWritesOutsideTransaction() {
  expect(mockRootNegocioCreate).not.toHaveBeenCalled();
  expect(mockRootUsuarioUpdate).not.toHaveBeenCalled();
  expect(mockRootCategoryCreateMany).not.toHaveBeenCalled();
  expect(mockRootSectionCreateMany).not.toHaveBeenCalled();
  expect(mockUsuarioCreate).not.toHaveBeenCalled();
}

function expectRecoveryWithoutMutation() {
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockTxNegocioCreate).not.toHaveBeenCalled();
  expect(mockTxUsuarioUpdate).not.toHaveBeenCalled();
  expect(mockTxNegocioCategoryCreateMany).not.toHaveBeenCalled();
  expect(mockTxNegocioSectionCreateMany).not.toHaveBeenCalled();
  expect(mockNegocioUpdate).not.toHaveBeenCalled();
  expectNoWritesOutsideTransaction();
}

function expectCreationError(result: unknown) {
  expect(result).toMatchObject({ ok: false, negocioId: "", slugNegocio: "" });
  expect(result).not.toHaveProperty("status", "CREATED");
  expect(result).not.toHaveProperty("status", "ALREADY_CREATED");
  expect(result).not.toHaveProperty("negocio");
}

describe("createNegocioCore: contrato confirmado e idempotencia local", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUsuarioFindUnique.mockResolvedValue({ id: validInput.usuarioId });
    mockNegocioFindUnique.mockResolvedValue(null);
    mockCategoryFindMany.mockResolvedValue(validInput.categoriaIds.map((id) => ({ id })));
    mockSectionFindMany.mockResolvedValue(validInput.seccionIds.map((id) => ({ id })));
    mockTxNegocioCreate.mockImplementation(async ({ data }) => ({ id: "negocio-nuevo", ...data }));
    mockTxUsuarioUpdate.mockResolvedValue({ id: validInput.usuarioId });
    mockTxNegocioCategoryCreateMany.mockResolvedValue({ count: 2 });
    mockTxNegocioSectionCreateMany.mockResolvedValue({ count: 2 });
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("devuelve CREATED con la identidad realmente creada y conserva atomicidad", async () => {
    const input = confirmedInput();
    const result = await createNegocioCore(input);
    const data = mockTxNegocioCreate.mock.calls[0][0].data;
    expectIdentity(result, "CREATED", { id: "negocio-nuevo", slug: data.slug, usuarioId: input.usuarioId });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
    expect(mockTxUsuarioUpdate).toHaveBeenCalledWith({ where: { id: input.usuarioId }, data: { role: "negocio" } });
    expect(mockTxNegocioCategoryCreateMany).toHaveBeenCalledWith({ data: input.categoriaIds.map((categoryId) => ({ negocioId: "negocio-nuevo", categoryId })) });
    expect(mockTxNegocioSectionCreateMany).toHaveBeenCalledWith({ data: input.seccionIds.map((sectionId) => ({ negocioId: "negocio-nuevo", sectionId, prioridad: 0 })) });
    expectNoWritesOutsideTransaction();
  });

  it("recupera por usuarioId sin crear, editar ni volver a escribir relaciones", async () => {
    mockNegocioFindUnique.mockResolvedValueOnce(existingBusiness);
    const result = await createNegocioCore(confirmedInput());
    expectIdentity(result, "ALREADY_CREATED", existingBusiness);
    expect(mockNegocioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockNegocioFindUnique).toHaveBeenCalledWith({ where: { usuarioId: validInput.usuarioId } });
    expectRecoveryWithoutMutation();
  });

  it("payload diferente en retry no sobrescribe nombre, ubicación, website ni horarios", async () => {
    const stored = structuredClone(existingBusiness);
    mockNegocioFindUnique.mockResolvedValue(stored);
    const input = { ...confirmedInput(), nombre: "Restaurante B", ciudad: "Cali", departamento: "Valle del Cauca", sitioWeb: null };
    const before = structuredClone(input);
    expectIdentity(await createNegocioCore(input), "ALREADY_CREATED", existingBusiness);
    expect(stored).toEqual(existingBusiness);
    expect(input).toEqual(before);
    expectRecoveryWithoutMutation();
  });

  it("un slug ocupado por otro usuario no acredita ALREADY_CREATED", async () => {
    // El core no recibe slug: se provoca colisión de su slug generado.
    jest.spyOn(Math, "random").mockReturnValue(0.123456);
    const suffix = (0.123456).toString(36).substring(2, 6);
    const occupiedSlug = `restaurante-confirmado-tunja-${suffix}`;
    const other = { id: "negocio-ajeno", slug: occupiedSlug, usuarioId: "usuario-otro" };
    mockNegocioFindUnique.mockImplementation(async ({ where }) => where.slug === occupiedSlug ? other : null);
    const result = await createNegocioCore(confirmedInput());
    // Se conserva la política existente de resolver colisiones de slug con sufijo.
    expectIdentity(result, "CREATED", { id: "negocio-nuevo", slug: `${occupiedSlug}-1`, usuarioId: validInput.usuarioId });
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
  });

  it("el mismo nombre con otro usuario no es una recuperación", async () => {
    const other = { ...existingBusiness, usuarioId: "usuario-otro" };
    const input = { ...confirmedInput(), nombre: other.nombre };
    mockNegocioFindUnique.mockImplementation(async ({ where }) => {
      if (where.nombre === other.nombre || where.usuarioId === other.usuarioId) return other;
      return null;
    });
    const result = await createNegocioCore(input);
    expectIdentity(result, "CREATED", {
      id: "negocio-nuevo", slug: mockTxNegocioCreate.mock.calls[0][0].data.slug, usuarioId: input.usuarioId,
    });
    for (const [args] of mockNegocioFindUnique.mock.calls) expect(args.where).not.toHaveProperty("nombre");
  });

  it.each([
    { target: ["usuarioId"] },
    { target: "Negocio_usuarioId_key" },
  ])("recupera carrera P2002 de usuarioId: $target", async ({ target }) => {
    let wonByOtherExecution = false;
    mockNegocioFindUnique.mockImplementation(async ({ where }) =>
      where.usuarioId === validInput.usuarioId && wonByOtherExecution ? existingBusiness : null);
    mockTxNegocioCreate.mockImplementationOnce(async () => {
      wonByOtherExecution = true;
      throw uniqueConflict(target);
    });
    const result = await createNegocioCore(confirmedInput());
    expectIdentity(result, "ALREADY_CREATED", existingBusiness);
    expect(mockNegocioFindUnique.mock.calls.filter(([args]) => args.where.usuarioId === validInput.usuarioId)).toHaveLength(2);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
    expect(mockTxUsuarioUpdate).not.toHaveBeenCalled();
    expect(mockTxNegocioCategoryCreateMany).not.toHaveBeenCalled();
    expect(mockTxNegocioSectionCreateMany).not.toHaveBeenCalled();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expectNoWritesOutsideTransaction();
  });

  it("P2002 de usuarioId sin ganador recuperable sigue siendo error", async () => {
    mockTxNegocioCreate.mockRejectedValueOnce(uniqueConflict(["usuarioId"]));
    const result = await createNegocioCore(confirmedInput());
    expectCreationError(result);
    expect(mockNegocioFindUnique.mock.calls.filter(([args]) => args.where.usuarioId === validInput.usuarioId)).toHaveLength(2);
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "slug", error: uniqueConflict(["slug"]) },
    { name: "otro modelo", error: uniqueConflict(["usuarioId"], "Usuario") },
    { name: "constraint compuesto", error: uniqueConflict(["usuarioId", "slug"]) },
    { name: "infraestructura", error: new Error("DB no disponible") },
  ])("no convierte $name en ALREADY_CREATED aunque aparezca un negocio", async ({ error }) => {
    let failed = false;
    mockNegocioFindUnique.mockImplementation(async ({ where }) =>
      failed && where.usuarioId === validInput.usuarioId ? existingBusiness : null);
    mockTxNegocioCreate.mockImplementationOnce(async () => { failed = true; throw error; });
    expectCreationError(await createNegocioCore(confirmedInput()));
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockTxUsuarioUpdate).not.toHaveBeenCalled();
    expectNoWritesOutsideTransaction();
  });

  it("retry tras respuesta perdida recupera la creación persistida sin repetir escrituras", async () => {
    let stored: typeof existingBusiness | null = null;
    mockNegocioFindUnique.mockImplementation(async ({ where }) => where.usuarioId === validInput.usuarioId ? stored : null);
    mockTxNegocioCreate.mockImplementation(async ({ data }) => ({ id: "negocio-nuevo", ...data }));
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<typeof existingBusiness>) => {
      const created = await callback(mockTx);
      stored = created; // commit simulado; no se simula HTTP dentro del core.
      return created;
    });
    const input = confirmedInput();
    await createNegocioCore(input); // El caller pierde esta respuesta después del commit.
    expect(stored).not.toBeNull();
    const retry = await createNegocioCore(input);
    expectIdentity(retry, "ALREADY_CREATED", stored!);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxNegocioCreate).toHaveBeenCalledTimes(1);
    expect(mockTxUsuarioUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxNegocioCategoryCreateMany).toHaveBeenCalledTimes(1);
    expect(mockTxNegocioSectionCreateMany).toHaveBeenCalledTimes(1);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expectNoWritesOutsideTransaction();
  });

  it("persiste datos confirmados y JSON completo dentro de la misma creación", async () => {
    const input = confirmedInput();
    const before = structuredClone(input);
    await createNegocioCore(input);
    expect(mockTxNegocioCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      nombre: input.nombre, ciudad: input.ciudad, departamento: input.departamento,
      sitioWeb: input.sitioWeb, horarios: input.horarios,
    }) });
    expect(input).toEqual(before);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expectNoWritesOutsideTransaction();
  });

  it.each([
    { label: "intervalos múltiples", dayIndex: 0 },
    { label: "cruce de medianoche", dayIndex: 1 },
    { label: "día cerrado", dayIndex: 2 },
  ])("conserva $label sin reinterpretar JSON", async ({ dayIndex }) => {
    const input = confirmedInput();
    await createNegocioCore(input);
    expect(mockTxNegocioCreate.mock.calls[0][0].data.horarios?.days?.[dayIndex]).toEqual(input.horarios!.days[dayIndex]);
  });

  it("horarios null representa ausencia SQL y no omite el campo", async () => {
    const input: ConfirmedCoreInput = { ...confirmedInput(), horarios: null };
    await createNegocioCore(input);
    const data = mockTxNegocioCreate.mock.calls[0][0].data;
    // Prisma Json? requiere DbNull para ausencia SQL; JsonNull no es equivalente.
    expect(data).toHaveProperty("horarios", Prisma.DbNull);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
  });

  it("sitioWeb null se persiste explícitamente sin fallback", async () => {
    const input: ConfirmedCoreInput = { ...confirmedInput(), sitioWeb: null };
    await createNegocioCore(input);
    expect(mockTxNegocioCreate.mock.calls[0][0].data).toHaveProperty("sitioWeb", null);
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
  });

  it.each(["negocio", "rol", "categorías", "secciones"])("fallo en %s aborta la transacción sin éxito ni escrituras fuera de ella", async (stage) => {
    const steps = [mockTxNegocioCreate, mockTxUsuarioUpdate, mockTxNegocioCategoryCreateMany, mockTxNegocioSectionCreateMany];
    const index = ["negocio", "rol", "categorías", "secciones"].indexOf(stage);
    steps[index].mockRejectedValueOnce(new Error(`fallo de ${stage}`));
    let committed = false;
    let rejected = false;
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      try {
        const result = await callback(mockTx);
        committed = true;
        return result;
      } catch (error) {
        rejected = true;
        throw error;
      }
    });
    expectCreationError(await createNegocioCore(confirmedInput()));
    expect(committed).toBe(false);
    expect(rejected).toBe(true);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    steps.slice(0, index + 1).forEach((step) => expect(step).toHaveBeenCalledTimes(1));
    steps.slice(index + 1).forEach((step) => expect(step).not.toHaveBeenCalled());
    expectNoWritesOutsideTransaction();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
  });

  it("permanece sin identidad administrativa, reservas, provisioning ni notificaciones", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/business/create-negocio-core.ts"), "utf8");
    expect(source).not.toMatch(/PendingBusiness|prospectId|outreachRecipientKey|conversationId|messageId|profileCreationConsent|pending-business:/);
    expect(source).not.toMatch(/BusinessAvailability|businessAvailability|sendWhatsApp|sendEmail|issueAccountClaim|rawToken/);
    expect(source).not.toMatch(/usuario\.(?:create|upsert)\s*\(|\bfetch\s*\(/);
  });
});
