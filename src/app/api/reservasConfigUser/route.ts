// /app/api/reservasUserConfig/route.ts
import { NextResponse } from 'next/server';
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
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const negocioId = searchParams.get('negocioId'); // Nuevo param: negocioId requerido

  // Validación de params requeridos
  if (!dateStr || !negocioId) {
    return NextResponse.json<ReservationsResponse>({
      ok: false,
      message: 'Parámetros requeridos: ?date=YYYY-MM-DD&negocioId=ID_DEL_NEGOCIO',
      reservas: [],
    }, { status: 400 });
  }

  // Validación adicional: negocioId debe ser string válido (e.g., CUID o UUID)
  if (typeof negocioId !== 'string' || negocioId.trim() === '') {
    return NextResponse.json<ReservationsResponse>({
      ok: false,
      message: 'negocioId inválido',
      reservas: [],
    }, { status: 400 });
  }

  try {
    // Verificar si el negocio existe (para evitar queries inválidas)
    const negocioExists = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { id: true }, // Select mínimo para eficiencia
    });

    if (!negocioExists) {
      return NextResponse.json<ReservationsResponse>({
        ok: false,
        message: 'Negocio no encontrado',
        reservas: [],
      }, { status: 404 });
    }

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

    console.log("reservas encontradas para el día:", dateStr, formattedReservas);

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