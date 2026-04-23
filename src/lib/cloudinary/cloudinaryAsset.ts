export type CloudinaryResourceType = "image" | "video" | "raw";

export interface CloudinaryAssetReference {
  url: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
}

const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;
const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|webm|ogg|m3u8)(\?.*)?$/i;
const IMAGE_EXTENSION_PATTERN =
  /\.(png|jpe?g|gif|webp|avif|svg|bmp|tiff?)(\?.*)?$/i;
const VERSION_SEGMENT_PATTERN = /^v\d+$/i;

function normalizeUrl(value: string): string {
  return value.trim();
}

export function isCloudinaryUrl(value?: string | null): value is string {
  if (!value?.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    return CLOUDINARY_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function inferCloudinaryResourceType(
  value?: string | null
): CloudinaryResourceType | null {
  if (!value?.trim()) {
    return null;
  }

  if (/\/video\/upload\//i.test(value)) {
    return "video";
  }

  if (/\/image\/upload\//i.test(value)) {
    return "image";
  }

  if (/\/raw\/upload\//i.test(value)) {
    return "raw";
  }

  if (VIDEO_EXTENSION_PATTERN.test(value)) {
    return "video";
  }

  if (IMAGE_EXTENSION_PATTERN.test(value)) {
    return "image";
  }

  return null;
}

export function extractCloudinaryPublicId(value?: string | null): string | null {
  if (!isCloudinaryUrl(value)) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = pathSegments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1) {
      return null;
    }

    const segmentsAfterUpload = pathSegments.slice(uploadIndex + 1);
    const versionIndex = segmentsAfterUpload.findIndex((segment) =>
      VERSION_SEGMENT_PATTERN.test(segment)
    );

    if (versionIndex === -1) {
      return null;
    }

    const publicIdSegments = segmentsAfterUpload.slice(versionIndex + 1);

    if (publicIdSegments.length === 0) {
      return null;
    }

    const lastSegment = publicIdSegments[publicIdSegments.length - 1];
    const extensionIndex = lastSegment.lastIndexOf(".");
    const normalizedLastSegment =
      extensionIndex > 0 ? lastSegment.slice(0, extensionIndex) : lastSegment;

    const normalizedSegments = [
      ...publicIdSegments.slice(0, -1),
      normalizedLastSegment,
    ].filter(Boolean);

    if (normalizedSegments.length === 0) {
      return null;
    }

    return decodeURIComponent(normalizedSegments.join("/"));
  } catch {
    return null;
  }
}

export function getCloudinaryAssetReference(
  value?: string | null
): CloudinaryAssetReference | null {
  if (!value?.trim()) {
    return null;
  }

  const url = normalizeUrl(value);
  const publicId = extractCloudinaryPublicId(url);
  const resourceType = inferCloudinaryResourceType(url);

  if (!publicId || !resourceType) {
    return null;
  }

  return {
    url,
    publicId,
    resourceType,
  };
}

export function dedupeCloudinaryAssetReferences(
  assets: CloudinaryAssetReference[]
): CloudinaryAssetReference[] {
  const seen = new Set<string>();

  return assets.filter((asset) => {
    const key = `${asset.resourceType}:${asset.publicId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
