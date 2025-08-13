// app/api/eliminarTransaccion/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Asegúrate de que esta sea la ruta correcta a tu cliente Prisma
import { auth } from '@/auth.config'; // Asegúrate de que esta sea la ruta correcta a tu config de auth

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { id } = params;
  console.log(`[API] Recibiendo request DELETE para ID: ${id}`); // Log inicial

  // Validar ID
  if (!id || typeof id !== 'string') {
    console.log(`[API] Error: ID inválido - ${id}`);
    return NextResponse.json({ ok: false, message: 'ID de transacción inválido' }, { status: 400 });
  }

  // Obtener sesión
  const session = await auth();
  if (!session || !session.user?.id) {
    console.log(`[API] Error: Usuario no autenticado - Session: ${JSON.stringify(session)}`);
    return NextResponse.json({ ok: false, message: 'Usuario no autenticado' }, { status: 401 });
  }
  const usuarioId = session.user.id;
  console.log(`[API] Usuario autenticado: ${usuarioId}`);

  try {
    console.log(`[API] Buscando transacción con ID: ${id}`);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      console.log(`[API] Error: Transacción no encontrada para ID: ${id}`);
      return NextResponse.json({ ok: false, message: 'Transacción no encontrada' }, { status: 404 });
    }
    console.log(`[API] Transacción encontrada: ${transaction.id}, Owner: ${transaction.usuarioId}`);

    // Verificar permiso
    if (transaction.usuarioId !== usuarioId) {
      console.log(`[API] Error: Permiso denegado - Usuario: ${usuarioId}, Owner: ${transaction.usuarioId}`);
      return NextResponse.json({ ok: false, message: 'No tienes permiso para eliminar esta transacción' }, { status: 403 });
    }

    // Eliminar la transacción
    await prisma.transaction.delete({
      where: { id },
    });
    console.log(`[API] Transacción eliminada exitosamente para ID: ${id}`);

    return NextResponse.json({ ok: true, message: 'Transacción eliminada' }, { status: 200 });
  } catch (error) {
    console.error(`[API] Error interno al procesar ID: ${id} - Detalles:`, error);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}