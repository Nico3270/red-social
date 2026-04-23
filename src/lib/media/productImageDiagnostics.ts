import { isRenderableImageSource } from "./resolveSafeImageSource";

type DiagnosticLogLevel = "info" | "warn";

type ImageDiagnosticInput = {
  area: string;
  event: string;
  message: string;
  product?: {
    id?: string | null;
    slug?: string | null;
    nombre?: string | null;
    status?: string | null;
    negocioSlug?: string | null;
  };
  imageUrls: unknown[];
  selectedImageUrl?: unknown;
  context?: Record<string, unknown>;
  level?: DiagnosticLogLevel;
  dedupeKey?: string;
};

const loggedDiagnostics = new Set<string>();

function isServerRuntime() {
  return typeof window === "undefined";
}

export function shouldLogProductImageDiagnostics() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ADMIN_PRODUCT_IMAGE_DEBUG === "true" ||
    (isServerRuntime() && process.env.ADMIN_PRODUCT_IMAGE_DEBUG === "true")
  );
}

function summarizeImageValue(value: unknown) {
  if (typeof value !== "string") {
    return {
      type: typeof value,
      renderable: false,
      reason: "not-string",
    };
  }

  const trimmed = value.trim();

  return {
    type: "string",
    url: trimmed,
    length: trimmed.length,
    startsCloudinary: trimmed.startsWith("https://res.cloudinary.com/"),
    hasWhitespace: /\s/.test(value),
    renderable: isRenderableImageSource(trimmed),
  };
}

export function buildImageDiagnosticsSummary(imageUrls: unknown[]) {
  const images = imageUrls.map(summarizeImageValue);
  const renderableCount = images.filter((image) => image.renderable).length;

  return {
    count: imageUrls.length,
    renderableCount,
    discardedCount: imageUrls.length - renderableCount,
    images: images.slice(0, 6),
  };
}

export function logProductImageDiagnostics({
  area,
  event,
  message,
  product,
  imageUrls,
  selectedImageUrl,
  context,
  level = "info",
  dedupeKey,
}: ImageDiagnosticInput) {
  if (!shouldLogProductImageDiagnostics()) {
    return;
  }

  const key =
    dedupeKey ??
    `${area}:${event}:${product?.id ?? product?.slug ?? "unknown"}:${imageUrls.join("|")}:${String(selectedImageUrl ?? "")}`;

  if (loggedDiagnostics.has(key)) {
    return;
  }

  loggedDiagnostics.add(key);

  if (loggedDiagnostics.size > 150) {
    loggedDiagnostics.clear();
  }

  const payload = {
    product,
    imageSummary: buildImageDiagnosticsSummary(imageUrls),
    selectedImage: summarizeImageValue(selectedImageUrl),
    context,
  };

  const logger = level === "warn" ? console.warn : console.info;
  logger(`[product-image-diagnostics][${area}][${event}] ${message}`, payload);
}
