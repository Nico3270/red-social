import { deleteCloudinaryAssets } from "../src/lib/cloudinary/deleteCloudinaryAssets";
import { uploadGeneratedProductImage } from "../src/lib/cloudinary/uploadGeneratedProductImage";
import { loadLocalEnv } from "./load-local-env.mjs";

const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

async function main() {
  loadLocalEnv({ cwd: process.cwd() });

  const traceId = `debug-cloudinary-upload-${Date.now()}`;
  const uploadResult = await uploadGeneratedProductImage({
    imageBase64: ONE_PIXEL_PNG_BASE64,
    mimeType: "image/png",
    productId: "debug-cloudinary-upload",
    promptHash: "debugcloudinaryupload",
    purpose: "CATALOG",
    variantIndex: 1,
    traceId,
  });

  if (!uploadResult.ok) {
    console.error("[test-cloudinary-generated-upload] Upload failed", {
      traceId,
      ok: uploadResult.ok,
      code: uploadResult.code,
      error: uploadResult.error,
    });
    process.exitCode = 1;
    return;
  }

  console.info("[test-cloudinary-generated-upload] Upload OK", {
    traceId,
    publicId: uploadResult.publicId,
    secureUrl: uploadResult.secureUrl,
    bytes: uploadResult.bytes,
    width: uploadResult.width,
    height: uploadResult.height,
  });

  const cleanupResult = await deleteCloudinaryAssets([
    {
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      resourceType: "image",
    },
  ]);

  console.info("[test-cloudinary-generated-upload] Cleanup result", {
    traceId,
    attempted: cleanupResult.attempted,
    deleted: cleanupResult.deleted,
    alreadyMissing: cleanupResult.alreadyMissing,
    failed: cleanupResult.failed,
  });

  if (cleanupResult.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[test-cloudinary-generated-upload] Unexpected failure", {
    error: error instanceof Error ? error.message : "Unknown error",
  });
  process.exitCode = 1;
});