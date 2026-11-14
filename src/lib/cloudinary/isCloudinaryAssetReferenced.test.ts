const models = [
  "usuario",
  "negocio",
  "image",
  "productVariant",
  "media",
  "resena",
  "productImageGeneration",
] as const;
const mockReads = Object.fromEntries(models.map((name) => [name, jest.fn()]));
const mockWrite = jest.fn(() => {
  throw new Error("Unexpected write");
});
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: Object.fromEntries(
    Object.keys(mockReads).map((name) => [
      name,
      { findMany: mockReads[name], update: mockWrite, delete: mockWrite },
    ]),
  ),
}));
import { isCloudinaryAssetReferenced } from "./isCloudinaryAssetReferenced";
const target = {
  cloudName: "demo",
  publicId: "myckeo/temporary/fixture-id",
  resourceType: "image" as const,
};
const url =
  "https://res.cloudinary.com/demo/image/upload/c_fill,w_100/v123/myckeo/temporary/fixture-id.jpg";
beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockReads).forEach((read) => read.mockResolvedValue([]));
});
it("un temporal sin ninguna referencia no requiere escritura", async () => {
  expect(await isCloudinaryAssetReferenced(target)).toBe(false);
  expect(mockWrite).not.toHaveBeenCalled();
});
it.each([
  ["usuario", { id: "u", fotoPerfil: url }],
  ["negocio", { id: "b", fotoPerfil: null, fotoPortada: url, imagenes: [] }],
  [
    "negocio",
    { id: "b", fotoPerfil: null, fotoPortada: null, imagenes: [url] },
  ],
  ["image", { id: "i", url }],
  ["productVariant", { id: "v", imagenUrl: url }],
  ["media", { id: "m", url }],
  ["resena", { id: "r", multimedia: [url] }],
  [
    "productImageGeneration",
    { id: "g", cloudinaryUrl: null, cloudinaryPublicId: target.publicId },
  ],
])(
  "detecta referencia %s sin conceder propiedad por URL",
  async (model, row) => {
    mockReads[model as string].mockResolvedValueOnce([row]);
    expect(await isCloudinaryAssetReferenced(target)).toBe(true);
    expect(mockWrite).not.toHaveBeenCalled();
  },
);
it("recorre páginas sin omitir referencias fuera de la primera", async () => {
  mockReads.image
    .mockResolvedValueOnce(
      Array.from({ length: 200 }, (_, i) => ({
        id: String(i),
        url: "/local.png",
      })),
    )
    .mockResolvedValueOnce([{ id: "later", url }]);
  expect(await isCloudinaryAssetReferenced(target)).toBe(true);
  expect(mockReads.image).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ cursor: { id: "199" }, skip: 1 }),
  );
});
it("un fallo de cualquier consulta impide autorizar el borrado", async () => {
  mockReads.media.mockRejectedValueOnce(new Error("DB failure"));
  await expect(isCloudinaryAssetReferenced(target)).rejects.toThrow(
    "DB failure",
  );
  expect(mockWrite).not.toHaveBeenCalled();
});
it("un escaneo incompleto por límite nunca significa recurso libre", async () => {
  mockReads.image.mockResolvedValue(
    Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      url: "/local.png",
    })),
  );
  await expect(isCloudinaryAssetReferenced(target)).rejects.toThrow(
    "scan limit",
  );
  expect(mockWrite).not.toHaveBeenCalled();
});
it("URLs de otro cloud o recurso no señalan el mismo archivo", async () => {
  mockReads.image.mockResolvedValueOnce([
    { id: "i", url: url.replace("/demo/", "/different/") },
  ]);
  expect(await isCloudinaryAssetReferenced(target)).toBe(false);
});
it("una URL Cloudinary no resoluble de esta cuenta bloquea la limpieza", async () => {
  mockReads.image.mockResolvedValueOnce([
    {
      id: "i",
      url: "https://res.cloudinary.com/demo/image/upload/no-version.jpg",
    },
  ]);
  await expect(isCloudinaryAssetReferenced(target)).rejects.toThrow(
    "Unresolved",
  );
  expect(mockWrite).not.toHaveBeenCalled();
});
