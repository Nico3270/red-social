import { readFileSync } from "node:fs";
import { join } from "node:path";

const mockNextResponseJson = jest.fn((body: unknown, init?: ResponseInit) =>
  Response.json(body, init),
);

jest.mock("next/server", () => ({
  NextResponse: { json: mockNextResponseJson },
}));

import { POST } from "./route";

const expectedBody = { ok: false, code: "LEGACY_ENDPOINT_DISABLED" };
const previousAdminKey = process.env.MYCKEO_ADMIN_KEY;

function makeRequest(apiKey: string | null) {
  return {
    headers: {
      get: jest.fn(() => apiKey),
    },
    json: jest.fn(async () => {
      throw new Error("Request body must not be read");
    }),
  };
}

async function invokeWithIgnoredRequest(request: ReturnType<typeof makeRequest>) {
  const invoke = POST as (request: ReturnType<typeof makeRequest>) => ReturnType<typeof POST>;
  return invoke(request);
}

describe("POST /api/placeholder retirado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MYCKEO_ADMIN_KEY;
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.MYCKEO_ADMIN_KEY;
    else process.env.MYCKEO_ADMIN_KEY = previousAdminKey;
  });

  it("responde 410 sin API key ni variable de entorno", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual(expectedBody);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(mockNextResponseJson).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ausente", null],
    ["incorrecta", "wrong-key"],
    ["correcta", "configured-test-key"],
  ])("devuelve el mismo 410 con API key %s sin leer el request", async (_label, apiKey) => {
    process.env.MYCKEO_ADMIN_KEY = "configured-test-key";
    const request = makeRequest(apiKey);

    const response = await invokeWithIgnoredRequest(request);

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual(expectedBody);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(request.headers.get).not.toHaveBeenCalled();
    expect(request.json).not.toHaveBeenCalled();
  });

  it("no conserva dependencias ni generación de credenciales legacy", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/placeholder/route.ts"), "utf8");

    expect(source).toContain("LEGACY_ENDPOINT_DISABLED");
    expect(source).toContain("410");
    expect(source).toContain("no-store");
    expect(source).not.toMatch(
      /prisma|bcrypt|hashSync|2025\*|@myckeo\.com|credenciales|contraseñaTemporal|usuario\.create|usuario\.findUnique|MYCKEO_ADMIN_KEY/i,
    );
    expect(source).not.toMatch(/request\.(?:json|headers)|throw new Error/);
  });
});
