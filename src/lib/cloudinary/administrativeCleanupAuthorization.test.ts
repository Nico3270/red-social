const mockAuth = jest.fn();
const mockDestroy = jest.fn();
const mockTransaction = jest.fn();
const mockPreview = jest.fn();
const mockCollect = jest.fn();
const mockGenerate = jest.fn();
const mockUpload = jest.fn();
const mockRevalidate = jest.fn();
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: { $transaction: mockTransaction },
}));
jest.mock("@/lib/cloudinary/deleteCloudinaryAssets", () => ({
  deleteCloudinaryAssets: mockDestroy,
}));
jest.mock("@/lib/cloudinary/uploadGeneratedProductImage", () => ({
  uploadGeneratedProductImage: mockUpload,
}));
jest.mock("@/lib/openai/generateProductImage", () => ({
  generateProductImage: mockGenerate,
}));
jest.mock("@/actions/myckeoAdmin/previewDeleteBusinessAction", () => ({
  previewDeleteBusinessAction: mockPreview,
}));
jest.mock("@/actions/myckeoAdmin/collectBusinessAssetsForCleanup", () => ({
  collectBusinessAssetsForCleanup: mockCollect,
}));
jest.mock("@/actions/myckeoAdmin/revalidateAdminProductSurfaces", () => ({
  revalidateAdminProductSurfaces: mockRevalidate,
}));
import { purgeTestBusinessAction } from "@/actions/myckeoAdmin/purgeTestBusinessAction";
import { generateAdminProductImageAction } from "@/actions/myckeoAdmin/generateAdminProductImageAction";

beforeEach(() => jest.clearAllMocks());
it.each([
  null,
  { user: { id: "owner", role: "negocio" } },
  { user: { id: "admin", role: "admin" } },
])(
  "las vías administrativas no alcanzan limpieza, consultas ni escrituras sin super_admin: %j",
  async (session) => {
    mockAuth.mockResolvedValue(session);
    const input = new Proxy(
      {},
      {
        get() {
          throw new Error("Input must not be read before authorization");
        },
      },
    );
    const purge = await purgeTestBusinessAction(
      input as Parameters<typeof purgeTestBusinessAction>[0],
    );
    const generation = await generateAdminProductImageAction(
      input as Parameters<typeof generateAdminProductImageAction>[0],
    );
    expect(purge.ok).toBe(false);
    expect(purge.error).toMatch(/No autorizado|permisos/);
    expect(generation.ok).toBe(false);
  if (generation.ok) throw new Error("Expected authorization rejection");
    expect(generation.code).toBe(session ? "FORBIDDEN" : "UNAUTHORIZED");
    for (const effect of [
      mockDestroy,
      mockTransaction,
      mockPreview,
      mockCollect,
      mockGenerate,
      mockUpload,
      mockRevalidate,
    ])
      expect(effect).not.toHaveBeenCalled();
  },
);
