// scripts/updateServiceScores.ts
import { Prisma, PrismaClient, ServicioStatus, FollowType } from "@prisma/client";

const prisma = new PrismaClient();

type ServicioWithRelations = Prisma.ServicioGetPayload<{
  include: {
    negocio: {
      include: {
        followsIn: true;
        reservations: true;
        orders: true;
        Servicio: true;
      };
    };
    multimedia: true;
  };
}>;

type Servicio = Prisma.ServicioGetPayload<null>;

async function main() {
  console.log("🌀 Iniciando recalculo batch de scores para servicios...");

  // 0) Calcula avg global de precio (asumimos avg global porque Servicio no tiene categoryId)
  const avgRes = await prisma.servicio.aggregate({ _avg: { precio: true } });
  const globalAvgPrice = (avgRes._avg && avgRes._avg.precio) ? Number(avgRes._avg.precio) : null;

  // 1) Trae todos los servicios con las relaciones necesarias (negocio + multimedia)
  const servicios: ServicioWithRelations[] = await prisma.servicio.findMany({
    include: {
      negocio: {
        include: {
          followsIn: true,
          reservations: true,
          orders: true,
          Servicio: true, // cuenta de servicios por negocio
        },
      },
      multimedia: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!servicios || servicios.length === 0) {
    console.log("ℹ️ No hay servicios para recalcular.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📊 Procesando ${servicios.length} servicios...`);

  const updates: Prisma.PrismaPromise<Servicio>[] = [];

  for (const svc of servicios) {
    const score = calculateServiceScore(svc, globalAvgPrice);
    const clamped = Math.max(1.0, Math.min(10.0, score));

    updates.push(
      prisma.servicio.update({ where: { id: svc.id }, data: { orden: clamped } })
    );
  }

  const results = await prisma.$transaction(updates);
  console.log(`✅ Recalculo completado: ${results.length} servicios actualizados.`);

  await prisma.$disconnect();
}

function calculateServiceScore(svc: ServicioWithRelations, globalAvgPrice: number | null): number {
  let score = 6.0; // base neutral
  const now = Date.now();
  const daysSince = (now - new Date(svc.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  // ------------------------
  // 1) Recencia (peso 0.3)
  // ------------------------
  const factorRecencia = Math.min(3.0, 3.0 * Math.exp(-daysSince / 60)); // decay en 60 días
  score += factorRecencia * 0.3;

  // ------------------------
  // 2) Demanda (reservas + orders) (peso 0.4)
  // ------------------------
  const negocio = svc.negocio ?? {};
  const countReservations = (negocio.reservations ?? []).length;
  const countOrders = (negocio.orders ?? []).length;

  let factorDemanda = Math.log(1 + (countReservations + countOrders * 1.5)) * 2.0;
  factorDemanda = Math.min(3.0, factorDemanda);

  // Boost si precio competitivo (menor que promedio global) -> +0.5
  if (svc.precio != null && globalAvgPrice != null && svc.precio < globalAvgPrice) {
    factorDemanda += 0.5;
  }

  // Penalidad: 0 reservas en últimos 60 días (o última reserva >60d)
  let lastResDays = Infinity;
  if ((negocio.reservations ?? []).length > 0) {
    const lastRes = (negocio.reservations).reduce((prev, cur) =>
      new Date(prev.createdAt) > new Date(cur.createdAt) ? prev : cur
    );
    lastResDays = (now - new Date(lastRes.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  }
  if (countReservations === 0 || lastResDays > 60) {
    factorDemanda -= 1.0;
  }

  score += factorDemanda * 0.4;

  // ------------------------
  // 3) Equidad para negocios pequeños (peso 0.2)
  // ------------------------
  const countServiciosNegocio = (negocio.Servicio ?? []).length || 0;
  let factorEquidad = 2.0 / Math.log(1 + Math.max(1, countServiciosNegocio));
  // bonus si negocio nuevo (<30 días)
  if (negocio.createdAt) {
    const negocioAgeDays = (now - new Date(negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (negocioAgeDays < 30) factorEquidad += 0.5;
  }
  factorEquidad = Math.min(2.0, factorEquidad);
  score += factorEquidad * 0.2;

  // ------------------------
  // 4) Engagement social (peso 0.2 -> 0.1 follows + 0.1 multimedia/tags)
  // ------------------------
  const followsCount = (negocio.followsIn ?? []).filter((f) => f.type === FollowType.USER_TO_BUSINESS).length;
  let factorFollows = Math.min(1.0, 0.5 + (followsCount / 10) * 0.5);

  const multimediaCount = (svc.multimedia ?? []).length;
  const tagsLen = (svc.tags ?? []).length;
  let factorContenido = Math.min(1.0, multimediaCount * 0.5 + tagsLen * 0.3);

  // Penalidad si servicio no disponible
  if (svc.status !== ServicioStatus.disponible) {
    factorFollows = Math.max(0, factorFollows - 0.5);
    factorContenido = Math.max(0, factorContenido - 0.5);
  }

  score += factorFollows * 0.1;
  score += factorContenido * 0.1;

  // ------------------------
  // 5) Relevancia por tags y precio competitivo (peso 0.1)
  // ------------------------
  let factorRelevancia = 0.5;
  if (tagsLen > 5) factorRelevancia += 0.5;
  if (svc.precio != null && globalAvgPrice != null && svc.precio < globalAvgPrice) factorRelevancia += 0.5;

  // descripcion es String[] en el schema -> calculamos longitud total
  const descText = Array.isArray(svc.descripcion) ? svc.descripcion.join(" ") : (svc.descripcion || "");
  if (descText.length < 50) factorRelevancia -= 0.5;

  factorRelevancia = Math.min(1.5, factorRelevancia);
  score += factorRelevancia * 0.1;

  // ------------------------
  // Penalidades globales y aleatoriedad reproducible
  // ------------------------
  if (score < 3.0 && daysSince > 60) score -= 1.0;

  if (score < 7.0) score += seededRandom(svc.id) * 0.5;

  return score;
}

// FNV-1a 32-bit -> reproducible [0,1]
function seededRandom(seed: string): number {
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