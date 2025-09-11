// scripts/updatePublicationScores.ts
import { PrismaClient } from '@prisma/client';
import { Visibilidad, EstadoNegocio, FollowType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌀 Iniciando recalculo batch de scores para publicaciones (local testing)...");

  try {
    // Paso 1: Query all publicaciones públicas elegibles (visibilidad PUBLICA, con includes para aggregates)
    const publicaciones = await prisma.publicacion.findMany({
      where: {
        visibilidad: Visibilidad.PUBLICA, // Solo públicas para feeds
      },
      include: {
        interacciones: {
          select: {
            tipo: true,
            reaccionTipo: true,
            createdAt: true, // Para timestamps si necesario
          },
        },
        multimedia: true, // Count media
        productosEnPublicacion: true, // Count enlaces productos
        negocio: {
          select: {
            id: true,
            estado: true,
            createdAt: true, // Para nuevo negocio
            followsIn: {
              where: {
                type: FollowType.USER_TO_BUSINESS, // Solo follows relevantes
              },
              select: {
                id: true, // Solo count, no full data
              },
            },
            publicaciones: true, // Count pubs del negocio para boost equidad
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Orden para iteración secuencial
      },
    });

    if (publicaciones.length === 0) {
      console.log("ℹ️ No hay publicaciones para recalcular.");
      return { success: true, updated: 0 };
    }

    console.log(`📊 Procesando ${publicaciones.length} publicaciones...`);

    // Paso 2: Prepara array de updates (para batch transaction)
    const updates = [];
    let updatedCount = 0;

    for (const pub of publicaciones) {
      // Cálculo del score (método numérico optimizado, O(1) por pub)
      const score = calculatePublicationScore(pub);

      // Clamp a 1-10
      const clampedScore = Math.max(1.0, Math.min(10.0, score));

      // Agrega a batch update
      updates.push(
        prisma.publicacion.update({
          where: { id: pub.id },
          data: { orden: clampedScore },
        })
      );

      updatedCount++;
    }

    // Paso 3: Ejecuta batch update en transaction (atómico, eficiente)
    const results = await prisma.$transaction(updates);

    console.log(`✅ Recalculo completado: ${updatedCount} publicaciones actualizadas.`);

    return { success: true, updated: updatedCount, results };
  } catch (error) {
    console.error("❌ Error en recalculo de scores:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message, updated: 0 };
    }

    return { success: false, error: String(error), updated: 0 };
  } finally {
    await prisma.$disconnect();
  }
}

// Función auxiliar para calcular score (numérico, alto rendimiento, adaptada al schema)
function calculatePublicationScore(pub: any): number {
  // Base neutral
  let score = 5.0;

  // 1. Factor Recencia (decaimiento exponencial, peso 0.3)
  const now = Date.now();
  const createdMs = new Date(pub.createdAt).getTime();
  const hoursSince = (now - createdMs) / (1000 * 60 * 60);
  const tau = 168; // 7 días en horas
  const factorRecencia = 3.0 * Math.exp(-hoursSince / tau); // Decaimiento suave (3.0 inicial, 1.5 en 3 días, 0.5 en 7 días)
  score += factorRecencia * 0.3;

  // 2. Factor Interacciones (log-normalización para likes/comentarios, peso 0.5)
  const likes = pub.interacciones.filter((i: any) => i.tipo === 'REACCION' && i.reaccionTipo === 'LIKE').length;
  const comentarios = pub.interacciones.filter((i: any) => i.tipo === 'COMENTARIO').length;
  const totalInteracciones = likes + (comentarios * 1.5); // Comentarios valen 1.5x
  const factorInteracciones = Math.log(1 + totalInteracciones) * 2.0; // Log evita explosión (10 likes = ~2.3, 100 = ~4.6)
  score += Math.min(3.0, factorInteracciones) * 0.5; // Cap 3.0, peso 0.5

  // 3. Factor Boost Negocios Nuevos/Menos Publicaciones (equidad, peso 0.2)
  if (pub.negocio) {
    const countPubsNegocio = pub.negocio.publicaciones.length;
    const factorNegociosNuevos = 2.0 / (1 + Math.log(1 + countPubsNegocio)); // Alto si <5 pubs (2.0), bajo si >50 (0.5)
    score += factorNegociosNuevos * 0.2;
  }

  // 4. Factor Boost Negocios Activos con Follows Altos (peso 0.1)
  if (pub.negocio && pub.negocio.estado === 'activo' && pub.visibilidad === 'PUBLICA') {
    const countFollows = pub.negocio.followsIn.length;
    const factorNegociosActivos = Math.min(1.0, 0.5 + (countFollows / 10) * 0.5); // 0.5 base + 0.5 por 10 follows
    score += factorNegociosActivos * 0.1;
  }

  // 5. Factor Boost Media y Productos Relacionados (peso 0.2)
  const countMedia = pub.multimedia.length;
  const countProductos = pub.productosEnPublicacion.length;
  const factorMediaProductos = Math.min(2.0, (countMedia * 0.5) + (countProductos * 1.0)); // Media 0.5/punto, productos 1.0
  score += factorMediaProductos * 0.2;

  // Penalidad Global (si bajo engagement y antiguo)
  if (score < 2.0 && hoursSince > 720) { // <2.0 y >30 días
    score = Math.max(1.0, score - 1.0); // Penalidad -1.0
  }

  return score;
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