import prisma from "@/lib/prisma";
import { parseCloudinaryDeletionUrl } from "./cloudinaryDeletionReference";
import type { CloudinaryResourceType } from "./cloudinaryAsset";

const BATCH_SIZE = 200;
const MAX_ROWS_PER_MODEL = 10000;
interface Target {
  cloudName: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
}

/** Las URLs almacenadas NO otorgan propiedad: solo impiden borrar archivos aún en uso. */
export async function isCloudinaryAssetReferenced(
  target: Target,
): Promise<boolean> {
  const matches = (url: string | null | undefined) => {
    if (!url) return false;
    const parsed = parseCloudinaryDeletionUrl(url);
    if (parsed)
      return (
        parsed.cloudName === target.cloudName &&
        parsed.publicId === target.publicId &&
        parsed.resourceType === target.resourceType
      );
    // Una referencia Cloudinary que no se puede resolver no autoriza una limpieza por omisión.
    try {
      const candidate = new URL(url);
      if (
        candidate.hostname === "res.cloudinary.com" &&
        decodeURIComponent(candidate.pathname).startsWith(
          `/${target.cloudName}/`,
        )
      )
        throw new Error("Unresolved Cloudinary reference");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Unresolved Cloudinary reference"
      )
        throw error;
    }
    return false;
  };
  async function scan<T extends { id: string }>(
    load: (cursor?: string) => Promise<T[]>,
    used: (row: T) => boolean,
  ) {
    let cursor: string | undefined;
    for (let count = 0; count < MAX_ROWS_PER_MODEL; count += BATCH_SIZE) {
      const rows = await load(cursor);
      if (rows.some(used)) return true;
      if (rows.length < BATCH_SIZE) return false;
      cursor = rows.at(-1)!.id;
    }
    throw new Error("Cloudinary reference scan limit reached");
  }
  const paging = (cursor?: string) => ({
    take: BATCH_SIZE,
    orderBy: { id: "asc" as const },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const checks = await Promise.all([
    scan(
      (cursor) =>
        prisma.usuario.findMany({
          ...paging(cursor),
          select: { id: true, fotoPerfil: true },
        }),
      (row) => matches(row.fotoPerfil),
    ),
    scan(
      (cursor) =>
        prisma.negocio.findMany({
          ...paging(cursor),
          select: {
            id: true,
            fotoPerfil: true,
            fotoPortada: true,
            imagenes: true,
          },
        }),
      (row) =>
        matches(row.fotoPerfil) ||
        matches(row.fotoPortada) ||
        row.imagenes.some(matches),
    ),
    scan(
      (cursor) =>
        prisma.image.findMany({
          ...paging(cursor),
          select: { id: true, url: true },
        }),
      (row) => matches(row.url),
    ),
    scan(
      (cursor) =>
        prisma.productVariant.findMany({
          ...paging(cursor),
          select: { id: true, imagenUrl: true },
        }),
      (row) => matches(row.imagenUrl),
    ),
    scan(
      (cursor) =>
        prisma.media.findMany({
          ...paging(cursor),
          select: { id: true, url: true },
        }),
      (row) => matches(row.url),
    ),
    scan(
      (cursor) =>
        prisma.resena.findMany({
          ...paging(cursor),
          select: { id: true, multimedia: true },
        }),
      (row) => row.multimedia.some(matches),
    ),
    scan(
      (cursor) =>
        prisma.productImageGeneration.findMany({
          ...paging(cursor),
          select: { id: true, cloudinaryPublicId: true, cloudinaryUrl: true },
        }),
      (row) =>
        matches(row.cloudinaryUrl) ||
        (target.resourceType === "image" &&
          row.cloudinaryPublicId === target.publicId),
    ),
  ]);
  return checks.some(Boolean);
}
