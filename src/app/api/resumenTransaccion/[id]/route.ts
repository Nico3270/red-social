// app/api/resumenTransaccion/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Asegúrate de que esta sea la ruta correcta a tu cliente Prisma
import { auth } from '@/auth.config'; // Asegúrate de que esta sea la ruta correcta a tu config de auth

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { id } = params;
  // console.log(`[API] Recibiendo request para ID: ${id}`); // Log inicial

  // Validar ID
  if (!id || typeof id !== 'string') {
    // console.log(`[API] Error: ID inválido - ${id}`);
    return NextResponse.json({ ok: false, message: 'ID de transacción inválido' }, { status: 400 });
  }

  // Obtener sesión
  const session = await auth();
  if (!session || !session.user?.id) {
    // console.log(`[API] Error: Usuario no autenticado - Session: ${JSON.stringify(session)}`);
    return NextResponse.json({ ok: false, message: 'Usuario no autenticado' }, { status: 401 });
  }
  const usuarioId = session.user.id;
  console.log(`[API] Usuario autenticado: ${usuarioId}`);

  try {
    console.log(`[API] Buscando transacción con ID: ${id}`);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, nombre: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      // console.log(`[API] Error: Transacción no encontrada para ID: ${id}`);
      return NextResponse.json({ ok: false, message: 'Transacción no encontrada' }, { status: 404 });
    }
    // console.log(`[API] Transacción encontrada: ${transaction.id}, Owner: ${transaction.usuarioId}`);

    // Verificar permiso
    if (transaction.usuarioId !== usuarioId) {
      // console.log(`[API] Error: Permiso denegado - Usuario: ${usuarioId}, Owner: ${transaction.usuarioId}`);
      return NextResponse.json({ ok: false, message: 'No tienes permiso para acceder a esta transacción' }, { status: 403 });
    }

    // Preparar respuesta
    const responseData = {
      date: transaction.date,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      paymentMethod: transaction.paymentMethod,
      type: transaction.type,  // ¡Agrega esto!
      orderItems: transaction.order?.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        product: item.product
          ? { id: item.product.id, nombre: item.product.nombre, slug: item.product.slug }
          : null,
      })) || null,
    };
    // console.log(`[API] Respuesta preparada exitosamente para ID: ${id}`);

    return NextResponse.json({ ok: true, message: 'Transacción encontrada', data: responseData }, { status: 200 });
  } catch (error) {
    console.error(`[API] Error interno al procesar ID: ${id} - Detalles:`, error);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}