import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockAuth = jest.fn();
const mockCreateNegocioCore = jest.fn();

jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
jest.mock(
  "@/lib/business/create-negocio-core",
  () => ({ createNegocioCore: mockCreateNegocioCore }),
  { virtual: true },
);

import { createNegocio } from "./createHegocio";

const successResult = {
  ok: true,
  message: "Negocio creado exitosamente.",
  negocioId: "negocio-1",
  slugNegocio: "negocio-demo-bogota-abcd",
};

type FormDataOptions = {
  includeLegacyUserId?: boolean;
  legacyUserId?: string;
  includePhone?: boolean;
};

function buildFormData({
  includeLegacyUserId = true,
  legacyUserId = "user-B",
  includePhone = true,
}: FormDataOptions = {}): FormData {
  const formData = new FormData();
  formData.append("nombre", "Negocio Demo");
  formData.append("descripcion", "Descripción del negocio");
  formData.append("ciudad", "Bogotá");
  formData.append("departamento", "Cundinamarca");
  formData.append("direccion", "Calle 1 # 2-3");
  if (includePhone) {
    formData.append("telefonoContacto", "+573001234567");
  }
  formData.append("categoriaIds", "categoria-1");
  formData.append("categoriaIds", "categoria-2");
  formData.append("seccionIds", "seccion-1");
  formData.append("seccionIds", "seccion-2");
  if (includeLegacyUserId) {
    formData.append("usuarioId", legacyUserId);
  }
  return formData;
}

describe("createNegocio Server Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-A" } });
    mockCreateNegocioCore.mockResolvedValue(successResult);
  });

  it("ejecuta auth como primera operación antes de leer FormData o llamar el core", async () => {
    const order: string[] = [];
    const formData = buildFormData();
    const originalGet = formData.get.bind(formData);
    const originalGetAll = formData.getAll.bind(formData);
    jest.spyOn(formData, "get").mockImplementation((name) => {
      order.push(`get:${name}`);
      return originalGet(name);
    });
    jest.spyOn(formData, "getAll").mockImplementation((name) => {
      order.push(`getAll:${name}`);
      return originalGetAll(name);
    });
    mockAuth.mockImplementationOnce(async () => {
      order.push("auth");
      return { user: { id: "user-A" } };
    });
    mockCreateNegocioCore.mockImplementationOnce(async () => {
      order.push("core");
      return successResult;
    });

    await createNegocio(formData);

    expect(order[0]).toBe("auth");
    expect(order.at(-1)).toBe("core");
    expect(mockAuth).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["sin sesión", null],
    ["sin user", {}],
    ["sin user.id", { user: {} }],
  ])("falla cerrado %s sin leer el formulario ni llamar el core", async (_label, session) => {
    mockAuth.mockResolvedValueOnce(session);
    const formData = buildFormData();
    const getSpy = jest.spyOn(formData, "get");
    const getAllSpy = jest.spyOn(formData, "getAll");

    const result = await createNegocio(formData);

    expect(result).toEqual({
      ok: false,
      message: "No autorizado. Debes iniciar sesión.",
      negocioId: "",
      slugNegocio: "",
    });
    expect(getSpy).not.toHaveBeenCalled();
    expect(getAllSpy).not.toHaveBeenCalled();
    expect(mockCreateNegocioCore).not.toHaveBeenCalled();
  });

  it("falla cerrado si auth lanza una excepción", async () => {
    mockAuth.mockRejectedValueOnce(new Error("fallo de auth"));
    const formData = buildFormData();
    const getSpy = jest.spyOn(formData, "get");

    const result = await createNegocio(formData);

    expect(result).toEqual({
      ok: false,
      message: "Error al crear el negocio.",
      negocioId: "",
      slugNegocio: "",
    });
    expect(getSpy).not.toHaveBeenCalled();
    expect(mockCreateNegocioCore).not.toHaveBeenCalled();
  });

  it.each([
    ["otro usuario", true, "user-B"],
    ["un admin", true, "admin-id"],
    ["vacío", true, ""],
    ["arbitrario", true, "../../usuario-victima"],
    ["ausente", false, ""],
  ])(
    "usa session.user.id cuando usuarioId del FormData es %s",
    async (_label, includeLegacyUserId, legacyUserId) => {
      const formData = buildFormData({
        includeLegacyUserId,
        legacyUserId,
      });

      await createNegocio(formData);

      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockCreateNegocioCore).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "user-A" }),
      );
      expect(mockCreateNegocioCore.mock.calls[0][0].usuarioId).not.toBe(
        legacyUserId || undefined,
      );
    },
  );

  it("mapea todos los campos comerciales al input del core", async () => {
    await createNegocio(buildFormData());

    expect(mockCreateNegocioCore).toHaveBeenCalledWith({
      usuarioId: "user-A",
      nombre: "Negocio Demo",
      descripcion: "Descripción del negocio",
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      direccion: "Calle 1 # 2-3",
      telefonoContacto: "+573001234567",
      categoriaIds: ["categoria-1", "categoria-2"],
      seccionIds: ["seccion-1", "seccion-2"],
    });
  });

  it("preserva teléfono nullable", async () => {
    await createNegocio(buildFormData({ includePhone: false }));

    expect(mockCreateNegocioCore).toHaveBeenCalledWith(
      expect.objectContaining({ telefonoContacto: null }),
    );
  });

  it("preserva sin cambios el resultado exitoso del core", async () => {
    const result = await createNegocio(buildFormData());

    expect(result).toEqual(successResult);
    expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
  });

  it("preserva sin cambios un error controlado del core", async () => {
    const coreFailure = {
      ok: false,
      message: "El usuario ya tiene un negocio asociado.",
      negocioId: "",
      slugNegocio: "",
    };
    mockCreateNegocioCore.mockResolvedValueOnce(coreFailure);

    const result = await createNegocio(buildFormData());

    expect(result).toEqual(coreFailure);
    expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
  });

  it("es un wrapper Server Action sin Prisma ni identidad del formulario", () => {
    const source = readFileSync(
      join(process.cwd(), "src/actions/auth/createHegocio.ts"),
      "utf8",
    );

    expect(source).toMatch(/^["']use server["'];/);
    expect(source).toContain('import { auth } from "@/auth.config";');
    expect(source).toContain("createNegocioCore");
    expect(source).not.toMatch(/formData\.get\(["']usuarioId["']\)/);
    expect(source).not.toMatch(/\bprisma\b/i);
    expect(source).not.toContain("$transaction");
    expect(source).not.toMatch(/console\./);
  });
});
