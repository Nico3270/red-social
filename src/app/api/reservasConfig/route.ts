// /app/api/reservasConfig/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns'; // Para rangos de fecha

export interface ReservationDayData {
    id: string;
    nombre: string;
    telefono: string;
    fechaHoraInicio: string;
    fechaHoraFin?: string | null; // Permite null de DB
    notas?: string | null; // Ajuste clave: permite null, que Prisma devuelve para campos ?
    estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | "BLOQUEADA";
    usuarioId?: string | null;
  }
  
  export interface ReservationsResponse {
    ok: boolean;
    message?: string;
    reservas: ReservationDayData[];
  }

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user?.negocioId) {
    return NextResponse.json<ReservationsResponse>({
      ok: false,
      message: 'Usuario no autenticado o sin negocio asociado',
      reservas: [],
    }, { status: 401 });
  }

  const negocioId = session.user.negocioId;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json<ReservationsResponse>({
      ok: false,
      message: 'Fecha requerida en query param (?date=YYYY-MM-DD)',
      reservas: [],
    }, { status: 400 });
  }

  try {
    const date = parseISO(dateStr);
    const start = startOfDay(date);
    const end = endOfDay(date);

    const reservas = await prisma.reservation.findMany({
      where: {
        negocioId,
        fechaHoraInicio: {
          gte: start,
          lt: end,
        },
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        fechaHoraInicio: true,
        fechaHoraFin: true,
        notas: true,
        estado: true,
        usuarioId: true,
      },
      orderBy: {
        fechaHoraInicio: 'asc', // Ordena por hora para dashboard secuencial
      },
    });

    // Map a interface (conversión de DateTime a ISO string para JSON)
    const formattedReservas: ReservationDayData[] = reservas.map(res => ({
        id: res.id,
        nombre: res.nombre,
        telefono: res.telefono,
        fechaHoraInicio: res.fechaHoraInicio.toISOString(),
        fechaHoraFin: res.fechaHoraFin ? res.fechaHoraFin.toISOString() : undefined, // Maneja null a undefined
        notas: res.notas ?? undefined, // ?? coalesce: null o undefined a undefined
        estado: res.estado,
        usuarioId: res.usuarioId ?? undefined,
      }));

    console.log( "reservas encontradas para el día:", dateStr, formattedReservas);

    return NextResponse.json<ReservationsResponse>({
      ok: true,
      reservas: formattedReservas,
    });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return NextResponse.json<ReservationsResponse>({
      ok: false,
      message: 'Error interno al consultar reservas',
      reservas: [],
    }, { status: 500 });
  }
}