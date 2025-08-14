// app/api/transaccionesExcel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';
import { Prisma, Transaction } from '@prisma/client';
import { z } from 'zod';
import { TransactionType, PaymentMethod } from '@/transacciones/interfaces/types';

const querySchema = z.object({
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'startDate inválida (ISO)' }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'endDate inválida (ISO)' }),
  type: z.nativeEnum(TransactionType).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

type TransactionSummary = Pick<Transaction, 'id' | 'date' | 'type' | 'description' | 'category' | 'paymentMethod'> & {
  amount: Prisma.Decimal;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const usuarioId = session.user.id;

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const validated = querySchema.safeParse(params);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.errors.map(e => e.message).join(', ') }, { status: 400 });
  }
  let { startDate, endDate, type, paymentMethod } = validated.data;

  // Default a último mes si no hay fechas (evita históricos masivos, elegante para UX inicial)
  if (!startDate && !endDate) {
    const now = new Date();
    endDate = now.toISOString(); // Hoy full ISO
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    startDate = lastMonth.toISOString(); // Hace 1 mes full ISO
  }

  const where: Prisma.TransactionWhereInput = {
    usuarioId,
    ...(type && { type }),
    ...(paymentMethod && { paymentMethod }),
    ...(startDate || endDate ? {
      date: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    } : {}),
  };

  try {
    const rawData = await prisma.transaction.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { id: 'desc' }
      ],
      select: { id: true, date: true, type: true, description: true, category: true, amount: true, paymentMethod: true },
    }) as TransactionSummary[];

    const data = rawData.map(t => ({
      ...t,
      amount: t.amount.toNumber(),
    }));

    const total = data.length;

    const ingresosAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...where, type: TransactionType.Ingreso } });
    const gastosAgg = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { ...where, type: TransactionType.Gasto } });
    const balance = {
      ingresos: ingresosAgg._sum.amount?.toNumber() ?? 0,
      gastos: gastosAgg._sum.amount?.toNumber() ?? 0,
      neto: (ingresosAgg._sum.amount?.toNumber() ?? 0) - (gastosAgg._sum.amount?.toNumber() ?? 0)
    };

    // Response con caching (s-maxage=60 para edge cache en Vercel, revalida cada minuto)
    return NextResponse.json({
      data,
      metadata: { total, balance },
    }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate' } });
  } catch (error) {
    console.error('Error en API transaccionesExcel:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}