import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { getServerCloudinary } from "./serverCloudinary";

export type GeneratedProductImagePurpose = "CATALOG" | "PROMOTIONAL" | "CUSTOM";

export type SupportedGeneratedImageMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export interface UploadGeneratedProductImageInput {
  imageBase64: string;
  mimeType?: string;
  productId: string;
  promptHash: string;
  purpose: GeneratedProductImagePurpose;
  variantIndex?: number;
  traceId?: string;
}

export type UploadGeneratedProductImageResult =
  | {
      ok: true;
      secureUrl: string;
      publicId: string;
      resourceType: "image";
      format?: string;
      bytes?: number;
      width?: number;
      height?: number;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

const SUPPORTED_MIME_TYPES = new Set<SupportedGeneratedImageMimeType>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const DEFAULT_MIME_TYPE: SupportedGeneratedImageMimeType = "image/png";
const PURPOSES = new Set<GeneratedProductImagePurpose>([
  "CATALOG",
  "PROMOTIONAL",
  "CUSTOM",
]);

function normalizeMimeType(value?: string): SupportedGeneratedImageMimeType | null {
  const normalized = value?.trim().toLowerCase() || DEFAULT_MIME_TYPE;

  return SUPPORTED_MIME_TYPES.has(normalized as SupportedGeneratedImageMimeType)
    ? (normalized as SupportedGeneratedImageMimeType)
    : null;
}

function normalizeVariantIndex(value?: number) {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

function sanitizeAssetSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUploadTarget(input: {
  productId: string;
  promptHash: string;
  purpose: GeneratedProductImagePurpose;
  variantIndex: number;
}) {
  const safeProductId = sanitizeAssetSegment(input.productId);
  const safePromptHash = sanitizeAssetSegment(input.promptHash).slice(0, 12);

  if (!safeProductId || !safePromptHash) {
    return null;
  }

  const purposeLower = input.purpose.toLowerCase();

  return {
    folder: `myckeo/products/generated/${safeProductId}`,
    publicId: `${purposeLower}-${safePromptHash}-v${input.variantIndex}`,
  };
}

function isCloudinaryUploadError(
  error: unknown
): error is UploadApiErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string" &&
    "http_code" in error &&
    typeof (error as { http_code?: unknown }).http_code === "number"
  );
}

function normalizeCloudinaryError(error: unknown): {
  message: string;
  code: string;
  status?: number;
} {
  if (isCloudinaryUploadError(error)) {
    const message = sanitizeCloudinaryErrorMessage(error.message);

    if (error.http_code === 409 || /already exists/i.test(message)) {
      return {
        message: "Ya existe una imagen generada con el mismo public_id.",
        code: "DUPLICATE_PUBLIC_ID",
        status: error.http_code,
      };
    }

    return {
      message,
      code: `CLOUDINARY_${error.http_code}`,
      status: error.http_code,
    };
  }

  if (error instanceof Error) {
    const message = sanitizeCloudinaryErrorMessage(error.message);

    if (/already exists/i.test(message)) {
      return {
        message: "Ya existe una imagen generada con el mismo public_id.",
        code: "DUPLICATE_PUBLIC_ID",
      };
    }

    return {
      message,
      code: "CLOUDINARY_UPLOAD_ERROR",
    };
  }

  return {
    message: "No fue posible subir la imagen generada a Cloudinary.",
    code: "CLOUDINARY_UPLOAD_ERROR",
  };
}

function buildTracePrefix(traceId?: string) {
  return `[uploadGeneratedProductImage][${traceId || "no-trace"}]`;
}

function sanitizeCloudinaryErrorMessage(message: string) {
  return message
    .replace(/Invalid Signature\s+[a-f0-9]+/gi, "Invalid Signature [redacted]")
    .replace(/String to sign\s*-\s*'[^']*'\.?/gi, "String to sign - [redacted].")
    .trim();
}

export async function uploadGeneratedProductImage(
  input: UploadGeneratedProductImageInput
): Promise<UploadGeneratedProductImageResult> {
  const tracePrefix = buildTracePrefix(input.traceId);
  const imageBase64 = input.imageBase64.trim().replace(/\s/g, "");
  const productId = input.productId.trim();
  const promptHash = input.promptHash.trim();
  const mimeType = normalizeMimeType(input.mimeType);
  const variantIndex = normalizeVariantIndex(input.variantIndex);

  if (!imageBase64) {
    return { ok: false, error: "La imagen base64 es obligatoria.", code: "INVALID_INPUT" };
  }

  if (!productId) {
    return { ok: false, error: "El productId es obligatorio.", code: "INVALID_INPUT" };
  }

  if (!promptHash) {
    return { ok: false, error: "El promptHash es obligatorio.", code: "INVALID_INPUT" };
  }

  if (!PURPOSES.has(input.purpose)) {
    return {
      ok: false,
      error: "El propósito de generación no es válido.",
      code: "INVALID_PURPOSE",
    };
  }

  if (!variantIndex) {
    return {
      ok: false,
      error: "variantIndex debe ser un entero positivo.",
      code: "INVALID_VARIANT_INDEX",
    };
  }

  if (!mimeType) {
    return {
      ok: false,
      error: "mimeType no soportado para imágenes generadas.",
      code: "UNSUPPORTED_MIME_TYPE",
    };
  }

  const uploadTarget = buildUploadTarget({
    productId,
    promptHash,
    purpose: input.purpose,
    variantIndex,
  });

  if (!uploadTarget) {
    return {
      ok: false,
      error: "No fue posible construir una ruta segura para Cloudinary.",
      code: "INVALID_ASSET_TARGET",
    };
  }

  try {
    const { cloudinary: configuredCloudinary } = getServerCloudinary();

    console.info(`${tracePrefix} Inicio upload`, {
      productId,
      purpose: input.purpose,
      variantIndex,
      folder: uploadTarget.folder,
      publicId: uploadTarget.publicId,
    });

    const dataUri = `data:${mimeType};base64,${imageBase64}`;
    const result: UploadApiResponse = await configuredCloudinary.uploader.upload(dataUri, {
      folder: uploadTarget.folder,
      public_id: uploadTarget.publicId,
      resource_type: "image",
      overwrite: false,
      unique_filename: false,
    });

    console.info(`${tracePrefix} Upload OK`, {
      productId,
      purpose: input.purpose,
      variantIndex,
      publicId: result.public_id,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    });

    return {
      ok: true,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: "image",
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    const normalizedError = normalizeCloudinaryError(error);
    const diagnostics = (() => {
      try {
        return getServerCloudinary().diagnostics;
      } catch {
        return null;
      }
    })();

    console.error(`${tracePrefix} Upload error`, {
      productId,
      purpose: input.purpose,
      variantIndex,
      folder: uploadTarget.folder,
      publicId: uploadTarget.publicId,
      cloudName: diagnostics?.cloudName,
      apiKeyLast4: diagnostics?.apiKeyLast4,
      hasApiSecret: diagnostics?.hasApiSecret,
      apiSecretLength: diagnostics?.apiSecretLength,
      status: normalizedError.status,
      code: normalizedError.code,
      error: normalizedError.message,
    });

    return {
      ok: false,
      error: normalizedError.message,
      code: normalizedError.code,
    };
  }
}
