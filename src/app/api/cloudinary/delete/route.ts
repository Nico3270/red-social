import { NextResponse } from "next/server";
import {
  getCloudinaryAssetReference,
  type CloudinaryResourceType,
} from "@/lib/cloudinary/cloudinaryAsset";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/deleteCloudinaryAssets";

export async function POST(req: Request) {
  try {
    const {
      publicId,
      resourceType,
      url,
    }: {
      publicId?: string;
      resourceType?: CloudinaryResourceType;
      url?: string;
    } = await req.json();

    const normalizedPublicId = typeof publicId === "string" ? publicId.trim() : "";
    const assetFromUrl = !normalizedPublicId ? getCloudinaryAssetReference(url) : null;
    const resolvedPublicId = normalizedPublicId || assetFromUrl?.publicId || "";
    const resolvedResourceType =
      resourceType || assetFromUrl?.resourceType || "image";

    if (!resolvedPublicId) {
      console.error("Delete request failed: publicId or a parsable Cloudinary URL is required");
      return NextResponse.json(
        {
          success: false,
          error: "publicId or a parsable Cloudinary URL is required",
        },
        { status: 400 }
      );
    }

    const result = await deleteCloudinaryAssets([
      {
        url: typeof url === "string" ? url.trim() : "",
        publicId: resolvedPublicId,
        resourceType: resolvedResourceType,
      },
    ]);

    if (result.failed > 0) {
      console.error("Cloudinary delete failed:", result.failedAssets[0]);
      return NextResponse.json(
        {
          success: false,
          error: result.failedAssets[0]?.error || "Failed to delete asset.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      alreadyMissing: result.alreadyMissing,
      resourceType: resolvedResourceType,
      publicId: resolvedPublicId,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Cloudinary delete error:", {
        message: error.message,
        name: error.name,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // fallback si no es instancia de Error
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { success: false, error: "Unknown server error" },
      { status: 500 }
    );
  }
}
