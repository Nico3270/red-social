"use server";

import prisma from "@/lib/prisma";

export async function getSections() {
  const sections = await prisma.section.findMany({
    where: { isActive: true }, // Solo secciones activas
    select: {
      id: true,
      nombre: true,
    },
  });

  return sections.map((section) => ({
    id: section.id,
    name: section.nombre,
  }));
}
