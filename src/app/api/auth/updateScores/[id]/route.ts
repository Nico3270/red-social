// app/api/auth/updateScores/[id]/route.ts
import {  NextResponse } from 'next/server';
import { Prisma, PrismaClient, EstadoNegocio, ProductEtiquetaEspecial, ProductStatus, FollowType, InteraccionTipo, ReaccionTipo, Visibilidad, ServicioStatus } from "@prisma/client";

// Inicializamos PrismaClient una sola vez (buena práctica en Next.js)
const prisma = new PrismaClient();

// Función para generar aleatoriedad reproducible (común a varios scripts)
function seededRandom(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
}

// -------------------------
// Tipos y funciones para updateBusinessScores
// -------------------------
type NegocioWithRelations = Prisma.NegocioGetPayload<{
  include: {
    Product: true;
    orders: { select: { id: true; createdAt: true } };
    followsIn: { select: { id: true; type: true; createdAt: true } };
    reservations: { select: { id: true; createdAt: true } };
    Servicio: { select: { id: true; createdAt: true } };
    publicaciones: { include: { productosEnPublicacion: true } };
  };
}>;

async function updateBusinessScores() {
  console.log("🌀 Iniciando recalculo batch de scores para negocios...");

  const negocios: NegocioWithRelations[] = await prisma.negocio.findMany({
    include: {
      Product: true,
      orders: { select: { id: true, createdAt: true } },
      followsIn: { select: { id: true, type: true, createdAt: true } },
      reservations: { select: { id: true, createdAt: true } },
      Servicio: { select: { id: true, createdAt: true } },
      publicaciones: { include: { productosEnPublicacion: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!negocios || negocios.length === 0) {
    console.log("ℹ️ No hay negocios para recalcular.");
    return { updated: 0 };
  }

  console.log(`📊 Procesando ${negocios.length} negocios...`);

  const updates = [];

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

  await prisma.$transaction(updates);
  console.log(`✅ ${updates.length} negocios actualizados.`);
  return { updated: updates.length };
}

function calculateBusinessScore(negocio: NegocioWithRelations): number {
  let score = 6.0;
  const now = Date.now();
  const daysSince = (now - new Date(negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  const factorRecencia = Math.min(3.0, 3.0 * Math.exp(-daysSince / 90));
  score += factorRecencia * 0.3;

  const countProducts = (negocio.Product ?? []).length;
  const countOrders = (negocio.orders ?? []).length;

  let factorActividad = Math.log(1 + (countProducts + countOrders * 1.5)) * 2.0;
  factorActividad = Math.min(3.0, factorActividad);

  let lastOrderDays = Infinity;
  if (countOrders > 0) {
    const lastOrder = (negocio.orders).reduce((prev, cur) => (new Date(prev.createdAt) > new Date(cur.createdAt) ? prev : cur));
    lastOrderDays = (now - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  }
  if (countOrders === 0 || lastOrderDays > 60) {
    factorActividad -= 1.0;
  }

  const productosDisponibles = (negocio.Product ?? []).filter((p) => p.status === ProductStatus.disponible).length;
  if (productosDisponibles > 5) factorActividad += 0.5;

  score += factorActividad * 0.4;

  let factorEquidad = 2.0 / Math.log(1 + Math.max(1, countProducts));
  if (countProducts < 5) factorEquidad += 0.5;
  factorEquidad = Math.min(2.0, factorEquidad);
  score += factorEquidad * 0.2;

  const followsCount = (negocio.followsIn ?? []).filter((f) => f.type === FollowType.USER_TO_BUSINESS).length;
  let factorFollows = Math.min(1.0, 0.5 + (followsCount / 10) * 0.5);

  const reservasCount = (negocio.reservations ?? []).length;
  const serviciosCount = (negocio.Servicio ?? []).length;
  let factorReservasServicios = Math.min(1.0, reservasCount + serviciosCount * 0.5);

  if (negocio.estado !== EstadoNegocio.activo) {
    factorFollows = Math.max(0, factorFollows - 0.5);
    factorReservasServicios = Math.max(0, factorReservasServicios - 0.5);
  }

  score += factorFollows * 0.1;
  score += factorReservasServicios * 0.1;

  let factorRelevancia = 0.5;

  if ((negocio.Product ?? []).some((p) =>
    p.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido || p.etiquetaEspecial === ProductEtiquetaEspecial.novedad
  )) {
    factorRelevancia += 1.0;
  }

  const totalPubProd = (negocio.publicaciones ?? []).reduce((acc: number, pub) => acc + ((pub.productosEnPublicacion ?? []).length), 0);
  if (totalPubProd > 5) factorRelevancia += 0.5;

  const agotados = (negocio.Product ?? []).filter((p) => p.status === ProductStatus.agotado).length;
  if (countProducts > 0 && (agotados / countProducts) > 0.5) factorRelevancia -= 0.5;

  factorRelevancia = Math.min(1.5, factorRelevancia);
  score += factorRelevancia * 0.1;

  if (score < 3.0 && daysSince > 60) score -= 1.0;

  if (score < 7.0) score += seededRandom(negocio.id) * 0.5;

  return score;
}

// -------------------------
// Tipos y funciones para updateProductScores
// -------------------------
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

async function updateProductScores() {
  console.log("🌀 Iniciando recalculo batch de scores para productos...");

  const productos: ProductWithRelations[] = await prisma.product.findMany({
    include: {
      orderItems: true,
      imagenes: true,
      publicacionesRelacionadas: true,
      negocio: {
        include: {
          Product: true,
        },
      },
      category: {
        include: {
          productos: true,
        },
      },
    },
  });

  if (productos.length === 0) {
    console.log("ℹ️ No hay productos para recalcular.");
    return { updated: 0 };
  }

  console.log(`📊 Procesando ${productos.length} productos...`);

  const updates = [];

  for (const product of productos) {
    const score = calculateProductScore(product);
    const clamped = Math.max(1.0, Math.min(10.0, score));

    updates.push(
      prisma.product.update({
        where: { id: product.id },
        data: { orden: clamped },
      })
    );
  }

  await prisma.$transaction(updates);
  console.log(`✅ ${updates.length} productos actualizados.`);
  return { updated: updates.length };
}

function calculateProductScore(product: ProductWithRelations): number {
  let score = 6.0;
  const now = Date.now();

  const daysSince = (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const factorRecencia = 3.0 * Math.exp(-daysSince / 30);
  score += Math.min(3.0, factorRecencia) * 0.3;

  const ventas = product.orderItems.reduce((sum: number, oi) => sum + oi.quantity, 0);
  let factorVentas = Math.log(1 + ventas) * 2.0;
  if (ventas < 10) factorVentas += Math.random() * 0.2;
  if (product.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido) factorVentas += 1.0;
  score += Math.min(3.0, factorVentas) * 0.4;

  if (product.negocio) {
    const negocioAgeDays = (now - new Date(product.negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const totalProducts = product.negocio.Product.length;
    let factorEquidad = 2.0 / Math.log(1 + totalProducts);
    if (negocioAgeDays < 30) factorEquidad += 0.5;
    factorEquidad += seededRandom(product.id) * 0.5;
    score += factorEquidad * 0.2;
  }

  const countImages = product.imagenes.length;
  const countPubs = product.publicacionesRelacionadas.length;
  let factorMedia = Math.min(1.5, countImages * 0.5);
  if (countImages > 5) factorMedia += 0.3;
  const factorPubs = Math.min(1.5, countPubs * 1.0);
  score += (factorMedia * 0.15) + (factorPubs * 0.15);

  let factorCategoria = 0.5;
  if (
    product.etiquetaEspecial === ProductEtiquetaEspecial.mas_vendido ||
    product.etiquetaEspecial === ProductEtiquetaEspecial.novedad
  ) {
    factorCategoria += 1.0;
  }
  if (product.status !== ProductStatus.disponible) factorCategoria -= 0.5;
  if (product.category && product.category.productos.length < 50) factorCategoria += 0.1;
  score += Math.min(1.5, factorCategoria) * 0.1;

  return score;
}

// -------------------------
// Tipos y funciones para updatePublicationScores
// -------------------------
type PublicacionWithRelations = Prisma.PublicacionGetPayload<{
  include: {
    interacciones: {
      select: {
        tipo: true;
        reaccionTipo: true;
        createdAt: true;
      };
    };
    multimedia: true;
    productosEnPublicacion: true;
    negocio: {
      select: {
        id: true;
        estado: true;
        createdAt: true;
        followsIn: {
          select: {
            id: true;
          };
        };
        publicaciones: true;
      };
    };
  };
}>;

async function updatePublicationScores() {
  console.log("🌀 Iniciando recalculo batch de scores para publicaciones...");

  const publicaciones: PublicacionWithRelations[] = await prisma.publicacion.findMany({
    where: {
      visibilidad: Visibilidad.PUBLICA,
    },
    include: {
      interacciones: {
        select: {
          tipo: true,
          reaccionTipo: true,
          createdAt: true,
        },
      },
      multimedia: true,
      productosEnPublicacion: true,
      negocio: {
        select: {
          id: true,
          estado: true,
          createdAt: true,
          followsIn: {
            where: {
              type: FollowType.USER_TO_BUSINESS,
            },
            select: {
              id: true,
            },
          },
          publicaciones: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (publicaciones.length === 0) {
    console.log("ℹ️ No hay publicaciones para recalcular.");
    return { updated: 0 };
  }

  console.log(`📊 Procesando ${publicaciones.length} publicaciones...`);

  const updates = [];

  for (const pub of publicaciones) {
    const score = calculatePublicationScore(pub);
    const clamped = Math.max(1.0, Math.min(10.0, score));

    updates.push(
      prisma.publicacion.update({
        where: { id: pub.id },
        data: { orden: clamped },
      })
    );
  }

  await prisma.$transaction(updates);
  console.log(`✅ ${updates.length} publicaciones actualizadas.`);
  return { updated: updates.length };
}

function calculatePublicationScore(pub: PublicacionWithRelations): number {
  let score = 5.0;

  const now = Date.now();
  const createdMs = new Date(pub.createdAt).getTime();
  const hoursSince = (now - createdMs) / (1000 * 60 * 60);
  const tau = 168;
  const factorRecencia = 3.0 * Math.exp(-hoursSince / tau);
  score += factorRecencia * 0.3;

  const likes = pub.interacciones.filter((i) => i.tipo === InteraccionTipo.REACCION && i.reaccionTipo === ReaccionTipo.LIKE).length;
  const comentarios = pub.interacciones.filter((i) => i.tipo === InteraccionTipo.COMENTARIO).length;
  const totalInteracciones = likes + (comentarios * 1.5);
  const factorInteracciones = Math.log(1 + totalInteracciones) * 2.0;
  score += Math.min(3.0, factorInteracciones) * 0.5;

  if (pub.negocio) {
    const countPubsNegocio = pub.negocio.publicaciones.length;
    const factorNegociosNuevos = 2.0 / (1 + Math.log(1 + countPubsNegocio));
    score += factorNegociosNuevos * 0.2;
  }

  if (pub.negocio && pub.negocio.estado === EstadoNegocio.activo && pub.visibilidad === Visibilidad.PUBLICA) {
    const countFollows = pub.negocio.followsIn.length;
    const factorNegociosActivos = Math.min(1.0, 0.5 + (countFollows / 10) * 0.5);
    score += factorNegociosActivos * 0.1;
  }

  const countMedia = pub.multimedia.length;
  const countProductos = pub.productosEnPublicacion.length;
  const factorMediaProductos = Math.min(2.0, (countMedia * 0.5) + (countProductos * 1.0));
  score += factorMediaProductos * 0.2;

  if (score < 2.0 && hoursSince > 720) {
    score = Math.max(1.0, score - 1.0);
  }

  return score;
}

// -------------------------
// Tipos y funciones para updateServiceScores
// -------------------------
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

async function updateServiceScores() {
  console.log("🌀 Iniciando recalculo batch de scores para servicios...");

  const avgRes = await prisma.servicio.aggregate({ _avg: { precio: true } });
  const globalAvgPrice = (avgRes._avg && avgRes._avg.precio) ? Number(avgRes._avg.precio) : null;

  const servicios: ServicioWithRelations[] = await prisma.servicio.findMany({
    include: {
      negocio: {
        include: {
          followsIn: true,
          reservations: true,
          orders: true,
          Servicio: true,
        },
      },
      multimedia: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!servicios || servicios.length === 0) {
    console.log("ℹ️ No hay servicios para recalcular.");
    return { updated: 0 };
  }

  console.log(`📊 Procesando ${servicios.length} servicios...`);

  const updates = [];

  for (const svc of servicios) {
    const score = calculateServiceScore(svc, globalAvgPrice);
    const clamped = Math.max(1.0, Math.min(10.0, score));

    updates.push(
      prisma.servicio.update({
        where: { id: svc.id },
        data: { orden: clamped },
      })
    );
  }

  await prisma.$transaction(updates);
  console.log(`✅ ${updates.length} servicios actualizados.`);
  return { updated: updates.length };
}

function calculateServiceScore(svc: ServicioWithRelations, globalAvgPrice: number | null): number {
  let score = 6.0;
  const now = Date.now();
  const daysSince = (now - new Date(svc.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  const factorRecencia = Math.min(3.0, 3.0 * Math.exp(-daysSince / 60));
  score += factorRecencia * 0.3;

  const negocio = svc.negocio ?? {};
  const countReservations = (negocio.reservations ?? []).length;
  const countOrders = (negocio.orders ?? []).length;

  let factorDemanda = Math.log(1 + (countReservations + countOrders * 1.5)) * 2.0;
  factorDemanda = Math.min(3.0, factorDemanda);

  if (svc.precio != null && globalAvgPrice != null && svc.precio < globalAvgPrice) {
    factorDemanda += 0.5;
  }

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

  const countServiciosNegocio = (negocio.Servicio ?? []).length || 0;
  let factorEquidad = 2.0 / Math.log(1 + Math.max(1, countServiciosNegocio));
  if (negocio.createdAt) {
    const negocioAgeDays = (now - new Date(negocio.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (negocioAgeDays < 30) factorEquidad += 0.5;
  }
  factorEquidad = Math.min(2.0, factorEquidad);
  score += factorEquidad * 0.2;

  const followsCount = (negocio.followsIn ?? []).filter((f) => f.type === FollowType.USER_TO_BUSINESS).length;
  let factorFollows = Math.min(1.0, 0.5 + (followsCount / 10) * 0.5);

  const multimediaCount = (svc.multimedia ?? []).length;
  const tagsLen = (svc.tags ?? []).length;
  let factorContenido = Math.min(1.0, multimediaCount * 0.5 + tagsLen * 0.3);

  if (svc.status !== ServicioStatus.disponible) {
    factorFollows = Math.max(0, factorFollows - 0.5);
    factorContenido = Math.max(0, factorContenido - 0.5);
  }

  score += factorFollows * 0.1;
  score += factorContenido * 0.1;

  let factorRelevancia = 0.5;
  if (tagsLen > 5) factorRelevancia += 0.5;
  if (svc.precio != null && globalAvgPrice != null && svc.precio < globalAvgPrice) factorRelevancia += 0.5;

  const descText = Array.isArray(svc.descripcion) ? svc.descripcion.join(" ") : (svc.descripcion || "");
  if (descText.length < 50) factorRelevancia -= 0.5;

  factorRelevancia = Math.min(1.5, factorRelevancia);
  score += factorRelevancia * 0.1;

  if (score < 3.0 && daysSince > 60) score -= 1.0;

  if (score < 7.0) score += seededRandom(svc.id) * 0.5;

  return score;
}

// -------------------------
// Handler del endpoint
// -------------------------

type Params = { id: string };
export async function GET(request: Request, context: { params: Promise<Params> }) {

  try {
    const providedId = (await context.params).id;

    // Verifica la "contraseña" desde .env (debe estar en process.env.ID_UPDATES)
    const secretId = process.env.ID_UPDATES;
    if (!secretId || providedId !== secretId) {
      return NextResponse.json({ error: 'Acceso denegado. ID inválido.' }, { status: 403 });
    }

    // Ejecuta las actualizaciones secuencialmente
    const businessResult = await updateBusinessScores();
    const productResult = await updateProductScores();
    const publicationResult = await updatePublicationScores();
    const serviceResult = await updateServiceScores();

    // Respuesta con resumen
    return NextResponse.json({
      success: true,
      message: 'Recálculo de scores completado.',
      details: {
        businessesUpdated: businessResult.updated,
        productsUpdated: productResult.updated,
        publicationsUpdated: publicationResult.updated,
        servicesUpdated: serviceResult.updated,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error en el endpoint de updateScores:', error);
    return NextResponse.json({ error: 'Error interno al procesar las actualizaciones.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}