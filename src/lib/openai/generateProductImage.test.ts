const mockGenerate = jest.fn();

class MockAPIError extends Error {
  status?: number;
  code?: string;
  type?: string;
  request_id?: string;
  error?: {
    code?: string;
    type?: string;
    message?: string;
    request_id?: string;
  };

  constructor(
    message = "API error",
    extras: {
      status?: number;
      code?: string;
      type?: string;
      request_id?: string;
    } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.status = extras.status;
    this.code = extras.code;
    this.type = extras.type;
    this.request_id = extras.request_id;
    this.error = {
      code: extras.code,
      type: extras.type,
      message,
      request_id: extras.request_id,
    };
  }
}

class MockBadRequestError extends MockAPIError {}
class MockAuthenticationError extends MockAPIError {}
class MockPermissionDeniedError extends MockAPIError {}
class MockNotFoundError extends MockAPIError {}
class MockRateLimitError extends MockAPIError {}
class MockAPIConnectionError extends MockAPIError {}
class MockAPIConnectionTimeoutError extends MockAPIError {}

jest.mock("openai", () => {
  class MockOpenAI {
    images = {
      generate: mockGenerate,
    };

    constructor() {}
  }

  return {
    __esModule: true,
    default: MockOpenAI,
    APIError: MockAPIError,
    APIConnectionError: MockAPIConnectionError,
    APIConnectionTimeoutError: MockAPIConnectionTimeoutError,
    AuthenticationError: MockAuthenticationError,
    BadRequestError: MockBadRequestError,
    NotFoundError: MockNotFoundError,
    PermissionDeniedError: MockPermissionDeniedError,
    RateLimitError: MockRateLimitError,
  };
});

import {
  extractGeneratedImageBase64,
  generateProductImage,
  normalizeOpenAIImageError,
} from "./generateProductImage";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalImageModel = process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL;
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

beforeEach(() => {
  mockGenerate.mockReset();
  delete process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL;
  process.env.OPENAI_API_KEY = "test-openai-key";
});

afterAll(() => {
  if (typeof originalApiKey === "string") {
    process.env.OPENAI_API_KEY = originalApiKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }

  if (typeof originalImageModel === "string") {
    process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL = originalImageModel;
  } else {
    delete process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL;
  }

  consoleErrorSpy.mockRestore();
  consoleInfoSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

describe("generateProductImage helpers", () => {
  it("mapea status 401 a unauthorized", () => {
    expect(
      normalizeOpenAIImageError({
        status: 401,
        code: "invalid_api_key",
        type: "invalid_request_error",
        message: "Incorrect API key provided",
      }),
    ).toMatchObject({
      code: "unauthorized",
      providerStatus: 401,
      providerCode: "invalid_api_key",
      providerType: "invalid_request_error",
    });
  });

  it("mapea 429 con insufficient_quota a insufficient_quota", () => {
    expect(
      normalizeOpenAIImageError({
        status: 429,
        code: "insufficient_quota",
        type: "insufficient_quota",
        message: "You exceeded your current quota",
      }),
    ).toMatchObject({
      code: "insufficient_quota",
      providerStatus: 429,
      providerCode: "insufficient_quota",
    });
  });

  it("mapea 404 model_not_found a invalid_model", () => {
    expect(
      normalizeOpenAIImageError({
        status: 404,
        code: "model_not_found",
        type: "invalid_request_error",
        message: "The model gpt-image-2 does not exist",
      }),
    ).toMatchObject({
      code: "invalid_model",
      providerStatus: 404,
      providerCode: "model_not_found",
    });
  });

  it("mapea 400 por parámetro no soportado a unsupported_parameter", () => {
    expect(
      normalizeOpenAIImageError({
        status: 400,
        code: "unsupported_parameter",
        type: "invalid_request_error",
        message: "Unsupported parameter: response_format",
      }),
    ).toMatchObject({
      code: "unsupported_parameter",
      providerStatus: 400,
      providerCode: "unsupported_parameter",
    });
  });

  it("mapea 403 a permission_denied", () => {
    expect(
      normalizeOpenAIImageError({
        status: 403,
        code: "permission_denied",
        type: "invalid_request_error",
        message: "You do not have access to this model",
      }),
    ).toMatchObject({
      code: "permission_denied",
      providerStatus: 403,
      providerCode: "permission_denied",
    });
  });

  it("mapea 400 genérico a bad_request", () => {
    expect(
      normalizeOpenAIImageError({
        status: 400,
        code: "invalid_request_error",
        type: "invalid_request_error",
        message: "Malformed image generation request",
      }),
    ).toMatchObject({
      code: "bad_request",
      providerStatus: 400,
    });
  });

  it("mapea respuesta sin b64_json a empty_image_response", () => {
    expect(
      extractGeneratedImageBase64({
        response: {
          data: [
            {
              url: "https://example.com/image.png",
            },
          ],
        },
        outputFormat: "png",
      }),
    ).toEqual({
      ok: false,
      error: "OpenAI no devolvió una imagen base64.",
      code: "empty_image_response",
    });
  });

  it("mapea mime type correcto cuando sí llega b64_json", () => {
    expect(
      extractGeneratedImageBase64({
        response: {
          data: [
            {
              b64_json: "ZmFrZS13ZWJw",
              revised_prompt: "prompt revisado",
            },
          ],
        },
        outputFormat: "webp",
      }),
    ).toEqual({
      ok: true,
      imageBase64: "ZmFrZS13ZWJw",
      mimeType: "image/webp",
      revisedPrompt: "prompt revisado",
    });
  });

  it("devuelve missing_api_key cuando no existe OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar imagen",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "missing_api_key",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("valida prompt corto antes de llamar OpenAI", async () => {
    await expect(
      generateProductImage({
        prompt: "corto",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_prompt",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("valida tamaño inválido antes de llamar OpenAI", async () => {
    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar imagen",
        size: "800x800",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_size",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("valida prompt demasiado largo antes de llamar OpenAI", async () => {
    await expect(
      generateProductImage({
        prompt: "x".repeat(4001),
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_prompt",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("valida calidad inválida antes de llamar OpenAI", async () => {
    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar imagen",
        quality: "ultra" as never,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_quality",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("valida formato de salida inválido antes de llamar OpenAI", async () => {
    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar imagen",
        outputFormat: "gif" as never,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_output_format",
    });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("usa gpt-image-1-mini como fallback y omite response_format para modelos GPT image", async () => {
    mockGenerate.mockResolvedValue({
      data: [{ b64_json: "ZmFrZS1pbWFnZQ==", revised_prompt: "revised" }],
      usage: { total_tokens: 123 },
    });

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar generación GPT image",
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      ok: true,
      model: "gpt-image-1-mini",
      size: "1024x1024",
      quality: "low",
      outputFormat: "png",
      mimeType: "image/png",
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0]).toMatchObject({
      model: "gpt-image-1-mini",
      size: "1024x1024",
      quality: "low",
      output_format: "png",
      user: "user-1",
    });
    expect(mockGenerate.mock.calls[0][0].response_format).toBeUndefined();
  });

  it("construye payload tolerante para dall-e-3", async () => {
    mockGenerate.mockResolvedValue({
      data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }],
    });

    await generateProductImage({
      prompt: "Prompt suficientemente largo para probar generación DALL-E 3",
      model: "dall-e-3",
      size: "1024x1024",
      quality: "high",
      outputFormat: "webp",
    });

    expect(mockGenerate.mock.calls[0][0]).toMatchObject({
      model: "dall-e-3",
      size: "1024x1024",
      quality: "auto",
      response_format: "b64_json",
    });
    expect(mockGenerate.mock.calls[0][0].output_format).toBeUndefined();
  });

  it("construye payload tolerante para dall-e-2", async () => {
    mockGenerate.mockResolvedValue({
      data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }],
    });

    await generateProductImage({
      prompt: "Prompt suficientemente largo para probar generación DALL-E 2",
      model: "dall-e-2",
      size: "1024x1024",
      quality: "medium",
      outputFormat: "jpeg",
    });

    expect(mockGenerate.mock.calls[0][0]).toMatchObject({
      model: "dall-e-2",
      size: "1024x1024",
      response_format: "b64_json",
    });
    expect(mockGenerate.mock.calls[0][0].quality).toBeUndefined();
    expect(mockGenerate.mock.calls[0][0].output_format).toBeUndefined();
  });

  it("normaliza content_policy cuando OpenAI rechaza el prompt", async () => {
    mockGenerate.mockRejectedValue(
      new MockBadRequestError("content_policy violation", {
        status: 400,
        code: "content_policy_violation",
        type: "invalid_request_error",
        request_id: "req-content-policy",
      }),
    );

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar content policy",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "content_policy",
      providerStatus: 400,
      providerCode: "content_policy_violation",
      providerType: "invalid_request_error",
      requestId: "req-content-policy",
    });
  });

  it("normaliza rate_limited cuando OpenAI limita la solicitud", async () => {
    mockGenerate.mockRejectedValue(
      new MockRateLimitError("rate limit reached", {
        status: 429,
        code: "rate_limit_exceeded",
        type: "rate_limit_error",
        request_id: "req-rate-limit",
      }),
    );

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar rate limit",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "rate_limited",
      providerStatus: 429,
      requestId: "req-rate-limit",
    });
  });

  it("normaliza permission_denied cuando OpenAI niega acceso al modelo", async () => {
    mockGenerate.mockRejectedValue(
      new MockPermissionDeniedError("Access denied", {
        status: 403,
        code: "permission_denied",
        type: "invalid_request_error",
        request_id: "req-permission",
      }),
    );

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar permisos",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "permission_denied",
      providerStatus: 403,
      requestId: "req-permission",
    });
  });

  it("normaliza invalid_model cuando OpenAI no encuentra el modelo", async () => {
    mockGenerate.mockRejectedValue(
      new MockNotFoundError("The model does not exist", {
        status: 404,
        code: "model_not_found",
        type: "invalid_request_error",
        request_id: "req-model-not-found",
      }),
    );

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar modelo inválido",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "invalid_model",
      providerStatus: 404,
      requestId: "req-model-not-found",
    });
  });

  it("normaliza unknown_error cuando falla la conexión con OpenAI", async () => {
    mockGenerate.mockRejectedValue(
      new MockAPIConnectionError("socket hang up"),
    );

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar conexión",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "unknown_error",
      error: "No fue posible conectar con OpenAI para generar la imagen.",
    });
  });

  it("devuelve empty_image_response cuando la API responde sin b64_json", async () => {
    mockGenerate.mockResolvedValue({
      data: [{ revised_prompt: "prompt sin imagen" }],
    });

    await expect(
      generateProductImage({
        prompt: "Prompt suficientemente largo para probar respuesta vacía",
      }),
    ).resolves.toEqual({
      ok: false,
      error: "OpenAI no devolvió una imagen base64.",
      code: "empty_image_response",
    });
  });
});