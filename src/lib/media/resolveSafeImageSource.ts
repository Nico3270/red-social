export const PLACEHOLDER_PRODUCT_IMAGE = "/imgs/placeholder_productos.png";
export const PLACEHOLDER_BUSINESS_IMAGE = "/imgs/placeholder-negocio-2.png";

const VIDEO_EXTENSION_PATTERN = /\.(mp4|mov|webm|ogg|m3u8)(\?.*)?$/i;
const CLOUDINARY_VIDEO_PATTERN = /\/video\/upload\//i;
const LEGACY_INVALID_IMAGE_PATHS = new Set([
  "/imgs/no-image.png",
  "/imgs/no-image.webp",
  "/imgs/placeholder-producto.png",
  "/placeholder.jpg",
  "/placeholder-image.jpg",
  "/placeholder-product.jpg",
  "/placeholder-service.jpg",
  "/placeholder-resena.jpg",
  "/images/placeholder.jpg",
]);

function getNormalizedMediaValue(value?: string | null): { raw: string; path: string } | null {
  if (!value?.trim()) {
    return null;
  }

  const raw = value.trim();
  let path = raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      path = new URL(raw).pathname || raw;
    } catch {
      path = raw;
    }
  }

  return {
    raw,
    path: path.split(/[?#]/, 1)[0].toLowerCase(),
  };
}

export function isLikelyVideoUrl(value?: string | null): boolean {
  const candidate = getNormalizedMediaValue(value);

  if (!candidate) {
    return false;
  }

  return (
    VIDEO_EXTENSION_PATTERN.test(candidate.raw) ||
    CLOUDINARY_VIDEO_PATTERN.test(candidate.raw)
  );
}

export function isRenderableImageSource(value?: string | null): value is string {
  const candidate = getNormalizedMediaValue(value);

  if (!candidate) {
    return false;
  }

  if (LEGACY_INVALID_IMAGE_PATHS.has(candidate.path)) {
    return false;
  }

  return !isLikelyVideoUrl(candidate.raw);
}

export function resolveSafeImageSource(
  value: string | null | undefined,
  fallback: string
): string {
  const candidate = getNormalizedMediaValue(value);

  return candidate && isRenderableImageSource(candidate.raw) ? candidate.raw : fallback;
}