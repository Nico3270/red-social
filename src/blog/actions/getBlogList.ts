"use server";

import prisma from "@/lib/prisma";

export const getBlogList = async () => {
  try {
    const blogs = await prisma.articulo.findMany({
      orderBy: { orden: "asc" }, // Usamos "orden" para ordenar los blogs
    });
    return blogs;
  } catch (error) {
    console.error("Error al obtener blogs:", error);
    return [];
  }
};
