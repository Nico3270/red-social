import "server-only";
import { isIP } from "node:net";
import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import prisma from "@/lib/prisma";
import { demoTokenHash, demoTokenPattern } from "./demo-security";

export async function allowDemoRequest(headers: Headers) {
  try {
    const secret =
      process.env.BUSINESS_DEMO_SESSION_SECRET || process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) return false;
    const ip =
      ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"]
        .map((name) => headers.get(name)?.slice(0, 256).split(",", 1)[0].trim())
        .find((value) => value && isIP(value)) || "unknown";
    const key = createHmac("sha256", secret)
      .update(`demo-access:${ip}`)
      .digest("hex");
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "10 m"),
      prefix: "myckeo:business-demo:v1",
      analytics: false,
    });
    return (await limiter.limit(key)).success;
  } catch {
    return false;
  }
}
export async function findValidDemo(token: string) {
  if (!demoTokenPattern.test(token)) return null;
  return prisma.businessDemoLink.findFirst({
    where: {
      tokenHash: demoTokenHash(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
      negocio: {
        is: {
          estado: { in: ["activo", "suspendido"] },
          archivedAt: null,
          usuario: { is: { estado: "activo" } },
        },
      },
    },
    select: {
      id: true,
      negocioId: true,
      snapshot: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}
