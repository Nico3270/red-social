// scripts/updateProductScores.ts
import { Prisma, PrismaClient, ProductStatus, ProductEtiquetaEspecial } from "@prisma/client";

const prisma = new PrismaClient();

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    orderItems: true;
    imagenes: true;
    publicacionesRelacionadas: true;
    negocio: {
      include: {
        Product: true;
      };
    };
    category: {
      include: {
        productos: true;
      };
    };
  };
}>;

async function main() {
  console.log("🌀 Iniciando recalculo batch de scores para productos...");

  try {
    // Paso 1: Query all products con includes necesarios
    const productos: ProductWithRelations[] = await prisma.product.findMany({
      include: {
        orderItems: true, // Para contar ventas
        imagenes: true, // Para count media
        publicacionesRelacionadas: true, // Para enlaces en publicaciones
        negocio: {
          include: {
            Product: true, // Para contar productos del negocio
          },
        },
        category: {
          include: {
            productos: true, // Para count en la categoría
          },
        },
      },
    });

    if (productos.length === 0) {
      console.log("ℹ️ No hay productos para recalcular.");
      return { success: true, updated: 0 };
    }

    console.log(`📊 Procesando ${productos.length} productos...`);

    const updates = [];
    let updatedCount = 0;

    for (const product of productos) {
      const score = calculateProductScore(product);

      // Clamp entre 1 - 10
      const clamped = Math.max(1.0, Math.min(10.0, score));

      updates.push(
        prisma.product.update({
          where: { id: product.id },
          data: { orden: clamped },
        })
      );

      updatedCount++;
    }

    await prisma.$transaction(updates);

    console.log(`✅ Recalculo completado: ${updatedCount} productos actualizados.`);
  } catch (error) {
    console.error("❌ Error en recalculo de scores:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Función auxiliar para calcular score de productos
function calculateProductScore(product: ProductWithRelations): number {
  let score = 6.0; // Base neutral

  const now = Date.now();

  // 1. Factor Recencia (peso 0.3)
  const daysSince = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const factorRecencia = 3.0 * Math.exp(-daysSince / 30); // ~1.5 en 15 días, ~0.5 en 60 días
  score += Math.min(3.0, factorRecencia) * 0.3;

  // 2. Factor Popularidad por Ventas (peso 0.4)
  const ventas = product.orderItems.reduce((sum: number, oi) => sum + oi.quantity, 0);
  let factorVentas = Math.log(1 + ventas) * 2.0;
  if (ventas < 10) factorVentas += Math.random() * 0.2; // Aleatoriedad ligera
  if (product.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido) factorVentas += 1.0;
  score += Math.min(3.0, factorVentas) * 0.4;

  // 3. Factor Boost Negocios Nuevos/Menos Productos (peso 0.2)
  if (product.negocio) {
    const negocioAgeDays = (now - new Date(product.negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const totalProducts = product.negocio.Product.length;
    let factorEquidad = 2.0 / Math.log(1 + totalProducts);
    if (negocioAgeDays < 30) factorEquidad += 0.5; // Bonus negocio nuevo
    factorEquidad += seededRandom(product.id) * 0.5; // Aleatoriedad ligera
    score += factorEquidad * 0.2;
  }

  // 4. Factor Boost Contenido Rico (peso 0.3 -> 0.15 media + 0.15 publicaciones)
  const countImages = product.imagenes.length;
  const countPubs = product.publicacionesRelacionadas.length;
  let factorMedia = Math.min(1.5, countImages * 0.5);
  if (countImages > 5) factorMedia += 0.3; // Bonus extra
  const factorPubs = Math.min(1.5, countPubs * 1.0);
  score += (factorMedia * 0.15) + (factorPubs * 0.15);

  // 5. Factor Relevancia Categórica (peso 0.1)
  let factorCategoria = 0.5;
  if (
    product.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido ||
    product.etiquetaEspecial === ProductEtiquetaEspecial.novedad
  ) {
    factorCategoria += 1.0;
  }
  if (product.status !== ProductStatus.disponible) factorCategoria -= 0.5;
  if (product.category && product.category.productos.length < 50) factorCategoria += 0.1; // Variedad
  score += Math.min(1.5, factorCategoria) * 0.1;

  return score;
}

// Aleatoriedad determinística (seeded) para no cambiar cada corrida
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return ((h >>> 0) % 1000) / 1000; // 0.0 - 1.0
}

main();