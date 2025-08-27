"use server"

import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';


type Params = {id: string}
export async function GET(
  request: Request,
  context: { params: Promise<Params> }
) {
  const { id: orderId } = await context.params;


  const session = await auth();

  if (!session || !session.user.negocioId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = session.user.negocioId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                imagenes: true,
                secciones: true,
              },
            },
          },
        },
        datosDeEntrega: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.negocioId !== negocioId) {
      return NextResponse.json({ error: 'No autorizado para ver esta orden' }, { status: 403 });
    }

    // Mapear productos desde items (OrderItem[])
    const products = order.items.map((item) => {
      const product = item.product;
      return {
        id: item.productId || '', // Si no hay productId, vacío
        slug: product?.slug || '',
        nombre: item.description, // Usar description del item como snapshot
        precio: Number(item.price), // Convertir Decimal a number
        cantidad: item.quantity,
        imagen: product?.imagenes[0]?.url || '',
        seccionIds: product?.secciones.map((sec) => sec.sectionId) || [],
        descripcionCorta: product?.descripcionCorta || '',
      };
    });

    // Mapear address desde datosDeEntrega
    const address = {
      country: order.datosDeEntrega?.country || 'Colombia',
      departamento: order.datosDeEntrega?.departamento || '',
      ciudad: order.datosDeEntrega?.ciudad || '',
      clientName: order.datosDeEntrega?.clientName || '',
      clientPhone: order.datosDeEntrega?.clientPhone || '',
      deliveryAddress: order.datosDeEntrega?.deliveryAddress || '',
      deliveryDate: order.datosDeEntrega?.deliveryDate?.toISOString().substring(0, 10) || '',
      additionalComments: order.datosDeEntrega?.additionalComments || '',
    };

    return NextResponse.json({ products, address });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}