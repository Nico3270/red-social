import { uploadAuthorizedMedia } from "./uploadAuthorizedMedia";
const publicId = "myckeo/temporary/11111111-1111-4111-8111-111111111111";
const grant = {
  uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
  resourceType: "image",
  deleteAuthorization: "fixture-proof",
  fields: {
    public_id: publicId,
    timestamp: "1700000000",
    overwrite: "false",
    context: "myckeo_cleanup=fixture-proof",
    signature: "signature",
    api_key: "public-key",
  },
};
const provider = {
  secure_url: `https://res.cloudinary.com/demo/image/upload/v123/${publicId}.svg`,
  public_id: publicId,
  resource_type: "image",
};
it("sube únicamente con campos firmados y devuelve su autorización de limpieza", async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(Response.json(grant))
    .mockResolvedValueOnce(Response.json(provider));
  const result = await uploadAuthorizedMedia(
    new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
    fetcher,
  );
  expect(result).toMatchObject({
    publicId,
    url: provider.secure_url,
    deleteAuthorization: "fixture-proof",
    resourceType: "image",
  });
  const body = fetcher.mock.calls[1][1].body as FormData;
  expect(body.get("public_id")).toBe(publicId);
  expect(body.get("overwrite")).toBe("false");
  expect(body.get("signature")).toBe("signature");
  expect(body.has("upload_preset")).toBe(false);
});
it("si falla la autorización no hay llamada al proveedor", async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(Response.json({}, { status: 401 }));
  await expect(
    uploadAuthorizedMedia(
      new File(["x"], "image.png", { type: "image/png" }),
      fetcher,
    ),
  ).rejects.toThrow("autorizar");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("un fallo del proveedor se comunica sin devolver una referencia nueva", async () => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(Response.json(grant))
    .mockResolvedValueOnce(Response.json({ error: "secret" }, { status: 500 }));
  await expect(
    uploadAuthorizedMedia(
      new File(["x"], "image.png", { type: "image/png" }),
      fetcher,
    ),
  ).rejects.toThrow("imagen anterior se conserva");
});
it.each([
  { ...provider, public_id: "foreign" },
  { ...provider, resource_type: "video" },
  { ...provider, secure_url: provider.secure_url.replace("/demo/", "/other/") },
])("no admite referencias de respuesta manipuladas %j", async (response) => {
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(Response.json(grant))
    .mockResolvedValueOnce(Response.json(response));
  await expect(
    uploadAuthorizedMedia(
      new File(["x"], "image.png", { type: "image/png" }),
      fetcher,
    ),
  ).rejects.toThrow("respuesta de subida");
});
