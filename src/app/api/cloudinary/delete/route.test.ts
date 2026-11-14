const mockAuth = jest.fn();
const mockUser = jest.fn();
const mockReferences = jest.fn();
const mockResource = jest.fn();
const mockDeleteByAsset = jest.fn();
const mockDestroy = jest.fn();
const mockWrite = jest.fn(() => {
  throw new Error("No writes allowed in authorization checks");
});
const mockCloudinary = {
  config: () => ({ cloud_name: "test-cloud" }),
  api: {
    resource: mockResource,
    delete_resources_by_asset_ids: mockDeleteByAsset,
  },
  uploader: { destroy: mockDestroy },
};
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUser, update: mockWrite },
    negocio: { update: mockWrite },
    $transaction: mockWrite,
  },
}));
jest.mock("@/lib/cloudinary/isCloudinaryAssetReferenced", () => ({
  isCloudinaryAssetReferenced: mockReferences,
}));
jest.mock("@/lib/cloudinary/serverCloudinary", () => ({
  getServerCloudinary: () => ({ cloudinary: mockCloudinary }),
}));
import { POST } from "./route";
import { issueTemporaryUploadAuthorization } from "@/lib/cloudinary/temporaryUploadAuthorization";

const originalSecret = process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
let token: string, publicId: string;
const noDeletes = () => {
  expect(mockDestroy).not.toHaveBeenCalled();
  expect(mockDeleteByAsset).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
};
function request(
  change: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return new Request("https://myckeo.test/api/cloudinary/delete", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({
      publicId,
      resourceType: "image",
      deleteAuthorization: token,
      ...change,
    }),
  });
}
beforeAll(() => {
  process.env.CLOUDINARY_UPLOAD_AUTH_SECRET =
    "isolated-fixture-signing-key-at-least-32-characters";
});
afterAll(() => {
  if (originalSecret === undefined)
    delete process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
  else process.env.CLOUDINARY_UPLOAD_AUTH_SECRET = originalSecret;
});
beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "owner", role: "negocio" } });
  mockUser.mockResolvedValue({ id: "owner", estado: "activo" });
  const issued = issueTemporaryUploadAuthorization("owner", "image");
  token = issued.token;
  publicId = issued.claims.publicId;
  mockReferences.mockResolvedValue(false);
  mockResource.mockResolvedValue({
    public_id: publicId,
    resource_type: "image",
    type: "upload",
    asset_id: "immutable-asset-id",
    version: 123,
    context: { custom: { myckeo_cleanup: token } },
  });
  mockDeleteByAsset.mockResolvedValue({
    deleted: { "immutable-asset-id": "deleted" },
  });
});

describe("borrado: identidad y autorización de recurso antes de cualquier efecto destructivo", () => {
  it.each([null, {}, { user: {} }, { user: { id: 42 } }])(
    "rechaza sesión inválida %j antes de leer payload",
    async (session) => {
      mockAuth.mockResolvedValueOnce(session);
      const req = request();
      const body = jest.spyOn(req, "json");
      expect((await POST(req)).status).toBe(401);
      expect(body).not.toHaveBeenCalled();
      expect(mockUser).not.toHaveBeenCalled();
      noDeletes();
    },
  );
  it.each([
    null,
    { id: "owner", estado: "suspendido" },
    { id: "owner", estado: "eliminado" },
    { id: "different", estado: "activo" },
  ])("rechaza usuario sin cuenta activa comprobada %j", async (user) => {
    mockUser.mockResolvedValueOnce(user);
    expect((await POST(request())).status).toBe(401);
    noDeletes();
  });
  it("rechaza errores de sesión y consulta de identidad", async () => {
    mockAuth.mockRejectedValueOnce(new Error("invalid session"));
    expect((await POST(request())).status).toBe(503);
    noDeletes();
    mockUser.mockRejectedValueOnce(new Error("DB unavailable"));
    expect((await POST(request())).status).toBe(503);
    noDeletes();
  });
  it("rechaza petición cross-site", async () => {
    expect(
      (await POST(request({}, { origin: "https://foreign.test" }))).status,
    ).toBe(403);
    noDeletes();
  });
  it("rechaza JSON malformado y payload arbitrario", async () => {
    const req = new Request("https://myckeo.test/api/cloudinary/delete", {
      method: "POST",
      body: "{broken",
    });
    expect((await POST(req)).status).toBe(400);
    noDeletes();
    expect((await POST(request({ ownerId: "owner" }))).status).toBe(400);
    noDeletes();
  });
  it("public_id válido y URL persistida por el cliente no constituyen propiedad", async () => {
    expect(
      (
        await POST(
          request({
            deleteAuthorization: undefined,
            url: `https://res.cloudinary.com/test-cloud/image/upload/v123/${publicId}.jpg`,
          }),
        )
      ).status,
    ).toBe(403);
    expect(mockReferences).not.toHaveBeenCalled();
    expect(mockResource).not.toHaveBeenCalled();
    noDeletes();
  });
  it("rechaza token del dueño ajeno incluso para super_admin", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "owner", role: "super_admin" },
    });
    const other = issueTemporaryUploadAuthorization("other-owner", "image");
    expect(
      (
        await POST(
          request({
            publicId: other.claims.publicId,
            deleteAuthorization: other.token,
          }),
        )
      ).status,
    ).toBe(403);
    noDeletes();
  });
  it("rechaza prueba expirada o alterada", async () => {
    const expired = issueTemporaryUploadAuthorization(
      "owner",
      "image",
      Math.floor(Date.now() / 1000) - 3601,
    );
    expect(
      (
        await POST(
          request({
            publicId: expired.claims.publicId,
            deleteAuthorization: expired.token,
          }),
        )
      ).status,
    ).toBe(403);
    noDeletes();
    expect(
      (await POST(request({ deleteAuthorization: token + "x" }))).status,
    ).toBe(403);
    noDeletes();
  });
  it.each([
    { publicId: "victim/image" },
    { resourceType: "video" },
    {
      url: "https://res.cloudinary.com/other-cloud/image/upload/v123/victim.jpg",
    },
    {
      url: "https://res.cloudinary.com/test-cloud/image/upload/v123/victim.jpg",
    },
  ])("rechaza referencia manipulada %j", async (change) => {
    expect((await POST(request(change))).status).toBe(403);
    noDeletes();
  });
  it("rechaza URL ajena o malformada aunque haya token propio", async () => {
    expect(
      (await POST(request({ url: "https://foreign.test/image.jpg" }))).status,
    ).toBe(400);
    noDeletes();
  });
  it("no borra un recurso guardado, aunque sea propio: exige desvinculación y limpieza posterior", async () => {
    mockReferences.mockResolvedValueOnce(true);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "ASSET_IN_USE" });
    noDeletes();
  });
  it("falla cerrado si no se pueden comprobar referencias", async () => {
    mockReferences.mockRejectedValueOnce(new Error("DB lookup failed"));
    expect((await POST(request())).status).toBe(503);
    expect(mockResource).not.toHaveBeenCalled();
    noDeletes();
  });
  it.each([
    { public_id: "victim/image" },
    { resource_type: "video" },
    { type: "private" },
    { asset_id: null },
    { context: { custom: { myckeo_cleanup: "copied-or-forged" } } },
  ])(
    "rechaza metadata del proveedor que no prueba el recurso autorizado %j",
    async (change) => {
      mockResource.mockResolvedValueOnce({
        public_id: publicId,
        resource_type: "image",
        type: "upload",
        asset_id: "immutable-asset-id",
        context: { custom: { myckeo_cleanup: token } },
        ...change,
      });
      expect((await POST(request())).status).toBe(403);
      noDeletes();
    },
  );
  it("rechaza una versión de URL antigua: no borra una sustitución por public_id", async () => {
    expect(
      (
        await POST(
          request({
            url: `https://res.cloudinary.com/test-cloud/image/upload/v122/${publicId}.jpg`,
          }),
        )
      ).status,
    ).toBe(403);
    noDeletes();
  });
  it.each(["negocio", "admin", "super_admin"])(
    "propietario de temporal no referenciado (%s): usa asset_id inmutable verificado, no public_id mutable",
    async (role) => {
      mockAuth.mockResolvedValueOnce({ user: { id: "owner", role } });
      const response = await POST(
        request({
          url: `https://res.cloudinary.com/test-cloud/image/upload/v123/${publicId}.jpg`,
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        deleted: 1,
      });
      expect(mockDeleteByAsset).toHaveBeenCalledWith(["immutable-asset-id"]);
      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    },
  );
  it.each([{ http_code: 404 }, { error: { http_code: 404 } }])(
    "identificador autorizado ya inexistente: respuesta idempotente sin invocar borrado %j",
    async (error) => {
      mockResource.mockRejectedValueOnce(error);
      const response = await POST(request());
      expect(await response.json()).toMatchObject({
        success: true,
        deleted: 0,
        alreadyMissing: 1,
      });
      noDeletes();
    },
  );
  it("revalidar una prueba usada no elimina una sustitución con otro contexto", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mockDeleteByAsset).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    mockResource.mockRejectedValueOnce({ error: { http_code: 404 } });
    const replay = await POST(request());
    expect(await replay.json()).toMatchObject({ deleted: 0, alreadyMissing: 1 });
    noDeletes();
    mockResource.mockResolvedValueOnce({
      public_id: publicId,
      resource_type: "image",
      type: "upload",
      asset_id: "replacement-asset-id",
      context: { custom: { myckeo_cleanup: "different-creation-proof" } },
    });
    expect((await POST(request())).status).toBe(403);
    noDeletes();
  });
  it("error al consultar Cloudinary no permite borrar ni expone detalles privados", async () => {
    mockResource.mockRejectedValueOnce(new Error("sensitive-provider-detail"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "sensitive-provider-detail",
    );
    noDeletes();
  });
  it.each([
    { deleted: {} },
    { deleted: { a: "error" } },
    { deleted: { a: "deleted", b: "deleted" } },
    { deleted: { a: "deleted" }, partial: true },
  ])(
    "no comunica éxito si Cloudinary no confirma la única eliminación %j",
    async (provider) => {
      mockDeleteByAsset.mockResolvedValueOnce(provider);
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ success: false });
      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    },
  );
  it("error de borrado del proveedor no devuelve éxito", async () => {
    mockDeleteByAsset.mockRejectedValueOnce(new Error("provider failed"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ success: false });
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
