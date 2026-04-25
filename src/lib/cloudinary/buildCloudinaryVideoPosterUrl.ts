export type CloudinaryVideoPosterPreset =
  | "thumbnail"
  | "publication-preview"
  | "publication-detail"
  | "modal";

export interface BuildCloudinaryVideoPosterUrlOptions {
  preset?: CloudinaryVideoPosterPreset;
  width?: number;
  height?: number;
  crop?: "fill" | "limit" | "fit" | "thumb" | "scale";
  gravity?: "auto" | "center" | "face" | "faces";
  quality?: "auto" | "auto:eco" | "auto:good" | "auto:best";
  format?: "jpg" | "webp";
  startOffset?: number;
  extraTransforms?: string[];
}

type PresetOptions = Omit<
  BuildCloudinaryVideoPosterUrlOptions,
  "preset" | "extraTransforms"
>;

interface ResolvedPosterOptions {
  width: number | null;
  height: number | null;
  crop?: BuildCloudinaryVideoPosterUrlOptions["crop"];
  gravity?: BuildCloudinaryVideoPosterUrlOptions["gravity"];
  quality?: BuildCloudinaryVideoPosterUrlOptions["quality"];
  format?: BuildCloudinaryVideoPosterUrlOptions["format"];
  startOffset: number | null;
  extraTransforms: string[];
}

interface SplitCloudinaryVideoPathResult {
  parsedUrl: URL;
  cloudName: string;
  versionSegment: string | null;
  publicIdSegments: string[];
}

const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;
const VERSION_SEGMENT_PATTERN = /^v\d+$/i;
const TRANSFORM_TOKEN_PATTERN =
  /^(?:a|ac|af|ar|b|bo|br|c|co|d|dl|dn|dpr|du|e|eo|f|fl|fps|g|h|ki|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_[a-z0-9:$.,\-!]+$/i;

const PRESET_OPTIONS: Record<CloudinaryVideoPosterPreset, PresetOptions> = {
  thumbnail: {
    format: "jpg",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 240,
    height: 240,
    startOffset: 1,
  },
  "publication-preview": {
    format: "jpg",
    quality: "auto:eco",
    crop: "fill",
    gravity: "auto",
    width: 720,
    height: 540,
    startOffset: 1,
  },
  "publication-detail": {
    format: "jpg",
    quality: "auto:good",
    crop: "limit",
    width: 1200,
    height: 1200,
    startOffset: 1,
  },
  modal: {
    format: "jpg",
    quality: "auto:good",
    crop: "limit",
    width: 1400,
    height: 1400,
    startOffset: 1,
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

function isCloudinaryVideoUrl(value?: string | null): value is string {
  if (!isCloudinaryUrl(value)) {
    return false;
  }

  try {
    const parsed = new URL(value.trim());
    const pathSegments = parsed.pathname.split("/").filter(Boolean);

    return (
      pathSegments.length >= 4 &&
      pathSegments[1] === "video" &&
      pathSegments[2] === "upload"
    );
  } catch {
    return false;
  }
}

function normalizeDimension(value?: number): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function normalizeStartOffset(value?: number): number | null {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (Number.isInteger(value)) {
    return value;
  }

  return Number(value.toFixed(3));
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

function isTransformSegment(value: string): boolean {
  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.length > 0 && tokens.every((token) => TRANSFORM_TOKEN_PATTERN.test(token));
}

function hasExplicitPosterOptions(
  options: BuildCloudinaryVideoPosterUrlOptions = {}
): boolean {
  return Boolean(
    options.width !== undefined ||
      options.height !== undefined ||
      options.crop ||
      options.gravity ||
      options.quality ||
      options.format ||
      options.startOffset !== undefined ||
      options.extraTransforms?.length
  );
}

function resolvePosterOptions(
  options: BuildCloudinaryVideoPosterUrlOptions = {}
): ResolvedPosterOptions {
  const resolvedPreset = options.preset ??
    (!hasExplicitPosterOptions(options) ? "publication-preview" : undefined);
  const presetOptions = resolvedPreset ? PRESET_OPTIONS[resolvedPreset] : {};
  const mergedOptions: BuildCloudinaryVideoPosterUrlOptions = {
    ...presetOptions,
    ...options,
  };

  return {
    width: normalizeDimension(mergedOptions.width),
    height: normalizeDimension(mergedOptions.height),
    crop: mergedOptions.crop,
    gravity: mergedOptions.gravity,
    quality: mergedOptions.quality,
    format: mergedOptions.format,
    startOffset: normalizeStartOffset(mergedOptions.startOffset),
    extraTransforms: mergedOptions.extraTransforms ?? [],
  };
}

function formatNumericTransformValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toString();
}

function buildVideoPosterTransform(
  options: BuildCloudinaryVideoPosterUrlOptions = {}
): string | null {
  const resolvedOptions = resolvePosterOptions(options);
  const transformParts = [
    resolvedOptions.startOffset !== null
      ? `so_${formatNumericTransformValue(resolvedOptions.startOffset)}`
      : null,
    resolvedOptions.format ? `f_${resolvedOptions.format}` : null,
    resolvedOptions.quality ? `q_${resolvedOptions.quality}` : null,
    resolvedOptions.crop ? `c_${resolvedOptions.crop}` : null,
    resolvedOptions.gravity ? `g_${resolvedOptions.gravity}` : null,
    resolvedOptions.width ? `w_${resolvedOptions.width}` : null,
    resolvedOptions.height ? `h_${resolvedOptions.height}` : null,
    ...resolvedOptions.extraTransforms,
  ];

  const normalizedParts = transformParts
    .map((part) => normalizeTransformPart(part))
    .filter((part): part is string => Boolean(part));

  return normalizedParts.length > 0 ? normalizedParts.join(",") : null;
}

function replaceFileExtension(value: string, extension: "jpg" | "webp"): string {
  const lastDotIndex = value.lastIndexOf(".");
  const hasExtension =
    lastDotIndex > 0 && /^[a-z0-9]{2,5}$/i.test(value.slice(lastDotIndex + 1));

  if (!hasExtension) {
    return `${value}.${extension}`;
  }

  return `${value.slice(0, lastDotIndex)}.${extension}`;
}

function splitCloudinaryVideoPath(url: string): SplitCloudinaryVideoPathResult | null {
  if (!isCloudinaryVideoUrl(url)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url.trim());
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
    const [cloudName, resourceType, deliveryType, ...segmentsAfterUpload] = pathSegments;

    if (
      !cloudName ||
      resourceType !== "video" ||
      deliveryType !== "upload" ||
      segmentsAfterUpload.length === 0
    ) {
      return null;
    }

    const versionIndex = segmentsAfterUpload.findIndex((segment) =>
      VERSION_SEGMENT_PATTERN.test(segment)
    );

    let versionSegment: string | null = null;
    let publicIdSegments: string[] = [];

    if (versionIndex !== -1) {
      versionSegment = segmentsAfterUpload[versionIndex];
      publicIdSegments = segmentsAfterUpload.slice(versionIndex + 1);
    } else {
      let publicIdStartIndex = 0;

      while (publicIdStartIndex < segmentsAfterUpload.length) {
        const segment = segmentsAfterUpload[publicIdStartIndex];

        if (!isTransformSegment(segment)) {
          break;
        }

        if (!segment.includes(",")) {
          // Without a version segment, a single-token transform is ambiguous with folder names.
          return null;
        }

        publicIdStartIndex += 1;
      }

      publicIdSegments = segmentsAfterUpload.slice(publicIdStartIndex);
    }

    if (publicIdSegments.length === 0) {
      return null;
    }

    return {
      parsedUrl,
      cloudName,
      versionSegment,
      publicIdSegments,
    };
  } catch {
    return null;
  }
}

export function buildCloudinaryVideoPosterUrl(
  url: string | null | undefined,
  options: BuildCloudinaryVideoPosterUrlOptions = {}
): string | null {
  if (!url?.trim()) {
    return null;
  }

  const splitPath = splitCloudinaryVideoPath(url);
  const transform = buildVideoPosterTransform(options);

  if (!splitPath || !transform) {
    return null;
  }

  const resolvedOptions = resolvePosterOptions(options);
  const posterExtension = resolvedOptions.format ?? "jpg";
  const posterSegments = [...splitPath.publicIdSegments];
  const lastSegment = posterSegments[posterSegments.length - 1];

  posterSegments[posterSegments.length - 1] = replaceFileExtension(lastSegment, posterExtension);

  splitPath.parsedUrl.pathname = [
    "",
    splitPath.cloudName,
    "video",
    "upload",
    transform,
    ...(splitPath.versionSegment ? [splitPath.versionSegment] : []),
    ...posterSegments,
  ].join("/");

  return splitPath.parsedUrl.toString();
}

export function getCloudinaryVideoPosterUrl(
  url: string | null | undefined,
  preset: CloudinaryVideoPosterPreset = "publication-preview"
): string | null {
  return buildCloudinaryVideoPosterUrl(url, { preset });
}