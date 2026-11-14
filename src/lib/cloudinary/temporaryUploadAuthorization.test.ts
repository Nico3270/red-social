import {
  issueTemporaryUploadAuthorization,
  verifyTemporaryUploadAuthorization,
  TEMPORARY_UPLOAD_TTL_SECONDS,
} from "./temporaryUploadAuthorization";
import {
  parseCloudinaryDeletionUrl,
  cloudinaryDeletePayloadSchema,
} from "./cloudinaryDeletionReference";

const originalSecret = process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
beforeAll(() => {
  process.env.CLOUDINARY_UPLOAD_AUTH_SECRET =
    "isolated-fixture-signing-key-at-least-32-characters";
});
afterAll(() => {
  if (originalSecret === undefined)
    delete process.env.CLOUDINARY_UPLOAD_AUTH_SECRET;
  else process.env.CLOUDINARY_UPLOAD_AUTH_SECRET = originalSecret;
});

describe("prueba firmada de creación de uploads temporales", () => {
  it("vincula sesión, identificador, tipo y ventana temporal", () => {
    const { claims, token } = issueTemporaryUploadAuthorization(
      "owner",
      "image",
      1700000000,
    );
    expect(
      verifyTemporaryUploadAuthorization(token, "owner", 1700000001),
    ).toEqual(claims);
    expect(
      verifyTemporaryUploadAuthorization(token, "other", 1700000001),
    ).toBeNull();
    expect(
      verifyTemporaryUploadAuthorization(
        token,
        "owner",
        1700000000 + TEMPORARY_UPLOAD_TTL_SECONDS,
      ),
    ).toBeNull();
    expect(
      verifyTemporaryUploadAuthorization(token, "owner", 1699999900),
    ).toBeNull();
  });
  it("no permite manipular el propietario, recurso ni firma", () => {
    const { claims, token } = issueTemporaryUploadAuthorization(
      "owner",
      "video",
      1700000000,
    );
    for (const change of [
      { userId: "other" },
      { publicId: "foreign/image" },
      { resourceType: "image" },
    ]) {
      const forged =
        Buffer.from(JSON.stringify({ ...claims, ...change })).toString(
          "base64url",
        ) +
        "." +
        token.split(".")[1];
      expect(
        verifyTemporaryUploadAuthorization(forged, "owner", 1700000000),
      ).toBeNull();
    }
    expect(
      verifyTemporaryUploadAuthorization(
        token.slice(0, -1) + "!",
        "owner",
        1700000000,
      ),
    ).toBeNull();
  });
  it.each(["", "not-a-token", "a.b", "a".repeat(3000)])(
    "rechaza tokens malformados %s",
    (token) => {
      expect(
        verifyTemporaryUploadAuthorization(token, "owner", 1700000000),
      ).toBeNull();
    },
  );
  it("asigna IDs nuevos que el cliente no puede elegir", () => {
    expect(
      issueTemporaryUploadAuthorization("owner", "image").claims.publicId,
    ).not.toBe(
      issueTemporaryUploadAuthorization("owner", "image").claims.publicId,
    );
  });
});

describe("referencias de borrado estrictas sin ambigüedad de cuenta/tipo", () => {
  it("reconoce transformaciones y versión sin confundirlas con el ID", () => {
    expect(
      parseCloudinaryDeletionUrl(
        "https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v123/folder/photo.jpg",
      ),
    ).toEqual({
      cloudName: "demo",
      publicId: "folder/photo",
      resourceType: "image",
      version: 123,
    });
  });
  it("preserva la extensión del public_id raw", () => {
    expect(
      parseCloudinaryDeletionUrl(
        "https://res.cloudinary.com/demo/raw/upload/v123/folder/file.pdf",
      )?.publicId,
    ).toBe("folder/file.pdf");
  });
  it.each([
    "http://res.cloudinary.com/demo/image/upload/v1/a.jpg",
    "https://res.cloudinary.com.evil.test/demo/image/upload/v1/a.jpg",
    "https://evil.res.cloudinary.com/demo/image/upload/v1/a.jpg",
    "https://user:pass@res.cloudinary.com/demo/image/upload/v1/a.jpg",
    "https://res.cloudinary.com/demo/image/fetch/v1/a.jpg",
    "https://res.cloudinary.com/demo/image/upload/a.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/a.jpg#foreign",
    "https://res.cloudinary.com/demo/image/upload/v1/a%252fb.jpg",
  ])("rechaza URL ambigua %s", (url) => {
    expect(parseCloudinaryDeletionUrl(url)).toBeNull();
  });
  it.each([
    null,
    [],
    {},
    { publicId: "../foreign" },
    { publicId: "a", userId: "owner" },
    { publicId: "a", ownerId: "owner" },
    { publicId: "a", resourceType: "auto" },
  ])("rechaza payload %j", (payload) => {
    expect(cloudinaryDeletePayloadSchema.safeParse(payload).success).toBe(
      false,
    );
  });
});
