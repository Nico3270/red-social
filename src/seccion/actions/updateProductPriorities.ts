// src/seccion/actions/updateProductPriorities.ts
"use server";

import prisma from "@/lib/prisma";

export async function updateProductPriorities(updates: { productId: string; sectionId: string; prioridad: number }[]) {
  console.log("Received updates in server:", JSON.stringify(updates, null, 2));

  try {
    // Prueba de conexión a la base de datos
    console.log("Testing database connection...");
    await prisma.$connect();
    const testQuery = await prisma.productSection.count();
    console.log(`Database connection OK. Total ProductSection records: ${testQuery}`);

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("No se proporcionaron datos para actualizar");
    }

    const operations = updates.map(async (update) => {
      if (!update.productId || !update.sectionId || typeof update.prioridad !== "number") {
        throw new Error(`Datos inválidos en la actualización: ${JSON.stringify(update)}`);
      }

      console.log(`Checking existence for productId: ${update.productId}, sectionId: ${update.sectionId}`);
      let exists;
      try {
        exists = await prisma.productSection.findUnique({
          where: {
            productId_sectionId: {
              productId: update.productId,
              sectionId: update.sectionId,
            },
          },
        });
        console.log(`Result of exists: ${JSON.stringify(exists)}`);
      } catch (findError) {
        console.error(`Error in findUnique for productId: ${update.productId}, sectionId: ${update.sectionId}:`, findError || 'No error object');
        throw new Error(`Fallo al verificar existencia: ${findError instanceof Error ? findError.message : 'Error desconocido o conexión fallida'}`);
      }

      if (!exists) {
        console.log(`Creating new record for productId: ${update.productId}, sectionId: ${update.sectionId}`);
        return prisma.productSection.create({
          data: {
            productId: update.productId,
            sectionId: update.sectionId,
            prioridad: update.prioridad,
          },
        });
      } else {
        console.log(`Updating: productId=${update.productId}, sectionId=${update.sectionId}, prioridad=${update.prioridad}`);
        return prisma.productSection.update({
          where: {
            productId_sectionId: {
              productId: update.productId,
              sectionId: update.sectionId,
            },
          },
          data: {
            prioridad: update.prioridad,
          },
        });
      }
    });

    console.log("Executing operations...");
    await Promise.all(operations);

    return {
      success: true,
      message: "Prioridades actualizadas o creadas correctamente",
    };
  } catch (error) {
    console.error("Error updating product priorities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar las prioridades",
    };
  } finally {
    await prisma.$disconnect();
  }
}