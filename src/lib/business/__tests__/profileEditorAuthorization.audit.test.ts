/** Auditoría aislada: ninguna llamada a PostgreSQL o Cloudinary reales. */
const mockAuth = jest.fn();
const mockFindBusiness = jest.fn();
const mockFindUser = jest.fn();
const mockCategoryCount = jest.fn();
const mockSectionCount = jest.fn();
const mockWriteFence = jest.fn(() => {
  throw new Error("AUDIT_FORBIDS_WRITES");
});
const mockDeleteAssets = jest.fn();

jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    negocio: {
      findUnique: mockFindBusiness,
      findFirst: mockFindBusiness,
      update: mockWriteFence,
    },
    usuario: { findUnique: mockFindUser, update: mockWriteFence },
    category: { count: mockCategoryCount },
    section: { count: mockSectionCount },
    $transaction: mockWriteFence,
  },
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/lib/cloudinary/deleteCloudinaryAssets", () => ({
  deleteCloudinaryAssets: mockDeleteAssets,
}));

import { actualizarPerfilNegocio } from "@/actions/perfil/actualizarPerfil";
import { POST as deleteImage } from "@/app/api/cloudinary/delete/route";
import type { InformacionInicialNegocio } from "@/lib/business/profileEditor";

const payload: InformacionInicialNegocio = {
  nombreNegocio: "Aura fixture aislada",
  slugNegocio: "aura-fixture-aislada",
  descripcionNegocio: "Solo auditoría aislada",
  telefonoNegocio: "+573001112233",
  ciudadNegocio: "Tunja",
  departamentoNegocio: "Boyacá",
  latitudNegocio: 5.53,
  longitudNegocio: -73.36,
  categoriaIds: ["fixture-category"],
  seccionesIds: ["fixture-section"],
  estadoNegocio: "activo",
};
const originalAdminKey = process.env.MYCKEO_ADMIN_KEY;
const originalWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
afterAll(() => {
  originalWarn.mockRestore();
  if (originalAdminKey === undefined) delete process.env.MYCKEO_ADMIN_KEY;
  else process.env.MYCKEO_ADMIN_KEY = originalAdminKey;
});
beforeEach(() => {
  jest.clearAllMocks();
  process.env.MYCKEO_ADMIN_KEY = "isolated-audit-key-not-a-real-secret";
  mockAuth.mockResolvedValue({
    user: { id: "fixture-owner", role: "negocio" },
  });
});

function expectNoDatabaseAccess() {
  expect(mockFindBusiness).not.toHaveBeenCalled();
  expect(mockFindUser).not.toHaveBeenCalled();
  expect(mockCategoryCount).not.toHaveBeenCalled();
  expect(mockSectionCount).not.toHaveBeenCalled();
  expect(mockWriteFence).not.toHaveBeenCalled();
}

describe("guardas de actualización del perfil antes de toda escritura", () => {
  it("sin sesión rechaza incluso antes de leer un payload hostil", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const unreadable = new Proxy(
      {},
      {
        get() {
          throw new Error("PAYLOAD_MUST_NOT_BE_READ");
        },
      },
    ) as InformacionInicialNegocio;
    const result = await actualizarPerfilNegocio("fixture-owner", unreadable);
    expect(result).toEqual({
      ok: false,
      message: "No autorizado. Debes iniciar sesión.",
    });
    expectNoDatabaseAccess();
  });
  it("rechaza usuario solicitado ajeno antes de leer payload o consultar Prisma", async () => {
    const unreadable = new Proxy(
      {},
      {
        get() {
          throw new Error("PAYLOAD_MUST_NOT_BE_READ");
        },
      },
    ) as InformacionInicialNegocio;
    const result = await actualizarPerfilNegocio(
      "different-fixture-owner",
      unreadable,
    );
    expect(result).toEqual({
      ok: false,
      message: "No tienes permiso para actualizar el perfil de este usuario.",
    });
    expectNoDatabaseAccess();
  });
  it("un idNegocio de otro dueño solo permite la lectura de propiedad y nunca abre transacción", async () => {
    mockFindBusiness.mockResolvedValueOnce({
      id: "foreign-isolated-fixture",
      usuarioId: "different-fixture-owner",
    });
    const result = await actualizarPerfilNegocio("fixture-owner", {
      ...payload,
      idNegocio: "foreign-isolated-fixture",
    });
    expect(result).toEqual({
      ok: false,
      message: "No tienes permiso para actualizar este negocio.",
    });
    expect(mockFindBusiness).toHaveBeenCalledTimes(1);
    expect(mockFindBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "foreign-isolated-fixture" } }),
    );
    expect(mockCategoryCount).not.toHaveBeenCalled();
    expect(mockSectionCount).not.toHaveBeenCalled();
    expect(mockWriteFence).not.toHaveBeenCalled();
  });
  it("omitir idNegocio busca exclusivamente por el usuario autenticado y rechaza una relación inconsistente", async () => {
    mockFindBusiness.mockResolvedValueOnce({
      id: "foreign-isolated-fixture",
      usuarioId: "different-fixture-owner",
    });
    const result = await actualizarPerfilNegocio("", payload);
    expect(result.ok).toBe(false);
    expect(mockFindBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: "fixture-owner" } }),
    );
    expect(mockWriteFence).not.toHaveBeenCalled();
  });
});

describe("vías REST de perfil protegidas por clave administrativa", () => {
  it.each([
    "nombre",
    "description",
    "direccion",
    "sitioweb",
    "fotoperfil",
    "fotoportada",
    "ubicacion",
    "facebook",
    "instagram",
    "twitter",
    "tiktok",
    "youtube",
  ])(
    "%s rechaza sin clave antes de consultar o escribir, aunque haya cookie de propietario",
    async (field) => {
      const { PATCH } = await import(
        `../../../app/api/business/${field}/[phone]/route`
      );
      const request = new Request(
        "http://localhost/api/business/isolated-fixture",
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            cookie: "isolated-non-secret-session-placeholder",
          },
          body: "{}",
        },
      );
      const response = await PATCH(request, {
        params: Promise.resolve({ phone: "isolated-nonexistent-fixture" }),
      });
      expect(response.status).toBe(401);
      expectNoDatabaseAccess();
    },
  );
});

describe("regresión del hallazgo de borrado sin autorización", () => {
  it("rechaza sin sesión antes de alcanzar cualquier borrado", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const request = new Request("http://localhost/api/cloudinary/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicId: "isolated-foreign-fixture/profile",
        resourceType: "image",
      }),
    });
    const response = await deleteImage(request);
    expect(response.status).toBe(401);
    expect(mockDeleteAssets).not.toHaveBeenCalled();
    expect(mockAuth).toHaveBeenCalledTimes(1);
    expectNoDatabaseAccess();
  });
});
