import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { OrderState } from "@prisma/client";

interface OrderDetails {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  status: OrderState;
  type: string;
  TipoUsuario: string;
  category: string;
  description: string | null;
  totalAmount: number;
  paymentMethod: string | null;
  orderType: string; // Added orderType
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number;
    subtotal: number;
    productId: string | null;
    productVariantId: string | null;
    variantLabel: string | null;
  }[];
  datosDeEntrega: {
    id: string;
    country?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    clientName: string;
    clientPhone: string;
    deliveryAddress?: string | null;
    onSiteLocation?: string | null; // Added onSiteLocation
    deliveryDate: Date | null;
    additionalComments: string | null;
  } | null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  if (!session || !session.user.negocioId) {
    return NextResponse.json(
      { ok: false, message: "No autorizado: Debes tener un perfil de negocio" },
      { status: 401 }
    );
  }

  const orderId = id;
  const negocioId = session.user.negocioId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        datosDeEntrega: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, message: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (order.negocioId !== negocioId) {
      return NextResponse.json(
        { ok: false, message: "No autorizado: Esta orden no pertenece a tu negocio" },
        { status: 403 }
      );
    }

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
      orderType: order.orderType, // Include orderType
      items: order.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        productId: item.productId,
        productVariantId: item.productVariantId,
        variantLabel: item.variantLabel,
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
            onSiteLocation: order.datosDeEntrega.onSiteLocation, // Include onSiteLocation
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
}
