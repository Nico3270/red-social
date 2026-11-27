import "server-only";
import prisma from "@/lib/prisma";
import {
  buildPublishedBusinessWhere,
  buildPublishedBusinessRelationWhere,
} from "./business-visibility-policy";

export async function publicSitemapEntries() {
  const [businesses, products, categories, surveys] = await Promise.all([
    prisma.negocio.findMany({
      where: buildPublishedBusinessWhere(),
      select: { slug: true, updatedAt: true },
    }),
    prisma.product.findMany({
      where: {
        status: "disponible",
        negocio: buildPublishedBusinessRelationWhere(),
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.encuesta.findMany({
      where: { negocio: buildPublishedBusinessRelationWhere() },
      select: { updatedAt: true, negocio: { select: { slug: true } } },
    }),
  ]);
  return [
    ...["/", "/inicio", "/carrusel"].map((path) => ({
      path,
      updatedAt: new Date(),
    })),
    ...businesses.map((b) => ({
      path: `/perfil/${b.slug}`,
      updatedAt: b.updatedAt,
    })),
    ...products.map((p) => ({
      path: `/producto/${p.slug}`,
      updatedAt: p.updatedAt,
    })),
    ...categories.map((c) => ({
      path: `/category/${c.slug}`,
      updatedAt: c.updatedAt,
    })),
    ...surveys.map((s) => ({
      path: `/encuestas/${s.negocio.slug}`,
      updatedAt: s.updatedAt,
    })),
  ];
}
