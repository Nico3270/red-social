import { PrismaClient } from "@prisma/client";
import { preguntasCalificables } from "./preguntas";

const prisma = new PrismaClient();

async function main() {
  try {
    // Opcional: Borrado condicional y selectivo (solo admin, en no-prod con flag)
    if (process.env.NODE_ENV !== "production" && process.env.SEED_RESET === "true") {
      console.log("🗑️ Eliminando preguntas existentes con creador ADMIN...");
      await prisma.pregunta.deleteMany({
        where: { creador: "ADMIN" }, // Solo borra fijas admin, preserva custom de negocios
      });
      console.log("✅ Preguntas ADMIN eliminadas con éxito.");
    }

    console.log("🌱 Iniciando la carga de datos...");

    // Inserción en batch con transacción para atomicidad
    await prisma.$transaction(async (tx) => {
      if (preguntasCalificables.length === 0) {
        console.warn("⚠️ No hay preguntas para insertar.");
        return;
      }

      console.log(`📦 Insertando ${preguntasCalificables.length} preguntas...`);

      // Usa createMany para eficiencia en batch
      await tx.pregunta.createMany({
        data: preguntasCalificables.map((pregunta) => ({
          texto: pregunta.texto,
          tipo: pregunta.tipo,
          creador: pregunta.creador,
          requerida: pregunta.requerida,
          categoria: pregunta.categoria,
        })),
        skipDuplicates: true, // Evita inserts duplicados si hay uniques en texto/categoria
      });

      // Log detallado con tabla para visualización elegante
      console.table(preguntasCalificables.map((p, i) => ({ id: i + 1, texto: p.texto, categoria: p.categoria })));
    });

    console.log("✅ Proceso finalizado con éxito. Datos insertados en fecha: August 19, 2025.");
  } catch (error) {
    console.error("❌ Error durante la inserción de datos:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();

  }
}

main();