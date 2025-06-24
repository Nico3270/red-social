import { PrismaClient } from "@prisma/client";
import { initialData } from "./seed";


const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Iniciando la carga de datos...");
    await prisma.section.deleteMany();
    await prisma.service.deleteMany();
    await prisma.tarjeta.deleteMany();

    // Eliminar datos existentes si estamos en modo desarrollo
    // Insertar secciones
    console.log("Insertando secciones...");
    const sectionMap: { [key: string]: string } = {};
    for (const section of initialData.secciones) {
      const createdSection = await prisma.section.create({
        data: {
          id: section.id,
          nombre: section.name,
          slug: section.href,
          iconName: section.iconName,
          order: section.order,
          isActive: section.isActive,
        },
      });
      sectionMap[section.id] = createdSection.id;
    }

    // // Inserción de Tarjetas
    // for (const tarjeta of initialData.tarjetas) {
    //   await prisma.tarjeta.upsert({
    //     where: { id: tarjeta.id },
    //     update: {},
    //     create: {
    //       id: tarjeta.id,
    //       titulo: tarjeta.titulo,
    //       descripcion: tarjeta.descripcion,
    //       imagen: tarjeta.imagen,
    //       createdAt: tarjeta.createdAt,
    //       updatedAt: tarjeta.updatedAt,
    //     },
    //   });
    // }
    // console.log("✅ Tarjetas insertadas.");


    // Inserción de Servicios
    for (const service of initialData.services) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {},
        create: {
          id: service.id,
          titulo: service.titulo,
          descripcion: service.descripcion,
          imagen: service.imagen,
          slug: service.slug,
          isActive: service.isActive,
        },
      });
    }
    console.log("✅ Servicios insertados.");


    

    console.log("Datos insertados correctamente");
  } catch (error) {
    console.error("Error durante la inserción de datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
