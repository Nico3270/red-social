// src/seed/aleatorioScore.ts
import { PrismaClient } from '@prisma/client';
import { Visibilidad } from '@prisma/client'; // Importar si es necesario para filtros

const prisma = new PrismaClient();

async function main() {
  console.log("🌀 Iniciando asignación aleatoria de orden para modelos (local testing)...");

  try {
    // Preparar array de updates para batch transaction
    const updates = [];
    let updatedCount = 0;

    // 1. Actualizar Negocio (todos los negocios)
    const negocios = await prisma.negocio.findMany({
      select: { id: true },
    });

    for (const neg of negocios) {
      const randomOrden = Math.random() * 9 + 1; // Aleatorio entre 1 y 10 (float)
      updates.push(
        prisma.negocio.update({
          where: { id: neg.id },
          data: { orden: randomOrden },
        })
      );
      updatedCount++;
    }

    // 2. Actualizar Publicacion (solo públicas, como en el original)
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        visibilidad: Visibilidad.PUBLICA,
      },
      select: { id: true },
    });

    for (const pub of publicaciones) {
      const randomOrden = Math.random() * 9 + 1; // Aleatorio entre 1 y 10 (float)
      updates.push(
        prisma.publicacion.update({
          where: { id: pub.id },
          data: { orden: randomOrden },
        })
      );
      updatedCount++;
    }

    // 3. Actualizar Producto (todos los productos, asumiendo no hay filtro específico)
    const productos = await prisma.product.findMany({
      select: { id: true },
    });

    for (const prod of productos) {
      const randomOrden = Math.random() * 9 + 1; // Aleatorio entre 1 y 10 (float)
      console.log(`Intentando actualizar Producto con id: ${prod.id}`); // Log para depuración en el bloque problemático
      updates.push(
        prisma.product.update({
          where: { id: prod.id },
          data: { orden: randomOrden },
        })
      );
      updatedCount++;
    }

    // 4. Actualizar Servicio (todos los servicios, asumiendo no hay filtro específico)
    const servicios = await prisma.servicio.findMany({
      select: { id: true },
    });

    for (const serv of servicios) {
      const randomOrden = Math.random() * 9 + 1; // Aleatorio entre 1 y 10 (float)
      updates.push(
        prisma.servicio.update({
          where: { id: serv.id },
          data: { orden: randomOrden },
        })
      );
      updatedCount++;
    }

    if (updatedCount === 0) {
      console.log("ℹ️ No hay registros para actualizar.");
      return { success: true, updated: 0 };
    }

    console.log(`📊 Procesando ${updatedCount} registros...`);

    // Ejecutar batch update en transaction
    const results = await prisma.$transaction(updates);

    console.log(`✅ Asignación completada: ${updatedCount} registros actualizados.`);

    return { success: true, updated: updatedCount, results };
  } catch (error) {
    console.error("❌ Error en asignación aleatoria de orden:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message, updated: 0 };
    }

    return { success: false, error: String(error), updated: 0 };
  } finally {
    await prisma.$disconnect();
  }
}

// Autoinvocación (ejecuta main al cargar el script)
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });