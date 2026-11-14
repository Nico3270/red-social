import { z } from "zod";
import type { CloudinaryResourceType } from "./cloudinaryAsset";

export type CloudinaryDeletionReference = {
  cloudName: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  version: number;
};
export function parseCloudinaryDeletionUrl(
  value: string,
): CloudinaryDeletionReference | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return null;
    const parts = decodeURIComponent(url.pathname).split("/").slice(1);
    const [cloudName, resourceType, deliveryType, ...tail] = parts;
    if (
      !cloudName ||
      !["image", "video", "raw"].includes(resourceType) ||
      deliveryType !== "upload"
    )
      return null;
    const versionIndex = tail.findIndex((part) => /^v\d+$/.test(part));
    if (versionIndex < 0) return null;
    const version = Number(tail[versionIndex].slice(1));
    const idParts = tail.slice(versionIndex + 1);
    if (
      !idParts.length ||
      idParts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[\\%?#\u0000-\u001f]/.test(part),
      )
    )
      return null;
    if (resourceType !== "raw")
      idParts[idParts.length - 1] = idParts.at(-1)!.replace(/\.[^.]+$/, "");
    const publicId = idParts.join("/");
    return publicId && Number.isSafeInteger(version) && version > 0
      ? {
          cloudName,
          publicId,
          resourceType: resourceType as CloudinaryResourceType,
          version,
        }
      : null;
  } catch {
    return null;
  }
}
export const cloudinaryDeletePayloadSchema = z
  .object({
    publicId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        (value) =>
          !value
            .split("/")
            .some((part) => !part || part === "." || part === "..") &&
          !/[\\%?#\u0000-\u001f]/.test(value),
      )
      .optional(),
    resourceType: z.enum(["image", "video", "raw"]).optional(),
    url: z.string().trim().max(2048).optional(),
    deleteAuthorization: z.string().min(1).max(2048).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.publicId || value.url));
