import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import type {
  ImageGenerateParams,
  ImagesResponse,
} from "openai/resources/images";

export type ProductImageGenerationQuality = "low" | "medium" | "high" | "auto";
export type ProductImageOutputFormat = "png" | "jpeg" | "webp";
export type ProductImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface GenerateProductImageInput {
  prompt: string;
  model?: string;
  size?: string;
  quality?: ProductImageGenerationQuality;
  outputFormat?: ProductImageOutputFormat;
  userId?: string;
  traceId?: string;
}

export type GenerateProductImageResult =
  | {
      ok: true;
      imageBase64: string;
      mimeType: ProductImageMimeType;
      model: string;
      size: string;
      quality: ProductImageGenerationQuality;
      outputFormat: ProductImageOutputFormat;
      revisedPrompt?: string;
      usage?: unknown;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      providerStatus?: number;
      providerCode?: string;
      providerType?: string;
      requestId?: string;
    };

export type GenerateProductImageErrorCode =
  | "missing_api_key"
  | "unauthorized"
  | "permission_denied"
  | "rate_limited"
  | "insufficient_quota"
  | "invalid_model"
  | "bad_request"
  | "content_policy"
  | "empty_image_response"
  | "unsupported_parameter"
  | "unknown_error";

export interface NormalizedOpenAIImageError {
  message: string;
  code: GenerateProductImageErrorCode;
  providerStatus?: number;
  providerCode?: string;
  providerType?: string;
  requestId?: string;
  errorMessageSafe?: string;
  errorName?: string;
  errorClassName?: string;
}

type SupportedImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

const DEFAULT_MODEL = "gpt-image-1-mini";
const DEFAULT_SIZE: SupportedImageSize = "1024x1024";
const DEFAULT_QUALITY: ProductImageGenerationQuality = "low";
const DEFAULT_OUTPUT_FORMAT: ProductImageOutputFormat = "png";
const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 4000;
const MAX_SAFE_ERROR_MESSAGE_LENGTH = 280;

const SUPPORTED_SIZES = new Set<SupportedImageSize>([
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "auto",
]);

const SUPPORTED_QUALITIES = new Set<ProductImageGenerationQuality>([
  "low",
  "medium",
  "high",
  "auto",
]);

const SUPPORTED_OUTPUT_FORMATS = new Set<ProductImageOutputFormat>([
  "png",
  "jpeg",
  "webp",
]);

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("missing_api_key");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function getDefaultModel() {
  return process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function normalizeSize(value?: string): SupportedImageSize | null {
  const normalized = value?.trim() || DEFAULT_SIZE;
  return SUPPORTED_SIZES.has(normalized as SupportedImageSize)
    ? (normalized as SupportedImageSize)
    : null;
}

function normalizeQuality(
  value?: ProductImageGenerationQuality
): ProductImageGenerationQuality | null {
  const normalized = value || DEFAULT_QUALITY;
  return SUPPORTED_QUALITIES.has(normalized) ? normalized : null;
}

function normalizeOutputFormat(
  value?: ProductImageOutputFormat
): ProductImageOutputFormat | null {
  const normalized = value || DEFAULT_OUTPUT_FORMAT;
  return SUPPORTED_OUTPUT_FORMATS.has(normalized) ? normalized : null;
}

function mimeTypeForOutputFormat(
  outputFormat: ProductImageOutputFormat
): ProductImageMimeType {
  if (outputFormat === "jpeg") return "image/jpeg";
  if (outputFormat === "webp") return "image/webp";
  return "image/png";
}

function buildTracePrefix(traceId?: string) {
  return `[generateProductImage][${traceId || "no-trace"}]`;
}

function safeErrorMessage(message: unknown) {
  if (typeof message !== "string") return undefined;
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, MAX_SAFE_ERROR_MESSAGE_LENGTH) : undefined;
}

function isGptImageModel(model: string) {
  return model.trim().toLowerCase().startsWith("gpt-image-");
}

function isDallE3Model(model: string) {
  return model.trim().toLowerCase() === "dall-e-3";
}

function isDallE2Model(model: string) {
  return model.trim().toLowerCase() === "dall-e-2";
}

function buildImageGenerateParams(input: {
  model: string;
  prompt: string;
  size: SupportedImageSize;
  quality: ProductImageGenerationQuality;
  outputFormat: ProductImageOutputFormat;
  userId?: string;
}): ImageGenerateParams {
  const params: ImageGenerateParams = {
    model: input.model,
    prompt: input.prompt,
    n: 1,
    user: input.userId,
  };

  if (isGptImageModel(input.model)) {
    params.size = input.size;
    params.quality = input.quality;
    params.output_format = input.outputFormat;
    return params;
  }

  params.response_format = "b64_json";

  if (input.size === "1024x1024") {
    params.size = input.size;
  }

  if (isDallE3Model(input.model)) {
    params.quality = "auto";
    return params;
  }

  if (isDallE2Model(input.model)) {
    return params;
  }

  return params;
}

export function extractGeneratedImageBase64(input: {
  response: Pick<ImagesResponse, "data">;
  outputFormat: ProductImageOutputFormat;
}):
  | {
      ok: true;
      imageBase64: string;
      mimeType: ProductImageMimeType;
      revisedPrompt?: string;
    }
  | {
      ok: false;
      error: string;
      code: "empty_image_response";
    } {
  const image = input.response.data?.[0];
  const imageBase64 = image?.b64_json?.trim();

  if (!imageBase64) {
    return {
      ok: false,
      error: "OpenAI no devolvió una imagen base64.",
      code: "empty_image_response",
    };
  }

  return {
    ok: true,
    imageBase64,
    mimeType: mimeTypeForOutputFormat(input.outputFormat),
    revisedPrompt: image?.revised_prompt,
  };
}

export function normalizeOpenAIImageError(
  error: unknown,
): NormalizedOpenAIImageError {
  if (error instanceof Error && error.message === "missing_api_key") {
    return {
      message: "No se encontró OPENAI_API_KEY en el entorno.",
      code: "missing_api_key",
    };
  }

  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          status?: unknown;
          code?: unknown;
          type?: unknown;
          message?: unknown;
          request_id?: unknown;
          error?: {
            code?: unknown;
            type?: unknown;
            message?: unknown;
            request_id?: unknown;
          };
          constructor?: { name?: unknown };
          name?: unknown;
        })
      : null;

  const providerStatus =
    typeof candidate?.status === "number"
      ? candidate.status
      : error instanceof APIError && typeof error.status === "number"
        ? error.status
        : undefined;
  const providerCode =
    typeof candidate?.code === "string"
      ? candidate.code
      : typeof candidate?.error?.code === "string"
        ? candidate.error.code
        : error instanceof APIError && typeof error.code === "string"
          ? error.code
          : undefined;
  const providerType =
    typeof candidate?.type === "string"
      ? candidate.type
      : typeof candidate?.error?.type === "string"
        ? candidate.error.type
        : error instanceof APIError && typeof error.type === "string"
          ? error.type
          : undefined;
  const rawMessage =
    typeof candidate?.message === "string"
      ? candidate.message
      : typeof candidate?.error?.message === "string"
        ? candidate.error.message
        : error instanceof Error
          ? error.message
          : undefined;
  const requestId =
    typeof candidate?.request_id === "string"
      ? candidate.request_id
      : typeof candidate?.error?.request_id === "string"
        ? candidate.error.request_id
        : error instanceof APIError && typeof error.request_id === "string"
          ? error.request_id
          : undefined;
  const errorName =
    error instanceof Error
      ? error.name
      : typeof candidate?.name === "string"
        ? candidate.name
        : undefined;
  const errorClassName =
    typeof candidate?.constructor?.name === "string"
      ? candidate.constructor.name
      : undefined;
  const errorMessageSafe = safeErrorMessage(rawMessage);
  const signal = [
    providerCode,
    providerType,
    errorMessageSafe,
    errorName,
    errorClassName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const base = {
    providerStatus,
    providerCode,
    providerType,
    requestId,
    errorMessageSafe,
    errorName,
    errorClassName,
  } satisfies Omit<NormalizedOpenAIImageError, "message" | "code">;

  if (
    error instanceof AuthenticationError ||
    providerStatus === 401 ||
    signal.includes("authentication")
  ) {
    return {
      message: "La clave de OpenAI no es válida o no tiene acceso al proyecto configurado.",
      code: "unauthorized",
      ...base,
    };
  }

  if (
    error instanceof PermissionDeniedError ||
    providerStatus === 403 ||
    signal.includes("permission_denied")
  ) {
    return {
      message: "La clave de OpenAI no tiene permisos para generar imágenes con este proyecto o modelo.",
      code: "permission_denied",
      ...base,
    };
  }

  if (
    (error instanceof RateLimitError || providerStatus === 429) &&
    (signal.includes("insufficient_quota") || signal.includes("quota"))
  ) {
    return {
      message:
        "La cuenta o proyecto de OpenAI no tiene cuota disponible. Revisa billing, créditos y presupuesto.",
      code: "insufficient_quota",
      ...base,
    };
  }

  if (error instanceof RateLimitError || providerStatus === 429) {
    return {
      message: "OpenAI está limitando temporalmente las solicitudes.",
      code: "rate_limited",
      ...base,
    };
  }

  if (
    error instanceof NotFoundError ||
    providerStatus === 404 ||
    signal.includes("model_not_found") ||
    signal.includes("invalid model") ||
    signal.includes("unknown model") ||
    signal.includes("does not exist")
  ) {
    return {
      message: "El modelo de imagen configurado no existe o no está disponible para esta cuenta.",
      code: "invalid_model",
      ...base,
    };
  }

  if (
    (error instanceof BadRequestError || providerStatus === 400 || providerStatus === 422) &&
    (signal.includes("content_policy") ||
      signal.includes("content policy") ||
      signal.includes("safety") ||
      signal.includes("moderation") ||
      signal.includes("policy_violation") ||
      signal.includes("content_filter"))
  ) {
    return {
      message:
        "OpenAI rechazó el prompt por políticas de contenido. Ajusta la descripción visual.",
      code: "content_policy",
      ...base,
    };
  }

  if (
    (error instanceof BadRequestError || providerStatus === 400 || providerStatus === 422) &&
    (signal.includes("unsupported") ||
      signal.includes("not supported") ||
      signal.includes("unknown parameter") ||
      signal.includes("unsupported parameter") ||
      signal.includes("extra inputs") ||
      signal.includes("response_format") ||
      signal.includes("output_format") ||
      signal.includes("quality"))
  ) {
    return {
      message:
        "OpenAI rechazó uno de los parámetros enviados para generar la imagen.",
      code: "unsupported_parameter",
      ...base,
    };
  }

  if (
    error instanceof BadRequestError ||
    providerStatus === 400 ||
    providerStatus === 422
  ) {
    return {
      message: "OpenAI rechazó la solicitud de generación de imagen.",
      code: "bad_request",
      ...base,
    };
  }

  if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIConnectionError
  ) {
    return {
      message: "No fue posible conectar con OpenAI para generar la imagen.",
      code: "unknown_error",
      ...base,
    };
  }

  return {
    message: "No fue posible generar la imagen del producto con OpenAI.",
    code: "unknown_error",
    ...base,
  };
}

export async function generateProductImage(
  input: GenerateProductImageInput
): Promise<GenerateProductImageResult> {
  const tracePrefix = buildTracePrefix(input.traceId);
  const startedAt = Date.now();
  const prompt = input.prompt.trim();
  const model = input.model?.trim() || getDefaultModel();
  const size = normalizeSize(input.size);
  const quality = normalizeQuality(input.quality);
  const outputFormat = normalizeOutputFormat(input.outputFormat);

  if (prompt.length < MIN_PROMPT_LENGTH) {
    return {
      ok: false,
      error: "El prompt debe tener al menos 10 caracteres.",
      code: "invalid_prompt",
    };
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      ok: false,
      error: "El prompt es demasiado largo para generación de imagen.",
      code: "invalid_prompt",
    };
  }

  if (!size) {
    return {
      ok: false,
      error: "El tamaño solicitado para la imagen no es válido.",
      code: "invalid_size",
    };
  }

  if (!quality) {
    return {
      ok: false,
      error: "La calidad solicitada para la imagen no es válida.",
      code: "invalid_quality",
    };
  }

  if (!outputFormat) {
    return {
      ok: false,
      error: "El formato de salida solicitado no es válido.",
      code: "invalid_output_format",
    };
  }

  try {
    const client = getOpenAIClient();

    console.info(`${tracePrefix} Inicio generación`, {
      model,
      size,
      quality,
      outputFormat,
      userId: input.userId,
    });

    const params = buildImageGenerateParams({
      model,
      prompt,
      size,
      quality,
      outputFormat,
      userId: input.userId,
    });

    const response = await client.images.generate(params);
    const extractedImage = extractGeneratedImageBase64({
      response,
      outputFormat,
    });

    if (!extractedImage.ok) {
      console.warn(`${tracePrefix} Respuesta sin imagen base64`, {
        model,
        size,
        quality,
        outputFormat,
        userId: input.userId,
        elapsedMs: Date.now() - startedAt,
      });

      return {
        ok: false,
        error: extractedImage.error,
        code: extractedImage.code,
      };
    }

    console.info(`${tracePrefix} Generación OK`, {
      model,
      size,
      quality,
      outputFormat,
      userId: input.userId,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      imageBase64: extractedImage.imageBase64,
      mimeType: extractedImage.mimeType,
      model,
      size,
      quality,
      outputFormat,
      revisedPrompt: extractedImage.revisedPrompt,
      usage: response.usage,
    };
  } catch (error) {
    const normalizedError = normalizeOpenAIImageError(error);

    console.error(`${tracePrefix} Error generación`, {
      model,
      size,
      quality,
      outputFormat,
      userId: input.userId,
      status: normalizedError.providerStatus,
      code: normalizedError.code,
      providerCode: normalizedError.providerCode,
      providerType: normalizedError.providerType,
      requestId: normalizedError.requestId,
      errorMessageSafe: normalizedError.errorMessageSafe,
      errorName: normalizedError.errorName,
      errorClassName: normalizedError.errorClassName,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      error: normalizedError.message,
      code: normalizedError.code,
      providerStatus: normalizedError.providerStatus,
      providerCode: normalizedError.providerCode,
      providerType: normalizedError.providerType,
      requestId: normalizedError.requestId,
    };
  }
}
