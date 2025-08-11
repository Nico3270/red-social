import { PrismaClient } from "@prisma/client";
import { initialData } from "./seed";
import { transactionData } from "./transactions";

const prisma = new PrismaClient();

const usuarioId = "b9023a76-9bd8-47ec-b136-f76b32aab9fe"
async function main() {
  try {
    console.log("Eliminando transacciones existentes...");
    await prisma.transaction.deleteMany({ where: { usuarioId } });

    console.log("🌱 Iniciando la carga de datos...");

    // Insertar categorías con upsert
    console.log("📦 Insertando transacciones...");
    for (const transaccion of transactionData) {
      await prisma.transaction.create({
        data: {
          date: new Date(transaccion.date),
          type: transaccion.type,
          description: transaccion.description,
          category: transaccion.category,
          amount: transaccion.amount,
          paymentMethod: transaccion.paymentMethod,
          usuarioId: usuarioId,
        }
      });
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