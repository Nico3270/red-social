const mockAuth = jest.fn();
const mockUser = jest.fn();
const mockSign = jest.fn();
const mockDestroy = jest.fn();
const mockWrite = jest.fn();
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: { usuario: { findUnique: mockUser, update: mockWrite } },
}));
jest.mock("@/lib/cloudinary/serverCloudinary", () => ({
  getServerCloudinary: () => ({
    cloudinary: {
      config: () => ({
        cloud_name: "test-cloud",
        api_key: "public-test-key",
        api_secret: "private-test-secret",
      }),
      utils: { api_sign_request: mockSign },
      uploader: { destroy: mockDestroy },
    },
  }),
}));
import { POST } from "./route";
import { verifyTemporaryUploadAuthorization } from "@/lib/cloudinary/temporaryUploadAuthorization";
const original = process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
beforeAll(() => {
  process.env.CLOUDINARY_UPLOAD_AUTH_SECRET =
    "isolated-fixture-signing-key-at-least-32-characters";
});
afterAll(() => {
  if (original === undefined) delete process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
  else process.env.CLOUDINARY_UPLOAD_AUTH_SECRET = original;
});
beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "owner" } });
  mockUser.mockResolvedValue({ id: "owner", estado: "activo" });
  mockSign.mockReturnValue("provider-signature");
});
const request = (body: unknown) =>
  new Request("https://myckeo.test/api/cloudinary/upload-authorization", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("sin autenticación no firma nada", async () => {
  mockAuth.mockResolvedValueOnce(null);
  expect((await POST(request({ resourceType: "image" }))).status).toBe(401);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockDestroy).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
});
it.each([
  { resourceType: "auto" },
  { resourceType: "image", userId: "victim" },
  { resourceType: "image", publicId: "victim/photo" },
])("el cliente no elige propietario ni identificador %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockDestroy).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
});
it("firma destino nuevo, overwrite=false y contexto ligado al actor; no expone secretos", async () => {
  const response = await POST(request({ resourceType: "video" }));
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const proof = verifyTemporaryUploadAuthorization(
    data.deleteAuthorization,
    "owner",
  );
  expect(proof).toMatchObject({
    userId: "owner",
    resourceType: "video",
    publicId: data.fields.public_id,
  });
  expect(data.fields).toMatchObject({
    overwrite: "false",
    context: `myckeo_cleanup=${data.deleteAuthorization}`,
    signature: "provider-signature",
  });
  expect(mockSign).toHaveBeenCalledWith(
    expect.objectContaining({
      overwrite: false,
      public_id: proof!.publicId,
      context: data.fields.context,
    }),
    "private-test-secret",
  );
  expect(JSON.stringify(data)).not.toContain("private-test-secret");
  expect(JSON.stringify(data)).not.toContain(
    process.env.CLOUDINARY_UPLOAD_AUTH_SECRET,
  );
  expect(mockDestroy).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
});
