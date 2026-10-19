import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CreateNegocioCoreInput,
  CreateNegocioCoreResult,
} from "@/lib/business/create-negocio-core";

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

// El contrato público viene del input del core, no del modelo de reservas.
type PublicOpeningHours = NonNullable<CreateNegocioCoreInput["horarios"]>;

const simpleHorarios: PublicOpeningHours = {
  timezone: "America/Bogota",
  days: [
    {
      day: 1,
      closed: false,
      intervals: [
        { opensAt: "08:00", closesAt: "17:00", closesNextDay: false },
      ],
    },
  ],
};

const complexHorarios: PublicOpeningHours = {
  timezone: "America/Bogota",
  days: [
    {
      day: 5,
      closed: false,
      intervals: [
        { opensAt: "08:00", closesAt: "12:00", closesNextDay: false },
        { opensAt: "18:00", closesAt: "02:00", closesNextDay: true },
      ],
    },
    { day: 7, closed: true, intervals: [] },
  ],
};

function coreSuccess(
  status: "CREATED" | "ALREADY_CREATED",
  negocio = {
    id: "negocio-1",
    slug: "negocio-demo-bogota-abcd",
    usuarioId: "usuario-1",
  },
): CreateNegocioCoreResult {
  return {
    ok: true,
    status,
    negocio,
    message: status === "CREATED"
      ? "Negocio creado exitosamente."
      : "El usuario ya tiene un negocio asociado.",
    negocioId: negocio.id,
    slugNegocio: negocio.slug,
  };
}

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
    mockCreateNegocioCore.mockResolvedValue(coreSuccess("CREATED"));
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

  it("rechaza cargar el endpoint sin MYCKEO_ADMIN_KEY antes de generar una respuesta HTTP", async () => {
    const configuredApiKey = process.env.MYCKEO_ADMIN_KEY;
    try {
      delete process.env.MYCKEO_ADMIN_KEY;

      // La configuración se comprueba al importar, antes de poder ejecutar POST.
      await jest.isolateModulesAsync(async () => {
        await expect(import("./route")).rejects.toThrow(
          "Falta MYCKEO_ADMIN_KEY en .env.local",
        );
      });

      expect(mockNextResponseJson).not.toHaveBeenCalled();
      expect(mockCreateNegocioCore).not.toHaveBeenCalled();
      expect(mockNegocioUpdate).not.toHaveBeenCalled();
      expect(mockUsuarioUpdate).not.toHaveBeenCalled();
    } finally {
      if (configuredApiKey === undefined) {
        delete process.env.MYCKEO_ADMIN_KEY;
      } else {
        process.env.MYCKEO_ADMIN_KEY = configuredApiKey;
      }
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
    expect(mockCreateNegocioCore).toHaveBeenCalledWith(expect.objectContaining({
      usuarioId: validBody.usuarioId,
      nombre: validBody.nombre,
      descripcion: validBody.descripcion,
      ciudad: validBody.ciudad,
      departamento: validBody.departamento,
      direccion: validBody.direccion,
      telefonoContacto: validBody.telefonoContacto,
      categoriaIds: validBody.categoriaIds,
      seccionIds: validBody.seccionIds,
    }));
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

  it("crea con un request mínimo sin inventar coordenadas, palabras clave ni redes sociales", async () => {
    const minimalBody = {
      nombre: validBody.nombre,
      ciudad: validBody.ciudad,
      departamento: validBody.departamento,
      usuarioId: validBody.usuarioId,
      categoriaIds: validBody.categoriaIds,
      seccionIds: validBody.seccionIds,
    };
    const { request } = makeRequest("route-test-api-key", minimalBody);

    const response = await POST(request as never);

    expect(response.status).toBe(201);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: true,
      googleMapsUrl: null,
    });
    expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
    expect(mockCreateNegocioCore).toHaveBeenCalledWith(
      expect.objectContaining(minimalBody),
    );
    expect(mockNegocioUpdate).toHaveBeenCalledTimes(1);
    expect(mockNegocioUpdate).toHaveBeenCalledWith({
      where: { id: "negocio-1" },
      data: {
        latitud: null,
        longitud: null,
        urlGoogleMaps: null,
        palabrasClave: [],
      },
    });
    expect(mockUsuarioUpdate).toHaveBeenCalledTimes(1);
    expect(mockUsuarioUpdate).toHaveBeenCalledWith({
      where: { id: minimalBody.usuarioId },
      data: {
        role: "negocio",
        facebook: null,
        instagram: null,
        tiktok: null,
        youtube: null,
        twitter: null,
      },
    });
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

  it("conserva el postprocesamiento y devuelve un response sin credenciales", async () => {
    const { request } = makeRequest("route-test-api-key");

    const response = await POST(request as never);

    expect(mockNegocioUpdate).toHaveBeenCalledWith({
      where: { id: "negocio-1" },
      data: {
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
    const body = await responseBody(response);
    expect(body).toMatchObject({
      ok: true,
      message: "Negocio creado exitosamente con todos los detalles",
      negocioId: "negocio-1",
      slug: "negocio-demo-bogota-abcd",
      url: "https://myckeo.com/negocio-demo-bogota-abcd",
      googleMapsUrl:
        "https://www.google.com/maps/search/?api=1&query=4.711,-74.0721",
    });
    expect(body).not.toHaveProperty("credencialesParaEnviar");
    const serializedBody = JSON.stringify(body);
    expect(serializedBody).not.toContain("contraseña_temporal");
    expect(serializedBody).not.toContain("2025*");
    expect(serializedBody).not.toContain("negociodemo@myckeo.com");
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
    expect(source).not.toContain("credencialesParaEnviar");
    expect(source).not.toContain("contraseña_temporal");
    expect(source).not.toContain("2025*");
    expect(source).not.toContain("@myckeo.com");
  });

  describe("contrato HTTP ampliado", () => {
    it("transporta exactamente los datos confirmados, categorías y secciones al core", async () => {
      const body = {
        ...validBody,
        nombre: "Café Ñandú confirmado",
        ciudad: "Medellín",
        departamento: "Antioquia",
        usuarioId: "usuario-provisionado",
        categoriaIds: ["categoria-2", "categoria-1"],
        seccionIds: ["seccion-2", "seccion-1"],
        sitioWeb: "https://example.com",
        horarios: complexHorarios,
      };
      const { request } = makeRequest("route-test-api-key", body);

      await POST(request as never);

      const expectedInput: CreateNegocioCoreInput = {
        nombre: body.nombre,
        ciudad: body.ciudad,
        departamento: body.departamento,
        usuarioId: body.usuarioId,
        descripcion: body.descripcion,
        direccion: body.direccion,
        telefonoContacto: body.telefonoContacto,
        categoriaIds: body.categoriaIds,
        seccionIds: body.seccionIds,
        sitioWeb: body.sitioWeb,
        horarios: body.horarios,
      };
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockCreateNegocioCore.mock.calls[0]).toStrictEqual([expectedInput]);
    });

    it.each(["https://example.com", null])(
      "transporta sitioWeb=%s sin fallback ni conversión",
      async (sitioWeb) => {
        const { request } = makeRequest("route-test-api-key", {
          ...validBody,
          sitioWeb,
        });

        const response = await POST(request as never);

        expect(response.status).toBe(201);
        expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
        expect(mockCreateNegocioCore.mock.calls[0][0]).toHaveProperty(
          "sitioWeb", sitioWeb,
        );
      },
    );

    it.each<[string, PublicOpeningHours]>([
      ["un intervalo simple", simpleHorarios],
      ["múltiples intervalos, cierre nocturno y día cerrado", complexHorarios],
      ["timezone null", { ...simpleHorarios, timezone: null }],
    ])("transporta horarios con %s sin interpretar ni mutar", async (_label, horarios) => {
      // Snapshot independiente: una mutación del request no puede alterar el esperado.
      const expected = JSON.parse(JSON.stringify(horarios));
      const body = { ...validBody, horarios: JSON.parse(JSON.stringify(horarios)) };
      const { request } = makeRequest("route-test-api-key", body);

      const response = await POST(request as never);

      expect(response.status).toBe(201);
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockCreateNegocioCore.mock.calls[0][0].horarios).toStrictEqual(expected);
      expect(body.horarios).toStrictEqual(expected);
    });

    it("transporta horarios null como null; la conversión de DB pertenece al core", async () => {
      const { request } = makeRequest("route-test-api-key", {
        ...validBody,
        horarios: null,
      });

      const response = await POST(request as never);

      expect(response.status).toBe(201);
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockCreateNegocioCore.mock.calls[0][0].horarios).toBeNull();
    });

    it("acepta callers legacy que omiten sitioWeb y horarios sin inventar datos", async () => {
      const body: Partial<typeof validBody> = { ...validBody };
      delete body.sitioWeb;
      const { request } = makeRequest("route-test-api-key", body);

      const response = await POST(request as never);

      expect(response.status).toBe(201);
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockCreateNegocioCore.mock.calls[0][0].sitioWeb).toBeUndefined();
      expect(mockCreateNegocioCore.mock.calls[0][0].horarios).toBeUndefined();
      await expect(responseBody(response)).resolves.toMatchObject({
        ok: true,
        negocioId: "negocio-1",
        slug: "negocio-demo-bogota-abcd",
        url: "https://myckeo.com/negocio-demo-bogota-abcd",
      });
    });

    it.each([
      ["CREATED", 201],
      ["ALREADY_CREATED", 200],
    ] as const)("expone %s con HTTP %s, identidad del core y campos legacy", async (status, httpStatus) => {
      // Valores distintos del request y de los updates: la respuesta viene del core.
      const negocio = {
        id: "negocio-retornado-42",
        slug: "slug-canonico-retornado-42",
        usuarioId: "usuario-retornado-42",
      };
      mockCreateNegocioCore.mockResolvedValueOnce(coreSuccess(status, negocio));
      const { request } = makeRequest("route-test-api-key");

      const response = await POST(request as never);

      expect(response.status).not.toBe(409);
      expect(response.status).toBe(httpStatus);
      const body = await responseBody(response);
      expect(body).toMatchObject({
        ok: true,
        status,
        negocio,
        negocioId: negocio.id,
        slug: negocio.slug,
        url: `https://myckeo.com/${negocio.slug}`,
        message: expect.any(String),
        googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=4.711,-74.0721",
      });
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(body).not.toHaveProperty("credencialesParaEnviar");
    });

    it("un retry del mismo request devuelve éxito y la misma identidad recuperada por el core", async () => {
      const negocio = {
        id: "negocio-recuperado",
        slug: "slug-original-persistido",
        usuarioId: validBody.usuarioId,
      };
      mockCreateNegocioCore
        .mockResolvedValueOnce(coreSuccess("CREATED", negocio))
        .mockResolvedValueOnce(coreSuccess("ALREADY_CREATED", negocio));
      const body = { ...validBody, horarios: complexHorarios };
      const first = await POST(makeRequest("route-test-api-key", body).request as never);
      const retry = await POST(makeRequest("route-test-api-key", body).request as never);

      expect(first.status).toBe(201);
      expect(retry.status).not.toBe(409);
      expect(retry.status).toBe(200);
      await expect(responseBody(first)).resolves.toMatchObject({
        ok: true, status: "CREATED", negocio,
      });
      await expect(responseBody(retry)).resolves.toMatchObject({
        ok: true, status: "ALREADY_CREATED", negocio,
        negocioId: negocio.id, slug: negocio.slug,
      });
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(2);
      expect(mockCreateNegocioCore.mock.calls[1]).toStrictEqual(mockCreateNegocioCore.mock.calls[0]);
    });

    it.each([
      ["usuario inexistente", "El usuario especificado no existe."],
      ["validación del core", "Una o más categorías no existen."],
      ["DB o P2002 no recuperable", "Error al crear el negocio."],
    ])("mantiene HTTP 400 ante %s sin fabricar ALREADY_CREATED", async (_label, message) => {
      const failure: CreateNegocioCoreResult = {
        ok: false, message, negocioId: "", slugNegocio: "",
      };
      mockCreateNegocioCore.mockResolvedValueOnce(failure);
      const { request } = makeRequest("route-test-api-key");

      const response = await POST(request as never);

      expect(response.status).toBe(400);
      await expect(responseBody(response)).resolves.toEqual({ ok: false, message });
      expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
      expect(mockNegocioUpdate).not.toHaveBeenCalled();
      expect(mockUsuarioUpdate).not.toHaveBeenCalled();
    });

    it("no recupera ni convierte en éxito una excepción P2002 que escape del core", async () => {
      mockCreateNegocioCore.mockRejectedValueOnce(Object.assign(new Error("Unique constraint"), {
        code: "P2002",
        meta: { modelName: "Negocio", target: ["usuarioId"] },
      }));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      try {
        const response = await POST(makeRequest("route-test-api-key").request as never);

        expect(response.status).toBe(500);
        await expect(responseBody(response)).resolves.toEqual({
          ok: false, message: "Error interno del servidor",
        });
        expect(mockCreateNegocioCore).toHaveBeenCalledTimes(1);
        expect(mockNegocioUpdate).not.toHaveBeenCalled();
        expect(mockUsuarioUpdate).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it("mantiene el error existente ante JSON inválido sin llamar al core", async () => {
      const { request, json } = makeRequest("route-test-api-key");
      json.mockRejectedValueOnce(new SyntaxError("Invalid JSON"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      try {
        const response = await POST(request as never);

        expect(response.status).toBe(500);
        await expect(responseBody(response)).resolves.toEqual({
          ok: false, message: "Error interno del servidor",
        });
        expect(mockCreateNegocioCore).not.toHaveBeenCalled();
        expect(mockNegocioUpdate).not.toHaveBeenCalled();
        expect(mockUsuarioUpdate).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });
});
