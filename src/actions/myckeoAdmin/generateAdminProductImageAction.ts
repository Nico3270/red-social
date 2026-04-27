"use server";

import { auth } from "@/auth.config";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/deleteCloudinaryAssets";
import { uploadGeneratedProductImage } from "@/lib/cloudinary/uploadGeneratedProductImage";
import {
  generateProductImage,
  type ProductImageGenerationQuality,
  type ProductImageOutputFormat,
} from "@/lib/openai/generateProductImage";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";
import {
  EstadoNegocio,
  Prisma,
  ProductImageGenerationProvider,
  ProductImageGenerationPurpose,
  ProductImageGenerationStatus,
  ProductStatus,
} from "@prisma/client";
import { z } from "zod";
import { revalidateAdminProductSurfaces } from "./revalidateAdminProductSurfaces";

const DEFAULT_MODEL = "gpt-image-1-mini";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY: ProductImageGenerationQuality = "low";
const DEFAULT_OUTPUT_FORMAT: ProductImageOutputFormat = "png";
const PENDING_STALE_AFTER_MS = 5 * 60 * 1000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;

const imagePurposeSchema = z.nativeEnum(ProductImageGenerationPurpose);
const imageQualitySchema = z.enum(["low", "medium", "high", "auto"]);
const imageOutputFormatSchema = z.enum(["png", "jpeg", "webp"]);
const imageSizeSchema = z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]);

const generateAdminProductImageInputSchema = z.object({
  productId: z.string().trim().min(1, "El producto es obligatorio."),
  prompt: z
    .string()
    .trim()
    .min(10, "El prompt debe tener al menos 10 caracteres.")
    .max(4000, "El prompt es demasiado largo para generar una imagen."),
  purpose: imagePurposeSchema
    .optional()
    .default(ProductImageGenerationPurpose.CATALOG),
  model: z.string().trim().min(1).max(120).optional(),
  size: imageSizeSchema.optional().default(DEFAULT_SIZE),
  quality: imageQualitySchema.optional().default(DEFAULT_QUALITY),
  outputFormat: imageOutputFormatSchema
    .optional()
    .default(DEFAULT_OUTPUT_FORMAT),
  variantIndex: z.coerce
    .number()
    .int("variantIndex debe ser un entero.")
    .positive("variantIndex debe ser positivo.")
    .optional()
    .default(1),
});

export type GenerateAdminProductImageActionInput = z.input<
  typeof generateAdminProductImageInputSchema
>;

export interface GenerateAdminProductImageActionImage {
  id: string;
  url: string;
}

export interface GenerateAdminProductImageActionGeneration {
  id: string;
  status: ProductImageGenerationStatus;
  cloudinaryPublicId: string | null;
  purpose: ProductImageGenerationPurpose;
  model: string;
  size: string;
  quality: string;
  variantIndex: number;
}

export type GenerateAdminProductImageActionResult =
  | {
      ok: true;
      image: GenerateAdminProductImageActionImage;
      generation: GenerateAdminProductImageActionGeneration;
      alreadyGenerated?: boolean;
      error: null;
    }
  | {
      ok: false;
      image: null;
      generation: null;
      error: string;
      code?: string;
      validationErrors?: string[];
    };

const imageSelect = {
  id: true,
  url: true,
} satisfies Prisma.ImageSelect;

const generationSelect = {
  id: true,
  productId: true,
  imageId: true,
  prompt: true,
  promptHash: true,
  model: true,
  size: true,
  quality: true,
  purpose: true,
  variantIndex: true,
  status: true,
  provider: true,
  cloudinaryUrl: true,
  cloudinaryPublicId: true,
  errorMessage: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  image: {
    select: imageSelect,
  },
} satisfies Prisma.ProductImageGenerationSelect;

type ImageRecord = Prisma.ImageGetPayload<{ select: typeof imageSelect }>;
type GenerationRecord = Prisma.ProductImageGenerationGetPayload<{
  select: typeof generationSelect;
}>;

interface GenerationKey {
  productId: string;
  provider: ProductImageGenerationProvider;
  model: string;
  promptHash: string;
  size: string;
  quality: ProductImageGenerationQuality;
  purpose: ProductImageGenerationPurpose;
  variantIndex: number;
}

function buildTraceId() {
  return `generate-admin-product-image-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getDefaultModel() {
  return process.env.OPENAI_ADMIN_PRODUCT_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function buildPromptHash(prompt: string) {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

function normalizeErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function isRecentlyPending(generation: GenerationRecord) {
  return Date.now() - generation.updatedAt.getTime() < PENDING_STALE_AFTER_MS;
}

function toGenerationPayload(
  generation: Pick<
    GenerationRecord,
    | "id"
    | "status"
    | "cloudinaryPublicId"
    | "purpose"
    | "model"
    | "size"
    | "quality"
    | "variantIndex"
  >,
): GenerateAdminProductImageActionGeneration {
  return {
    id: generation.id,
    status: generation.status,
    cloudinaryPublicId: generation.cloudinaryPublicId,
    purpose: generation.purpose,
    model: generation.model,
    size: generation.size,
    quality: generation.quality,
    variantIndex: generation.variantIndex,
  };
}

function validationErrorsFromZod(error: z.ZodError) {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "imagen"}: ${issue.message}`,
  );
}

async function findGenerationByKey(key: GenerationKey) {
  return prisma.productImageGeneration.findFirst({
    where: key,
    select: generationSelect,
  });
}

async function markGenerationFailed(input: {
  generationId: string;
  errorMessage: string;
  tracePrefix: string;
  code?: string;
}) {
  const normalizedMessage = normalizeErrorMessage(
    input.code ? `${input.code}: ${input.errorMessage}` : input.errorMessage,
  );

  try {
    await prisma.productImageGeneration.update({
      where: { id: input.generationId },
      data: {
        status: ProductImageGenerationStatus.FAILED,
        errorMessage: normalizedMessage,
      },
    });
  } catch (error) {
    console.error(`${input.tracePrefix} No se pudo marcar generación FAILED`, {
      generationId: input.generationId,
      error,
    });
  }
}

async function cleanupUploadedAsset(input: {
  secureUrl: string;
  publicId: string;
  tracePrefix: string;
  productId: string;
  generationId: string;
}) {
  try {
    const cleanup = await deleteCloudinaryAssets([
      {
        url: input.secureUrl,
        publicId: input.publicId,
        resourceType: "image",
      },
    ]);

    console.info(`${input.tracePrefix} Cleanup Cloudinary post-error`, {
      productId: input.productId,
      generationId: input.generationId,
      publicId: input.publicId,
      attempted: cleanup.attempted,
      deleted: cleanup.deleted,
      alreadyMissing: cleanup.alreadyMissing,
      failed: cleanup.failed,
    });
  } catch (error) {
    console.error(`${input.tracePrefix} Falló cleanup Cloudinary post-error`, {
      productId: input.productId,
      generationId: input.generationId,
      publicId: input.publicId,
      error,
    });
  }
}

async function ensureImageRowForSucceededGeneration(input: {
  generation: GenerationRecord;
  productId: string;
  cloudinaryUrl: string;
}) {
  if (input.generation.image) {
    return {
      image: input.generation.image,
      repaired: false,
    };
  }

  const existingImage = await prisma.image.findFirst({
    where: {
      productId: input.productId,
      url: input.cloudinaryUrl,
    },
    select: imageSelect,
  });

  if (existingImage) {
    await prisma.productImageGeneration.update({
      where: { id: input.generation.id },
      data: { imageId: existingImage.id },
    });

    return {
      image: existingImage,
      repaired: true,
    };
  }

  const image = await prisma.$transaction(async (tx) => {
    const createdImage = await tx.image.create({
      data: {
        productId: input.productId,
        url: input.cloudinaryUrl,
      },
      select: imageSelect,
    });

    await tx.productImageGeneration.update({
      where: { id: input.generation.id },
      data: { imageId: createdImage.id },
    });

    return createdImage;
  });

  return {
    image,
    repaired: true,
  };
}

export async function generateAdminProductImageAction(
  rawInput: GenerateAdminProductImageActionInput,
): Promise<GenerateAdminProductImageActionResult> {
  const traceId = buildTraceId();
  const tracePrefix = `[generateAdminProductImageAction][${traceId}]`;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        ok: false,
        image: null,
        generation: null,
        error: "No autorizado.",
        code: "UNAUTHORIZED",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${tracePrefix} Acceso denegado`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        image: null,
        generation: null,
        error: "No tienes permisos para generar imágenes administrativas.",
        code: "FORBIDDEN",
      };
    }

    const parsedInput =
      generateAdminProductImageInputSchema.safeParse(rawInput);

    if (!parsedInput.success) {
      return {
        ok: false,
        image: null,
        generation: null,
        error: "Revisa los datos antes de generar la imagen.",
        code: "VALIDATION_ERROR",
        validationErrors: validationErrorsFromZod(parsedInput.error),
      };
    }

    const normalizedPrompt = normalizePrompt(parsedInput.data.prompt);
    const promptHash = buildPromptHash(normalizedPrompt);
    const model = parsedInput.data.model?.trim() || getDefaultModel();
    const size = parsedInput.data.size;
    const quality = parsedInput.data.quality;
    const outputFormat = parsedInput.data.outputFormat;
    const purpose = parsedInput.data.purpose;
    const variantIndex = parsedInput.data.variantIndex;

    const product = await prisma.product.findUnique({
      where: { id: parsedInput.data.productId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        status: true,
        negocioId: true,
        negocio: {
          select: {
            id: true,
            slug: true,
            estado: true,
            archivedAt: true,
          },
        },
      },
    });

    if (!product) {
      return {
        ok: false,
        image: null,
        generation: null,
        error: "El producto no existe.",
        code: "PRODUCT_NOT_FOUND",
      };
    }

    if (
      product.negocio.archivedAt ||
      product.negocio.estado !== EstadoNegocio.activo
    ) {
      return {
        ok: false,
        image: null,
        generation: null,
        error: "El negocio no está activo para generar imágenes.",
        code: "BUSINESS_NOT_ACTIVE",
      };
    }

    if (product.status !== ProductStatus.oculto) {
      return {
        ok: false,
        image: null,
        generation: null,
        error:
          "La generación administrativa está limitada a productos ocultos en este flujo.",
        code: "PRODUCT_NOT_HIDDEN",
      };
    }

    const generationKey: GenerationKey = {
      productId: product.id,
      provider: ProductImageGenerationProvider.OPENAI,
      model,
      promptHash,
      size,
      quality,
      purpose,
      variantIndex,
    };

    let generation = await findGenerationByKey(generationKey);
    let createdNewGeneration = false;

    if (!generation) {
      try {
        generation = await prisma.productImageGeneration.create({
          data: {
            productId: product.id,
            prompt: normalizedPrompt,
            promptHash,
            model,
            size,
            quality,
            purpose,
            variantIndex,
            status: ProductImageGenerationStatus.PENDING,
            provider: ProductImageGenerationProvider.OPENAI,
            createdById: session.user.id,
          },
          select: generationSelect,
        });
        createdNewGeneration = true;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          generation = await findGenerationByKey(generationKey);
        }

        if (!generation) {
          throw error;
        }
      }
    }

    if (
      !createdNewGeneration &&
      generation.status === ProductImageGenerationStatus.SUCCEEDED &&
      (generation.image || generation.cloudinaryUrl)
    ) {
      const image = await ensureImageRowForSucceededGeneration({
        generation,
        productId: product.id,
        cloudinaryUrl: generation.image?.url || generation.cloudinaryUrl || "",
      });

      if (image.repaired) {
        revalidateAdminProductSurfaces({
          businessSlug: product.negocio.slug,
          productSlug: product.slug,
        });
      }

      console.info(`${tracePrefix} Imagen ya generada`, {
        productId: product.id,
        generationId: generation.id,
        purpose,
        variantIndex,
        model,
        status: generation.status,
        repairedImageRow: image.repaired,
      });

      return {
        ok: true,
        image: image.image,
        generation: toGenerationPayload(generation),
        alreadyGenerated: true,
        error: null,
      };
    }

    if (
      !createdNewGeneration &&
      generation.status === ProductImageGenerationStatus.PENDING &&
      isRecentlyPending(generation)
    ) {
      console.warn(`${tracePrefix} Generación ya pendiente`, {
        productId: product.id,
        generationId: generation.id,
        purpose,
        variantIndex,
        model,
        status: generation.status,
      });

      return {
        ok: false,
        image: null,
        generation: null,
        error:
          "Ya hay una generación reciente en curso para este producto y prompt.",
        code: "GENERATION_ALREADY_PENDING",
      };
    }

    if (!createdNewGeneration) {
      generation = await prisma.productImageGeneration.update({
        where: { id: generation.id },
        data: {
          prompt: normalizedPrompt,
          status: ProductImageGenerationStatus.PENDING,
          errorMessage: null,
          createdById: session.user.id,
          model,
          size,
          quality,
          purpose,
          variantIndex,
          provider: ProductImageGenerationProvider.OPENAI,
        },
        select: generationSelect,
      });
    }

    console.info(`${tracePrefix} Inicio generación admin`, {
      productId: product.id,
      generationId: generation.id,
      purpose,
      variantIndex,
      model,
      size,
      quality,
      outputFormat,
      actorUserId: session.user.id,
    });

    const generatedImage = await generateProductImage({
      prompt: normalizedPrompt,
      model,
      size,
      quality,
      outputFormat,
      userId: session.user.id,
      traceId,
    });

    if (!generatedImage.ok) {
      console.error(`${tracePrefix} Falló generación OpenAI`, {
        productId: product.id,
        generationId: generation.id,
        purpose,
        variantIndex,
        model,
        size,
        quality,
        outputFormat,
        providerStatus: generatedImage.providerStatus,
        providerCode: generatedImage.providerCode,
        providerType: generatedImage.providerType,
        requestId: generatedImage.requestId,
        normalizedCode: generatedImage.code,
      });

      await markGenerationFailed({
        generationId: generation.id,
        errorMessage: generatedImage.error,
        code: generatedImage.code,
        tracePrefix,
      });

      return {
        ok: false,
        image: null,
        generation: null,
        error: generatedImage.error,
        code: generatedImage.code,
      };
    }

    const uploadedImage = await uploadGeneratedProductImage({
      imageBase64: generatedImage.imageBase64,
      mimeType: generatedImage.mimeType,
      productId: product.id,
      promptHash,
      purpose,
      variantIndex,
      traceId,
    });

    if (!uploadedImage.ok) {
      await markGenerationFailed({
        generationId: generation.id,
        errorMessage: uploadedImage.error,
        code: uploadedImage.code,
        tracePrefix,
      });

      return {
        ok: false,
        image: null,
        generation: null,
        error: uploadedImage.error,
        code: uploadedImage.code,
      };
    }

    let storedImage: ImageRecord;
    let updatedGeneration: GenerationRecord;

    try {
      const persisted = await prisma.$transaction(async (tx) => {
        const image = await tx.image.create({
          data: {
            productId: product.id,
            url: uploadedImage.secureUrl,
          },
          select: imageSelect,
        });

        const persistedGeneration = await tx.productImageGeneration.update({
          where: { id: generation.id },
          data: {
            imageId: image.id,
            status: ProductImageGenerationStatus.SUCCEEDED,
            errorMessage: null,
            cloudinaryUrl: uploadedImage.secureUrl,
            cloudinaryPublicId: uploadedImage.publicId,
            model: generatedImage.model,
            size: generatedImage.size,
            quality: generatedImage.quality,
            provider: ProductImageGenerationProvider.OPENAI,
            purpose,
            variantIndex,
          },
          select: generationSelect,
        });

        return {
          image,
          generation: persistedGeneration,
        };
      });

      storedImage = persisted.image;
      updatedGeneration = persisted.generation;
    } catch (error) {
      await cleanupUploadedAsset({
        secureUrl: uploadedImage.secureUrl,
        publicId: uploadedImage.publicId,
        tracePrefix,
        productId: product.id,
        generationId: generation.id,
      });

      await markGenerationFailed({
        generationId: generation.id,
        errorMessage: "No fue posible persistir la imagen generada.",
        code:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : "DB_PERSISTENCE_ERROR",
        tracePrefix,
      });

      console.error(`${tracePrefix} Error persistiendo imagen generada`, {
        productId: product.id,
        generationId: generation.id,
        purpose,
        variantIndex,
        model,
        error,
      });

      return {
        ok: false,
        image: null,
        generation: null,
        error:
          "La imagen se generó, pero no fue posible guardarla en el producto.",
        code: "DB_PERSISTENCE_ERROR",
      };
    }

    revalidateAdminProductSurfaces({
      businessSlug: product.negocio.slug,
      productSlug: product.slug,
    });

    console.info(`${tracePrefix} Imagen generada y asociada`, {
      productId: product.id,
      generationId: updatedGeneration.id,
      imageId: storedImage.id,
      cloudinaryPublicId: updatedGeneration.cloudinaryPublicId,
      purpose,
      variantIndex,
      model: updatedGeneration.model,
      status: updatedGeneration.status,
    });

    return {
      ok: true,
      image: storedImage,
      generation: toGenerationPayload(updatedGeneration),
      error: null,
    };
  } catch (error) {
    console.error(`${tracePrefix} Error inesperado`, { error });

    return {
      ok: false,
      image: null,
      generation: null,
      error: "No fue posible generar la imagen administrativa del producto.",
      code: "UNKNOWN_ERROR",
    };
  }
}
