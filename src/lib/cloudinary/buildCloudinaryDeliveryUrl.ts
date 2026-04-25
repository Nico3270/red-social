export type CloudinaryImagePreset =
  | "avatar"
  | "business-cover"
  | "product-card"
  | "product-detail"
  | "publication-preview"
  | "publication-detail"
  | "thumbnail"
  | "modal"
  | "og-image";

export interface BuildCloudinaryDeliveryUrlOptions {
  preset?: CloudinaryImagePreset;
  width?: number;
  height?: number;
  crop?: "fill" | "limit" | "fit" | "thumb" | "scale";
  gravity?: "auto" | "center" | "face" | "faces";
  quality?: "auto" | "auto:eco" | "auto:good" | "auto:best";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  extraTransforms?: string[];
  allowSvg?: boolean;
}

type PresetOptions = Omit<
  BuildCloudinaryDeliveryUrlOptions,
  "preset" | "extraTransforms" | "allowSvg"
>;

const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;
const VERSION_SEGMENT_PATTERN = /^v\d+$/i;
const GIF_EXTENSION_PATTERN = /\.gif$/i;
const SVG_EXTENSION_PATTERN = /\.svg$/i;

const PRESET_OPTIONS: Record<CloudinaryImagePreset, PresetOptions> = {
  avatar: {
    format: "auto",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 160,
    height: 160,
  },
  "business-cover": {
    format: "auto",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 1200,
    height: 400,
  },
  "product-card": {
    format: "auto",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 640,
    height: 640,
  },
  "product-detail": {
    format: "auto",
    quality: "auto:good",
    crop: "limit",
    width: 1200,
    height: 1200,
  },
  "publication-preview": {
    format: "auto",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 720,
    height: 540,
  },
  "publication-detail": {
    format: "auto",
    quality: "auto:good",
    crop: "limit",
    width: 1200,
    height: 1200,
  },
  thumbnail: {
    format: "auto",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 240,
    height: 240,
  },
  modal: {
    format: "auto",
    quality: "auto:good",
    crop: "limit",
    width: 1400,
    height: 1400,
  },
  "og-image": {
    format: "auto",
    quality: "auto:good",
    crop: "fill",
    gravity: "auto",
    width: 1200,
    height: 630,
  },
};

function isCloudinaryUrl(value?: string | null): value is string {
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

function getUrlPathname(value: string): string | null {
  try {
    return new URL(value.trim()).pathname;
  } catch {
    return null;
  }
}

function isProbablySvg(value?: string | null): boolean {
  if (!value?.trim()) {
    return false;
  }

  const pathname = getUrlPathname(value);
  return pathname ? SVG_EXTENSION_PATTERN.test(pathname.toLowerCase()) : false;
}

function isProbablyGif(value?: string | null): boolean {
  if (!value?.trim()) {
    return false;
  }

  const pathname = getUrlPathname(value);
  return pathname ? GIF_EXTENSION_PATTERN.test(pathname.toLowerCase()) : false;
}

function isTransformToken(value: string): boolean {
  return /^(?:a|ar|b|bo|c|co|dpr|e|f|fl|g|h|l|o|q|r|t|u|w|x|y|z)_[a-z0-9_$:.,\-!]+$/i.test(
    value
  );
}

function isTransformSegment(value: string): boolean {
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.length > 0 && tokens.some(isTransformToken);
}

function hasExistingCloudinaryTransform(value?: string | null): boolean {
  if (!isCloudinaryUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = pathSegments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1) {
      return false;
    }

    const segmentsAfterUpload = pathSegments.slice(uploadIndex + 1);

    for (const segment of segmentsAfterUpload) {
      if (VERSION_SEGMENT_PATTERN.test(segment)) {
        return false;
      }

      if (isTransformSegment(segment)) {
        return true;
      }

      return false;
    }

    return false;
  } catch {
    return false;
  }
}

function normalizeTransformPart(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split(/[,/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(",");

  return normalized || null;
}

function normalizeDimension(value?: number): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function buildTransformFromOptions(
  options: BuildCloudinaryDeliveryUrlOptions = {}
): string | null {
  const presetOptions = options.preset ? PRESET_OPTIONS[options.preset] : {};
  const mergedOptions: BuildCloudinaryDeliveryUrlOptions = {
    ...presetOptions,
    ...options,
  };
  const width = normalizeDimension(mergedOptions.width);
  const height = normalizeDimension(mergedOptions.height);

  const transformParts = [
    mergedOptions.format ? `f_${mergedOptions.format}` : null,
    mergedOptions.quality ? `q_${mergedOptions.quality}` : null,
    mergedOptions.crop ? `c_${mergedOptions.crop}` : null,
    mergedOptions.gravity ? `g_${mergedOptions.gravity}` : null,
    width ? `w_${width}` : null,
    height ? `h_${height}` : null,
    ...(mergedOptions.extraTransforms ?? []),
  ];

  const normalizedParts = transformParts
    .map((part) => normalizeTransformPart(part))
    .filter((part): part is string => Boolean(part));

  return normalizedParts.length > 0 ? normalizedParts.join(",") : null;
}

export function buildCloudinaryDeliveryUrl(
  url: null,
  options?: BuildCloudinaryDeliveryUrlOptions
): null;
export function buildCloudinaryDeliveryUrl(
  url: undefined,
  options?: BuildCloudinaryDeliveryUrlOptions
): undefined;
export function buildCloudinaryDeliveryUrl(
  url: string,
  options?: BuildCloudinaryDeliveryUrlOptions
): string;
export function buildCloudinaryDeliveryUrl(
  url: string | null | undefined,
  options?: BuildCloudinaryDeliveryUrlOptions
): string | null | undefined;
export function buildCloudinaryDeliveryUrl(
  url?: string | null,
  options: BuildCloudinaryDeliveryUrlOptions = {}
): string | null | undefined {
  if (!url?.trim()) {
    return url;
  }

  const originalUrl = url;
  const normalizedUrl = url.trim();

  if (!isCloudinaryUrl(normalizedUrl)) {
    return originalUrl;
  }

  if (
    (isProbablySvg(normalizedUrl) && !options.allowSvg) ||
    isProbablyGif(normalizedUrl)
  ) {
    return originalUrl;
  }

  if (hasExistingCloudinaryTransform(normalizedUrl)) {
    return originalUrl;
  }

  const transform = buildTransformFromOptions(options);

  if (!transform) {
    return originalUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const pathSegments = parsed.pathname.split("/");
    const uploadIndex = pathSegments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1) {
      return originalUrl;
    }

    const resourceType = pathSegments[uploadIndex - 1];

    if (
      (resourceType !== "image" && resourceType !== "video") ||
      pathSegments.slice(uploadIndex + 1).filter(Boolean).length === 0
    ) {
      return originalUrl;
    }

    pathSegments.splice(uploadIndex + 1, 0, transform);
    parsed.pathname = pathSegments.join("/");

    return parsed.toString();
  } catch {
    return originalUrl;
  }
}

export function getCloudinaryImageUrl(
  url: null,
  preset: CloudinaryImagePreset
): null;
export function getCloudinaryImageUrl(
  url: undefined,
  preset: CloudinaryImagePreset
): undefined;
export function getCloudinaryImageUrl(
  url: string,
  preset: CloudinaryImagePreset
): string;
export function getCloudinaryImageUrl(
  url: string | null | undefined,
  preset: CloudinaryImagePreset
): string | null | undefined;
export function getCloudinaryImageUrl(
  url: string | null | undefined,
  preset: CloudinaryImagePreset
): string | null | undefined {
  return buildCloudinaryDeliveryUrl(url, { preset });
}
