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

    // Validación de IDs duplicados en secciones (nueva sección)
    console.log("🔍 Validando IDs únicos en secciones...");
    const idSet = new Set<string>(); // Set para IDs únicos
    const duplicates: string[] = []; // Array para IDs repetidos
    for (const seccion of initialData.secciones) {
      if (idSet.has(seccion.id)) {
        duplicates.push(seccion.id); // Registra duplicado
      } else {
        idSet.add(seccion.id); // Agrega si es único
      }
    }

    if (duplicates.length > 0) {
      console.warn(`⚠️ IDs duplicados encontrados: ${duplicates.join(', ')}. Corrige antes de continuar.`);
      // Opcional: Detén la ejecución si quieres forzar corrección
      // throw new Error("Duplicados detectados en IDs de secciones.");
    } else {
      console.log("✅ Todos los IDs de secciones son únicos.");
    }

    // Insertar secciones con verificación de categoría
    console.log("📁 Insertando secciones...");
    for (const seccion of initialData.secciones) {
      const categoria = await prisma.category.findUnique({
        where: { slug: seccion.categorySlug },
      });

      if (!categoria) {
        console.warn(`⚠️ Categoría no encontrada para la sección: ${seccion.nombre} (ID: ${seccion.id}, Slug: ${seccion.slug})`);
        continue;
      }

      const seccionExistente = await prisma.section.findFirst({
        where: {
          slug: seccion.slug,
          categoryId: categoria.id,
        },
      });

      if (!seccionExistente) {
        try {
          console.log(`🛠️ Intentando crear sección: ${seccion.nombre} (ID: ${seccion.id}, Slug: ${seccion.slug})`);
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
        } catch (createError) {
          console.error(`❌ Error al crear sección ${seccion.nombre} (ID: ${seccion.id}, Slug: ${seccion.slug}):`, createError);
          // Continúa con la siguiente sección sin detener el script
        }
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