import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { OrderState } from "@prisma/client";

interface OrderDetails {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  status: OrderState;
  type: string; // TransactionType
  TipoUsuario: string; // TipoUsuario
  category: string;
  description: string | null;
  totalAmount: number; // Convertido a number
  paymentMethod: string | null; // PaymentMethod
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number; // Convertido a number
    subtotal: number; // Convertido a number
    productId: string | null;
  }[];
  datosDeEntrega: {
    id: string;
    country: string;
    departamento: string;
    ciudad: string;
    clientName: string;
    clientPhone: string;
    deliveryAddress: string;
    deliveryDate: Date | null;
    additionalComments: string | null;
  } | null;
  // Otros campos si son necesarios, e.g., statusHistory, etc.
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params;
  const session = await auth();
  if (!session || !session.user.negocioId) {
    return NextResponse.json(
      { ok: false, message: "No autorizado: Debes tener un perfil de negocio" },
      { status: 401 }
    );
  }

  const orderId = params.id;
  const negocioId = session.user.negocioId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        datosDeEntrega: true,
        // Incluir más relaciones si es necesario, e.g., statusHistory: true
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, message: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que la orden pertenece al negocio del usuario
    if (order.negocioId !== negocioId) {
      return NextResponse.json(
        { ok: false, message: "No autorizado: Esta orden no pertenece a tu negocio" },
        { status: 403 }
      );
    }

    // Convertir Decimal a number
    const convertedOrder: OrderDetails = {
      id: order.id,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      date: order.date,
      status: order.status,
      type: order.type,
      TipoUsuario: order.TipoUsuario,
      category: order.category,
      description: order.description,
      totalAmount: Number(order.totalAmount),
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        productId: item.productId,
      })),
      datosDeEntrega: order.datosDeEntrega
        ? {
            id: order.datosDeEntrega.id,
            country: order.datosDeEntrega.country,
            departamento: order.datosDeEntrega.departamento,
            ciudad: order.datosDeEntrega.ciudad,
            clientName: order.datosDeEntrega.clientName,
            clientPhone: order.datosDeEntrega.clientPhone,
            deliveryAddress: order.datosDeEntrega.deliveryAddress,
            deliveryDate: order.datosDeEntrega.deliveryDate,
            additionalComments: order.datosDeEntrega.additionalComments,
          }
        : null,
    };

    return NextResponse.json({
      ok: true,
      message: "Orden obtenida exitosamente",
      order: convertedOrder,
    });
  } catch (error) {
    console.error("Error al obtener la orden:", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener la orden" },
      { status: 500 }
    );
  }
};