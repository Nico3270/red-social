// lib/actions.ts
"use server";

import prisma  from "@/lib/prisma";

interface ArticleData {
  slug: string;
  titulo: string;
  imagen: string;
  descripcion?: string;
  fechaPublicacion?: string;
}

export async function getArticlesInformation(): Promise<ArticleData[]> {
  try {
    const articles = await prisma.articulo.findMany({
      select: {
        slug: true,
        titulo: true,
        imagen: true,
        descripcion: true,
        fechaPublicacion: true,
      },
      orderBy: {
        orden: "asc",
      },
    });

    const formattedArticles: ArticleData[] = articles.map((article) => ({
      slug: article.slug,
      titulo: article.titulo,
      imagen: article.imagen,
      descripcion: article.descripcion ?? undefined,
      fechaPublicacion: article.fechaPublicacion
        ? article.fechaPublicacion.toISOString()
        : undefined,
    }));

    return formattedArticles;
  } catch (error) {
    console.error("❌ Error al obtener artículos desde Prisma:", error);
    return [];
  }
}