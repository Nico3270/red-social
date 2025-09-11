// scripts/updateBusinessScores.ts
import { PrismaClient, EstadoNegocio, ProductEtiquetaEspecial, ProductStatus, FollowType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌀 Iniciando recalculo batch de scores para negocios...");

  // Traemos relaciones necesarias (nombres EXACTOS según tu schema)
  const negocios = await prisma.negocio.findMany({
    include: {
      Product: true, // productos del negocio
      orders: { select: { id: true, createdAt: true } }, // órdenes (para activity)
      followsIn: { select: { id: true, type: true, createdAt: true } }, // follows hacia el negocio
      reservations: { select: { id: true, createdAt: true } }, // reservas
      Servicio: { select: { id: true, createdAt: true } }, // servicios ofrecidos
      publicaciones: { include: { productosEnPublicacion: true } }, // publicaciones + enlaces a productos
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!negocios || negocios.length === 0) {
    console.log("ℹ️ No hay negocios para recalcular.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📊 Procesando ${negocios.length} negocios...`);

  const updates: any[] = [];

  for (const negocio of negocios) {
    const score = calculateBusinessScore(negocio);
    const clamped = Math.max(1.0, Math.min(10.0, score));

    updates.push(
      prisma.negocio.update({
        where: { id: negocio.id },
        data: { orden: clamped },
      })
    );
  }

  // Ejecuta en transacción para atomicidad/eficiencia
  const results = await prisma.$transaction(updates);

  console.log(`✅ Recalculo completado: ${results.length} negocios actualizados.`);
  await prisma.$disconnect();
}

function calculateBusinessScore(negocio: any): number {
  let score = 6.0; // base
  const now = Date.now();
  const daysSince = (now - new Date(negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  // ------------------------
  // 1) Recencia (peso 0.3)
  // ------------------------
  const factorRecencia = Math.min(3.0, 3.0 * Math.exp(-daysSince / 90));
  score += factorRecencia * 0.3;

  // ------------------------
  // 2) Actividad comercial (peso 0.4)
  // ------------------------
  const countProducts = (negocio.Product ?? []).length;
  const countOrders = (negocio.orders ?? []).length;

  let factorActividad = Math.log(1 + (countProducts + countOrders * 1.5)) * 2.0;
  factorActividad = Math.min(3.0, factorActividad);

  // Penalidad: 0 orders en últimos 60 días => -1.0
  let lastOrderDays = Infinity;
  if (countOrders > 0) {
    const lastOrder = (negocio.orders as any[]).reduce((prev, cur) => (new Date(prev.createdAt) > new Date(cur.createdAt) ? prev : cur));
    lastOrderDays = (now - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  }
  if (countOrders === 0 || lastOrderDays > 60) {
    factorActividad -= 1.0;
  }

  // Bonus si >5 productos disponibles
  const productosDisponibles = (negocio.Product ?? []).filter((p: any) => p.status === ProductStatus.disponible).length;
  if (productosDisponibles > 5) factorActividad += 0.5;

  score += factorActividad * 0.4;

  // ------------------------
  // 3) Equidad (negocios pequeños) (peso 0.2)
  // ------------------------
  // Evita dividir por 0; max(1, countProducts)
  let factorEquidad = 2.0 / Math.log(1 + Math.max(1, countProducts));
  if (countProducts < 5) factorEquidad += 0.5; // bonus para micro-tienda
  factorEquidad = Math.min(2.0, factorEquidad);
  score += factorEquidad * 0.2;

  // ------------------------
  // 4) Engagement social (peso 0.2 -> 0.1 follows + 0.1 reservas/servicios)
  // ------------------------
  const followsCount = (negocio.followsIn ?? []).filter((f: any) => f.type === FollowType.USER_TO_BUSINESS).length;
  let factorFollows = Math.min(1.0, 0.5 + (followsCount / 10) * 0.5);

  const reservasCount = (negocio.reservations ?? []).length;
  const serviciosCount = (negocio.Servicio ?? []).length;
  let factorReservasServicios = Math.min(1.0, reservasCount + serviciosCount * 0.5);

  // Penalidad si estado != activo
  if (negocio.estado !== EstadoNegocio.activo) {
    factorFollows = Math.max(0, factorFollows - 0.5);
    factorReservasServicios = Math.max(0, factorReservasServicios - 0.5);
  }

  score += factorFollows * 0.1;
  score += factorReservasServicios * 0.1;

  // ------------------------
  // 5) Relevancia por contenido/exposición (peso 0.1)
  // ------------------------
  let factorRelevancia = 0.5;

  if ((negocio.Product ?? []).some((p: any) =>
    p.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido || p.etiquetaEspecial === ProductEtiquetaEspecial.novedad
  )) {
    factorRelevancia += 1.0;
  }

  // contar PublicacionProducto para el negocio recorriendo publicaciones
  const totalPubProd = (negocio.publicaciones ?? []).reduce((acc: number, pub: any) => acc + ((pub.productosEnPublicacion ?? []).length), 0);
  if (totalPubProd > 5) factorRelevancia += 0.5;

  // penalidad si >50% productos agotados
  const agotados = (negocio.Product ?? []).filter((p: any) => p.status === ProductStatus.agotado).length;
  if (countProducts > 0 && (agotados / countProducts) > 0.5) factorRelevancia -= 0.5;

  factorRelevancia = Math.min(1.5, factorRelevancia);
  score += factorRelevancia * 0.1;

  // ------------------------
  // Penalidades globales y aleatoriedad reproducible
  // ------------------------
  if (score < 3.0 && daysSince > 60) score -= 1.0;

  // Aleatoriedad ligera para scores < 7.0
  if (score < 7.0) score += seededRandom(negocio.id) * 0.5;

  return score;
}

// Generador determinístico para "aleatoriedad" reproducible por id
function seededRandom(seed: string): number {
  // FNV-1a 32-bit hash -> [0,1]
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
}

// Auto-invocación
main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("❌ Error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
