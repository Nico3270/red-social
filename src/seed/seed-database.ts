import { PrismaClient } from "@prisma/client";
import { initialData } from "./seed";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Iniciando la carga de datos...");

    // Insertar categorías con upsert
    console.log("📦 Insertando categorías...");
    for (const categoria of initialData.categorias) {
      await prisma.category.upsert({
        where: { slug: categoria.slug },
        update: {
          nombre: categoria.nombre,
          iconName: categoria.iconName,
          isActive: categoria.isActive,
          updatedAt: new Date(),
        },
        create: {
          id: categoria.id,
          nombre: categoria.nombre,
          slug: categoria.slug,
          iconName: categoria.iconName,
          isActive: categoria.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Insertar secciones con verificación de categoría
    console.log("📁 Insertando secciones...");
    for (const seccion of initialData.secciones) {
      const categoria = await prisma.category.findUnique({
        where: { slug: seccion.categorySlug },
      });

      if (!categoria) {
        console.warn(`⚠️ Categoría no encontrada para la sección: ${seccion.nombre}`);
        continue;
      }

      const seccionExistente = await prisma.section.findFirst({
        where: {
          slug: seccion.slug,
          categoryId: categoria.id,
        },
      });

      if (!seccionExistente) {
        await prisma.section.create({
          data: {
            id: seccion.id,
            nombre: seccion.nombre,
            slug: seccion.slug,
            iconName: seccion.iconName,
            order: seccion.order, // <- solo Section tiene "order"
            isActive: seccion.isActive,
            categoryId: categoria.id,
          },
        });
        console.log(`➕ Sección creada: ${seccion.nombre}`);
      } else {
        console.log(`✔️ Sección ya existe: ${seccion.nombre}`);
      }
    }

    console.log("✅ Proceso finalizado con éxito.");
  } catch (error) {
    console.error("❌ Error durante la inserción de datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
