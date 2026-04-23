import { NextResponse, NextRequest } from 'next/server';
import { buildPublicBusinessRelationWhere } from '@/lib/business/publicBusinessVisibility';
import prisma from '@/lib/prisma'; // Ajusta la ruta a tu Prisma client
import { ReaccionTipo } from '@prisma/client'; // Importa el enum para tipado
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

export async function GET(request: NextRequest, context: { params: Promise<{ publicacionId: string }> }) {
const params = await context.params;
  const { publicacionId } = params;
  const userId = request.nextUrl.searchParams.get('userId'); // Opcional via ?userId=uuid

  // Validación: publicacionId (CUID-like)
  if (!publicacionId || !publicacionId.startsWith('c')) {
    return NextResponse.json({ error: 'ID de publicación inválido' }, { status: 400 });
  }

  // Validación opcional: userId (uuid)
  if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
  }

  try {
    // Fetch contadores precomputados de Publicacion (eficiente, O(1) con índice)
    const publicacion = await prisma.publicacion.findFirst({
      where: {
        id: publicacionId,
        visibilidad: "PUBLICA",
        negocio: buildPublicBusinessRelationWhere(),
      },
      select: {
        numLikes: true,
        numComentarios: true,
        numCompartidos: true,
      },
    });

    if (!publicacion) {
      return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
    }

    // Breakdown de reacciones globales (GROUP BY con índice en tipo/reaccionTipo)
    const reactionsAggregate = await prisma.interaccion.groupBy({
      by: ['reaccionTipo'],
      where: {
        publicacionId,
        tipo: 'REACCION',
      },
      _count: {
        reaccionTipo: true,
      },
    });

    // Mapear aggregados a objeto (default 0)
    const reactionsByType = {
      LIKE: 0,
      LOVE: 0,
      WOW: 0,
      SAD: 0,
      ANGRY: 0,
    } as Record<ReaccionTipo, number>;

    reactionsAggregate.forEach((agg) => {
      if (agg.reaccionTipo) {
        reactionsByType[agg.reaccionTipo] = agg._count.reaccionTipo || 0;
      }
    });

    // Reacción del usuario específico (si userId proporcionado)
    let userReaction: ReaccionTipo | null = null;
    if (userId) {
      const userInteraccion = await prisma.interaccion.findFirst({
        where: {
          publicacionId,
          usuarioId: userId,
          tipo: 'REACCION',
        },
        select: {
          reaccionTipo: true,
        },
      });
      userReaction = userInteraccion?.reaccionTipo ?? null;
    }

    // Respuesta tipada con caching headers
    const summary = {
      numLikes: publicacion.numLikes,
      numComentarios: publicacion.numComentarios,
      numCompartidos: publicacion.numCompartidos,
      reactionsByType,
      userReaction,
    };

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Error en API summary:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
