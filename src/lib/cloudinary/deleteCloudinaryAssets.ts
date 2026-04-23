import { v2 as cloudinary } from "cloudinary";
import type { CloudinaryAssetReference } from "./cloudinaryAsset";

export interface CloudinaryAssetDeleteFailure {
  asset: CloudinaryAssetReference;
  error: string;
}

export interface DeleteCloudinaryAssetsResult {
  attempted: number;
  deleted: number;
  alreadyMissing: number;
  failed: number;
  failedAssets: CloudinaryAssetDeleteFailure[];
}

let cloudinaryConfigured = false;

function ensureCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary server configuration.");
  }

  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    cloudinaryConfigured = true;
  }
}

export async function deleteCloudinaryAssets(
  assets: CloudinaryAssetReference[]
): Promise<DeleteCloudinaryAssetsResult> {
  ensureCloudinaryConfig();

  const settled = await Promise.allSettled(
    assets.map(async (asset) => {
      const result = await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
      });

      return {
        asset,
        result: result.result,
      };
    })
  );

  const summary: DeleteCloudinaryAssetsResult = {
    attempted: assets.length,
    deleted: 0,
    alreadyMissing: 0,
    failed: 0,
    failedAssets: [],
  };

  settled.forEach((entry, index) => {
    const asset = assets[index];

    if (entry.status === "rejected") {
      summary.failed += 1;
      summary.failedAssets.push({
        asset,
        error:
          entry.reason instanceof Error
            ? entry.reason.message
            : "Unknown Cloudinary deletion error.",
      });
      return;
    }

    if (entry.value.result === "ok") {
      summary.deleted += 1;
      return;
    }

    if (entry.value.result === "not found") {
      summary.alreadyMissing += 1;
      return;
    }

    summary.failed += 1;
    summary.failedAssets.push({
      asset,
      error: `Cloudinary returned result '${entry.value.result}'.`,
    });
  });

  return summary;
}
