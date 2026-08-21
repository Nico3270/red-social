import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockCreateNegocioCore = jest.fn();
const mockNegocioUpdate = jest.fn();
const mockUsuarioUpdate = jest.fn();
const mockNextResponseJson = jest.fn(
  (body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200,
    json: async () => body,
  }),
);

jest.mock(
  "@/lib/business/create-negocio-core",
  () => ({ createNegocioCore: mockCreateNegocioCore }),
  { virtual: true },
);
jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      negocio: { update: mockNegocioUpdate },
      usuario: { update: mockUsuarioUpdate },
    },
  }),
  { virtual: true },
);
jest.mock(
  "next/server",
  () => ({ NextResponse: { json: mockNextResponseJson } }),
  { virtual: true },
);

const previousApiKey = process.env.MYCKEO_ADMIN_KEY;
process.env.MYCKEO_ADMIN_KEY = "route-test-api-key";

let POST: typeof import("./route").POST;

const validBody = {
  nombre: "Negocio Demo",
  descripcion: "Descripción del negocio",
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  direccion: "Calle 1 # 2-3",
  telefonoContacto: "+573001234567",
  usuarioId: "usuario-1",
  categoriaIds: ["categoria-1", "categoria-2"],
  seccionIds: ["seccion-1", "seccion-2"],
  facebook: "https://facebook.com/negocio-demo",
  instagram: "https://instagram.com/negocio-demo",
  tiktok: "https://tiktok.com/@negocio-demo",
  youtube: "https://youtube.com/@negocio-demo",
  twitter: "https://twitter.com/negocio-demo",
  sitioWeb: "https://negocio.example",
  latitud: "4.711",
  longitud: "-74.0721",
  palabrasClave: ["pan", "artesanal"],
};

type RequestDouble = {
  headers: { get: jest.Mock };
  json: jest.Mock;
};

function makeRequest(
  apiKey: string | null,
  body: unknown = validBody,
  order?: string[],
): { request: RequestDouble; json: jest.Mock; getHeader: jest.Mock } {
  const getHeader = jest.fn((name: string) => {
    order?.push("auth");
    expect(name).toBe("x-api-key");
    return apiKey;
  });
  const json = jest.fn(async () => {
    order?.push("json");
    return body;
  });

  return {
    request: { headers: { get: getHeader }, json },
    json,
    getHeader,
  };
}

async function responseBody(response: Awaited<ReturnType<typeof POST>>) {
  return (response as unknown as { json: () => Promise<unknown> }).json();
}

describe("POST /api/negocio", () => {
  beforeAll(async () => {
    ({ POST } = await import("./route"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNegocioCore.mockResolvedValue({
      ok: true,
      message: "Negocio creado exitosamente.",
      negocioId: "negocio-1",
      slugNegocio: "negocio-demo-bogota-abcd",
    });
    mockNegocioUpdate.mockResolvedValue({ id: "negocio-1" });
    mockUsuarioUpdate.mockResolvedValue({ id: "usuario-1" });
  });

  afterAll(() => {
    if (previousApiKey === undefined) {
      delete process.env.MYCKEO_ADMIN_KEY;
    } else {
      process.env.MYCKEO_ADMIN_KEY = previousApiKey;
    }
  });

  it.each([
    ["ausente", null],
    ["incorrecta", "wrong-key"],
  ])(
    "rechaza una API key %s antes del body, core y Prisma",
    async (_label, apiKey) => {
      const order: string[] = [];
      const { request, json } = makeRequest(apiKey, validBody, order);

      const response = await POST(request as never);

      expect(response.status).toBe(401);
      await expect(responseBody(response)).resolves.toEqual({
        ok: false,
        message: "Unauthorized",
      });
      expect(order).toEqual(["auth"]);
      expect(json).not.toHaveBeenCalled();
      expect(mockCreateNegocioCore).not.toHaveBeenCalled();
      expect(mockNegocioUpdate).not.toHaveBeenCalled();
      expect(mockUsuarioUpdate).not.toHaveBeenCalled();
    },
  );

  it("autoriza antes de leer JSON y llamar el core", async () => {
    const order: string[] = [];
    const { request } = makeRequest("route-test-api-key", validBody, order);
    mockCreateNegocioCore.mockImplementationOnce(async () => {
      order.push("core");
      return {
        ok: false,
        message: "Fallo controlado",
        negocioId: "",
        slugNegocio: "",
      };
    });

    await POST(request as never);

    expect(order).toEqual(["auth", "json", "core"]);
  });

  it("mapea el JSON histórico directamente al input tipado del core", async () => {
    const { request } = makeRequest("route-test-api-key");

    await POST(request as never);

    expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
    expect(mockCreateNegocioCore).toHaveBeenCalledWith({
      usuarioId: validBody.usuarioId,
      nombre: validBody.nombre,
      descripcion: validBody.descripcion,
      ciudad: validBody.ciudad,
      departamento: validBody.departamento,
      direccion: validBody.direccion,
      telefonoContacto: validBody.telefonoContacto,
      categoriaIds: validBody.categoriaIds,
      seccionIds: validBody.seccionIds,
    });
  });

  it("preserva los defaults históricos de descripción, dirección y teléfono", async () => {
    const bodyWithoutOptionalFields: Partial<typeof validBody> = {
      ...validBody,
    };
    delete bodyWithoutOptionalFields.descripcion;
    delete bodyWithoutOptionalFields.direccion;
    delete bodyWithoutOptionalFields.telefonoContacto;
    const { request } = makeRequest(
      "route-test-api-key",
      bodyWithoutOptionalFields,
    );

    await POST(request as never);

    expect(mockCreateNegocioCore).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion:
          "Negocio creado automáticamente por Myckeo. Completa tu perfil para personalizarlo.",
        direccion: "",
        telefonoContacto: null,
      }),
    );
  });

  it.each([
    ["campos obligatorios", { ...validBody, nombre: "" }, "Faltan campos obligatorios"],
    ["categorías", { ...validBody, categoriaIds: [] }, "Debe seleccionar al menos una categoría"],
    ["secciones", { ...validBody, seccionIds: [] }, "Debe seleccionar al menos una sección"],
    ["palabras clave", { ...validBody, palabrasClave: "pan" }, "palabrasClave debe ser un array"],
  ])("conserva la validación HTTP de %s", async (_label, body, message) => {
    const { request } = makeRequest("route-test-api-key", body);

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      message,
    });
    expect(mockCreateNegocioCore).not.toHaveBeenCalled();
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockUsuarioUpdate).not.toHaveBeenCalled();
  });

  it("preserva el error del core y evita el postprocesamiento", async () => {
    mockCreateNegocioCore.mockResolvedValueOnce({
      ok: false,
      message: "El usuario ya tiene un negocio asociado.",
      negocioId: "",
      slugNegocio: "",
    });
    const { request } = makeRequest("route-test-api-key");

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      message: "El usuario ya tiene un negocio asociado.",
    });
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockUsuarioUpdate).not.toHaveBeenCalled();
  });

  it("conserva el postprocesamiento y el response legacy tras éxito", async () => {
    const { request } = makeRequest("route-test-api-key");

    const response = await POST(request as never);

    expect(mockNegocioUpdate).toHaveBeenCalledWith({
      where: { id: "negocio-1" },
      data: {
        sitioWeb: validBody.sitioWeb,
        latitud: 4.711,
        longitud: -74.0721,
        urlGoogleMaps:
          "https://www.google.com/maps/search/?api=1&query=4.711,-74.0721",
        palabrasClave: validBody.palabrasClave,
      },
    });
    expect(mockUsuarioUpdate).toHaveBeenCalledWith({
      where: { id: validBody.usuarioId },
      data: {
        role: "negocio",
        facebook: validBody.facebook,
        instagram: validBody.instagram,
        tiktok: validBody.tiktok,
        youtube: validBody.youtube,
        twitter: validBody.twitter,
      },
    });
    expect(response.status).toBe(201);
    await expect(responseBody(response)).resolves.toEqual({
      ok: true,
      message: "Negocio creado exitosamente con todos los detalles",
      negocioId: "negocio-1",
      slug: "negocio-demo-bogota-abcd",
      url: "https://myckeo.com/negocio-demo-bogota-abcd",
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query=4.711,-74.0721",
      credencialesParaEnviar: {
        email: "negociodemo@myckeo.com",
        contraseña_temporal: "negociodemo2025*",
        mensaje:
          "Tu negocio ya está creado. Ingresa con estas credenciales y completa tu perfil real.",
      },
    });
  });

  it("conserva el error HTTP 500 ante una excepción inesperada", async () => {
    mockCreateNegocioCore.mockRejectedValueOnce(new Error("fallo de prueba"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const { request } = makeRequest("route-test-api-key");

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      message: "Error interno del servidor",
    });
    expect(mockNegocioUpdate).not.toHaveBeenCalled();
    expect(mockUsuarioUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("no construye FormData ni depende de la Server Action antigua", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/negocio/route.ts"),
      "utf8",
    );

    expect(source).toContain("createNegocioCore");
    expect(source).not.toMatch(/new\s+FormData\s*\(/);
    expect(source).not.toContain("createHegocio");
    expect(source).not.toMatch(/\bcreateNegocio\s*\(/);
  });
});
