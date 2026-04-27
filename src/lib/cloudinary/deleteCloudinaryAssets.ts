import type { CloudinaryAssetReference } from "./cloudinaryAsset";
import { getServerCloudinary } from "./serverCloudinary";

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

export async function deleteCloudinaryAssets(
  assets: CloudinaryAssetReference[]
): Promise<DeleteCloudinaryAssetsResult> {
  const { cloudinary: configuredCloudinary } = getServerCloudinary();

  const settled = await Promise.allSettled(
    assets.map(async (asset) => {
      const result = await configuredCloudinary.uploader.destroy(asset.publicId, {
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
