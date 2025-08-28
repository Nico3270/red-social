import { PrismaClient } from "@prisma/client";
import { indexUrl } from "./googleIndexing";
import { InfoEmpresa } from "../config/config";

const prisma = new PrismaClient();

(async function seedIndexing() {
  console.log("🚀 Iniciando proceso de indexación de productos...");

  try {
    // 🔥 Obtener todos los productos
    const products = await prisma.product.findMany();

    if (!products.length) {
      console.log("⚠️ No hay productos en la base de datos.");
      return;
    }

    console.log(`📌 Se encontraron ${products.length} productos para indexar.`);

    const omitidos = 0;
    const indexados = 0;

    for (const product of products) {
      const productUrl = `${InfoEmpresa.linkWebProduccion}${
        product.slug.startsWith("smp-") ? `/productSmp/${product.slug}` : `/producto/${product.slug}`
      }`;

      

      try {
        const response = await indexUrl(productUrl);
        console.log(`✅ Respuesta de Google Indexing API: ${JSON.stringify(response, null, 2)}`);

    

        
      } catch (error) {
        console.error(`❌ Error al indexar ${productUrl}:`, error);
      }

      // 🕐 Pequeña pausa para evitar ser bloqueado por Google (opcional)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`✅ Proceso completado: ${indexados} productos indexados, ${omitidos} omitidos.`);

  } catch (error) {
    console.error("❌ Error en la ejecución del seed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("✅ Proceso de indexación finalizado.");
  }
})();
