import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const TEMPORARY_UPLOAD_TTL_SECONDS = 3600;
export const UPLOAD_OWNER_CONTEXT_KEY = "myckeo_cleanup";
const claimsSchema = z
  .object({
    purpose: z.literal("myckeo-cloudinary-temporary-v1"),
    userId: z.string().min(1).max(200),
    publicId: z.string().regex(/^myckeo\/temporary\/[a-f0-9-]{36}$/),
    resourceType: z.enum(["image", "video", "raw"]),
    issuedAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type TemporaryUploadClaims = z.infer<typeof claimsSchema>;

function secret() {
  const value =
    process.env.CLOUDINARY_UPLOAD_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!value || value.length < 32)
    throw new Error("Cloudinary upload authorization is not configured");
  return value;
}
function mac(encoded: string) {
  return createHmac("sha256", secret())
    .update(`myckeo-cloudinary-temporary-v1:${encoded}`)
    .digest();
}
export function issueTemporaryUploadAuthorization(
  userId: string,
  resourceType: TemporaryUploadClaims["resourceType"],
  now = Math.floor(Date.now() / 1000),
) {
  const claims: TemporaryUploadClaims = {
    purpose: "myckeo-cloudinary-temporary-v1",
    userId,
    publicId: `myckeo/temporary/${randomUUID()}`,
    resourceType,
    issuedAt: now,
    expiresAt: now + TEMPORARY_UPLOAD_TTL_SECONDS,
  };
  const encoded = Buffer.from(
    JSON.stringify(claimsSchema.parse(claims)),
  ).toString("base64url");
  return { claims, token: `${encoded}.${mac(encoded).toString("base64url")}` };
}
export function verifyTemporaryUploadAuthorization(
  token: string,
  userId: string,
  now = Math.floor(Date.now() / 1000),
): TemporaryUploadClaims | null {
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))
    return null;
  const [encoded, signature] = token.split(".");
  const expected = mac(encoded);
  const supplied = Buffer.from(signature, "base64url");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return null;
  try {
    const parsed = claimsSchema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    if (!parsed.success) return null;
    const claims = parsed.data;
    if (
      claims.userId !== userId ||
      claims.issuedAt > now + 30 ||
      claims.expiresAt <= now ||
      claims.expiresAt - claims.issuedAt !== TEMPORARY_UPLOAD_TTL_SECONDS
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}
