import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

export const DEMO_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DEMO_COOKIE = "myckeo-business-demo";
export const demoTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export function demoTokenHash(token: string) {
  return createHash("sha256").update(`business-demo:v1:${token}`).digest("hex");
}
function sessionKey() {
  const secret =
    process.env.BUSINESS_DEMO_SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("Demo no disponible.");
  return createHmac("sha256", secret)
    .update("myckeo-business-demo-session:v1")
    .digest();
}
export function createDemoSession(token: string, expiresAt: Date) {
  if (!demoTokenPattern.test(token) || expiresAt.getTime() <= Date.now())
    throw new Error("Demo no disponible.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  cipher.setAAD(Buffer.from("business-demo-session:v1"));
  const value = Buffer.concat([
    cipher.update(JSON.stringify({ token, expiresAt: expiresAt.getTime() })),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), value]
    .map((v) => v.toString("base64url"))
    .join(".");
}
export function readDemoSession(value: string | undefined): string | null {
  try {
    if (!value || value.length > 1024) return null;
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const [iv, tag, data] = parts.map((v) => Buffer.from(v, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const cipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    cipher.setAAD(Buffer.from("business-demo-session:v1"));
    cipher.setAuthTag(tag);
    const parsed = JSON.parse(
      Buffer.concat([cipher.update(data), cipher.final()]).toString(),
    );
    return demoTokenPattern.test(parsed.token) &&
      Number.isSafeInteger(parsed.expiresAt) &&
      parsed.expiresAt > Date.now()
      ? parsed.token
      : null;
  } catch {
    return null;
  }
}
