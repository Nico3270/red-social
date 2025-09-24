"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { OrderState } from "@prisma/client";

interface OrderData {
  products: {
    id: string;
    slug: string;
    nombre: string;
    precio: number;
    cantidad: number;
    imagen: string;
    seccionIds: string[];
    descripcionCorta: string;
  }[];
  address: {
    orderType: string;
    country?: string | null;
    departamento?: string | null;
    ciudad?: string | null;
    clientName: string;
    clientPhone: string;
    deliveryAddress?: string | null;
    onSiteLocation?: string | null;
    deliveryDate?: string | null;
    additionalComments?: string | null;
  };
  status: OrderState;
}

type Params = { id: string };

export async function GET(request: Request, context: { params: Promise<Params> }) {
  const { id: orderId } = await context.params;

  const session = await auth();
  if (!session || !session.user.negocioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.negocioId !== negocioId) {
      return NextResponse.json({ error: "No autorizado para ver esta orden" }, { status: 403 });
    }

    // Mapear productos desde items (OrderItem[])
    const products = order.items.map((item) => {
      const product = item.product;
      return {
        id: item.productId || "",
        slug: product?.slug || "",
        nombre: item.description,
        precio: Number(item.price),
        cantidad: item.quantity,
        imagen: product?.imagenes[0]?.url || "",
        seccionIds: product?.secciones.map((sec) => sec.sectionId) || [],
        descripcionCorta: product?.descripcionCorta || "",
      };
    });

    // Mapear address desde datosDeEntrega
    const address = {
      orderType: order.orderType,
      country: order.datosDeEntrega?.country || null,
      departamento: order.datosDeEntrega?.departamento || null,
      ciudad: order.datosDeEntrega?.ciudad || null,
      clientName: order.datosDeEntrega?.clientName || "",
      clientPhone: order.datosDeEntrega?.clientPhone || "",
      deliveryAddress: order.datosDeEntrega?.deliveryAddress || null,
      onSiteLocation: order.datosDeEntrega?.onSiteLocation || null,
      deliveryDate: order.datosDeEntrega?.deliveryDate?.toISOString().substring(0, 10) || null,
      additionalComments: order.datosDeEntrega?.additionalComments || null,
    };

    const response: OrderData = {
      products,
      address,
      status: order.status,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}