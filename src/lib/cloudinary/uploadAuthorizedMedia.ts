import { z } from "zod";
import { parseCloudinaryDeletionUrl } from "./cloudinaryDeletionReference";

const grantSchema = z.object({
  uploadUrl: z
    .string()
    .regex(
      /^https:\/\/api\.cloudinary\.com\/v1_1\/[a-zA-Z0-9_-]+\/(image|video|raw)\/upload$/,
    ),
  resourceType: z.enum(["image", "video", "raw"]),
  deleteAuthorization: z.string().min(1),
  fields: z
    .object({
      timestamp: z.string(),
      public_id: z.string(),
      overwrite: z.literal("false"),
      context: z.string(),
      signature: z.string(),
      api_key: z.string(),
    })
    .strict(),
});

/** Crea una subida nueva con identidad firmada por el servidor; no acepta un propietario del cliente. */
export async function uploadAuthorizedMedia(
  file: File,
  fetcher: typeof fetch = fetch,
) {
  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const response = await fetcher("/api/cloudinary/upload-authorization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  if (!response.ok)
    throw new Error(
      "No pudimos autorizar la subida. Comprueba tu sesión e inténtalo nuevamente.",
    );
  const grant = grantSchema.parse(await response.json());
  if (
    grant.resourceType !== resourceType ||
    !grant.uploadUrl.endsWith(`/${resourceType}/upload`)
  )
    throw new Error("La autorización no corresponde al archivo.");
  const body = new FormData();
  body.append("file", file);
  for (const [name, value] of Object.entries(grant.fields))
    body.append(name, value);
  const uploaded = await fetcher(grant.uploadUrl, { method: "POST", body });
  if (!uploaded.ok)
    throw new Error(
      "No pudimos subir el archivo. La imagen anterior se conserva.",
    );
  const data = await uploaded.json();
  const reference =
    typeof data.secure_url === "string"
      ? parseCloudinaryDeletionUrl(data.secure_url)
      : null;
  const cloudName = new URL(grant.uploadUrl).pathname.split("/")[2];
  if (
    !reference ||
    reference.cloudName !== cloudName ||
    reference.publicId !== grant.fields.public_id ||
    reference.resourceType !== resourceType ||
    data.public_id !== reference.publicId ||
    data.resource_type !== resourceType
  )
    throw new Error(
      "La respuesta de subida no corresponde al archivo autorizado.",
    );
  return {
    url: data.secure_url as string,
    publicId: reference.publicId,
    resourceType: resourceType as "image" | "video",
    deleteAuthorization: grant.deleteAuthorization,
  };
}
