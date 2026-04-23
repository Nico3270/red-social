"use server";

import prisma from "@/lib/prisma";
import {
  dedupeCloudinaryAssetReferences,
  getCloudinaryAssetReference,
  isCloudinaryUrl,
  type CloudinaryAssetReference,
} from "@/lib/cloudinary/cloudinaryAsset";

type BusinessAssetSource =
  | "negocio.fotoPerfil"
  | "negocio.fotoPortada"
  | "negocio.imagenes"
  | "product.image"
  | "productVariant.imagenUrl"
  | "servicio.multimedia"
  | "publicacion.multimedia"
  | "resena.multimedia";

export interface BusinessAssetCleanupCandidate {
  url: string;
  source: BusinessAssetSource;
  publicId: string | null;
  resourceType: CloudinaryAssetReference["resourceType"] | null;
  canDelete: boolean;
  reason?: string;
}

export interface BusinessAssetsCleanupPlan {
  businessId: string;
  totalCandidates: number;
  deletableAssets: CloudinaryAssetReference[];
  unresolvedAssets: BusinessAssetCleanupCandidate[];
  sourceBreakdown: Record<BusinessAssetSource, number>;
}

function createEmptySourceBreakdown(): Record<BusinessAssetSource, number> {
  return {
    "negocio.fotoPerfil": 0,
    "negocio.fotoPortada": 0,
    "negocio.imagenes": 0,
    "product.image": 0,
    "productVariant.imagenUrl": 0,
    "servicio.multimedia": 0,
    "publicacion.multimedia": 0,
    "resena.multimedia": 0,
  };
}

function createCandidate(
  url: string,
  source: BusinessAssetSource
): BusinessAssetCleanupCandidate {
  const assetReference = getCloudinaryAssetReference(url);

  if (assetReference) {
    return {
      url,
      source,
      publicId: assetReference.publicId,
      resourceType: assetReference.resourceType,
      canDelete: true,
    };
  }

  return {
    url,
    source,
    publicId: null,
    resourceType: null,
    canDelete: false,
    reason: isCloudinaryUrl(url)
      ? "Cloudinary URL detected but the publicId could not be parsed safely."
      : "The asset URL is not hosted on Cloudinary.",
  };
}

export async function collectBusinessAssetsForCleanup(
  businessId: string
): Promise<BusinessAssetsCleanupPlan> {
  const [
    business,
    productImages,
    productVariants,
    serviceMedia,
    publicationMedia,
    surveyReviews,
  ] = await prisma.$transaction([
    prisma.negocio.findUnique({
      where: { id: businessId },
      select: {
        fotoPerfil: true,
        fotoPortada: true,
        imagenes: true,
      },
    }),
    prisma.image.findMany({
      where: {
        product: {
          negocioId: businessId,
        },
      },
      select: {
        url: true,
      },
    }),
    prisma.productVariant.findMany({
      where: {
        product: {
          negocioId: businessId,
        },
      },
      select: {
        imagenUrl: true,
      },
    }),
    prisma.media.findMany({
      where: {
        servicio: {
          is: {
            negocioId: businessId,
          },
        },
      },
      select: {
        url: true,
      },
    }),
    prisma.media.findMany({
      where: {
        publicacion: {
          is: {
            negocioId: businessId,
          },
        },
      },
      select: {
        url: true,
      },
    }),
    prisma.resena.findMany({
      where: {
        encuesta: {
          negocioId: businessId,
        },
      },
      select: {
        multimedia: true,
      },
    }),
  ]);

  const candidates: BusinessAssetCleanupCandidate[] = [];
  const sourceBreakdown = createEmptySourceBreakdown();

  const pushCandidate = (url: string | null | undefined, source: BusinessAssetSource) => {
    if (!url?.trim()) {
      return;
    }

    sourceBreakdown[source] += 1;
    candidates.push(createCandidate(url.trim(), source));
  };

  pushCandidate(business?.fotoPerfil, "negocio.fotoPerfil");
  pushCandidate(business?.fotoPortada, "negocio.fotoPortada");
  business?.imagenes.forEach((url) => pushCandidate(url, "negocio.imagenes"));
  productImages.forEach((item) => pushCandidate(item.url, "product.image"));
  productVariants.forEach((item) =>
    pushCandidate(item.imagenUrl, "productVariant.imagenUrl")
  );
  serviceMedia.forEach((item) => pushCandidate(item.url, "servicio.multimedia"));
  publicationMedia.forEach((item) =>
    pushCandidate(item.url, "publicacion.multimedia")
  );
  surveyReviews.forEach((review) => {
    review.multimedia.forEach((url) => pushCandidate(url, "resena.multimedia"));
  });

  const deletableAssets = dedupeCloudinaryAssetReferences(
    candidates
      .filter((candidate): candidate is BusinessAssetCleanupCandidate & {
        publicId: string;
        resourceType: CloudinaryAssetReference["resourceType"];
      } => candidate.canDelete && Boolean(candidate.publicId) && Boolean(candidate.resourceType))
      .map((candidate) => ({
        url: candidate.url,
        publicId: candidate.publicId,
        resourceType: candidate.resourceType,
      }))
  );

  const unresolvedAssets = candidates.filter(
    (candidate) => !candidate.canDelete || !candidate.publicId || !candidate.resourceType
  );

  return {
    businessId,
    totalCandidates: candidates.length,
    deletableAssets,
    unresolvedAssets,
    sourceBreakdown,
  };
}
