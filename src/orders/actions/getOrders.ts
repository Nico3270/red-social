import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import {  OrderState } from "@prisma/client";

export interface Orders {
  id: string;
  createdAt: Date;
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number; // Convertido a number
    subtotal: number; // Convertido a number
    orderId: string;
    productId: string | null;
    productVariantId: string | null;
    variantLabel: string | null;
  }[];
  description: string | null; // Ajustado para permitir null
  status: OrderState;
  totalAmount: number; // Convertido a number
}

interface ResponseOrders {
  ok: boolean;
  message: string;
  ordenes?: Orders[];
  total?: number; // Opcional: para paginación, total de órdenes
}

export const getOrdersByNegocio = async (
  page: number = 1,
  limit: number = 10
): Promise<ResponseOrders> => {
  const session = await auth();
  if (!session || !session.user.negocioId) {
    return {
      ok: false,
      message: "Debes tener un perfil de negocio para acceder a las órdenes",
    };
  }
  const negocioId = session.user.negocioId;

  try {
    // Contar total de órdenes para paginación
    const totalOrders = await prisma.order.count({
      where: { negocioId },
    });

    // Obtener órdenes con paginación
    const ordersNegocio = await prisma.order.findMany({
      where: { negocioId },
      select: {
        id: true,
        createdAt: true,
        description: true,
        status: true,
        items: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: (page - 1) * limit, // Paginación: saltar registros según página
    });

    // Convertir Decimal a number en totalAmount y en items (price, subtotal)
    const convertedOrders: Orders[] = ordersNegocio.map((order) => ({
      id: order.id,
      createdAt: order.createdAt,
      description: order.description,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        orderId: item.orderId,
        productId: item.productId,
        productVariantId: item.productVariantId,
        variantLabel: item.variantLabel,
      })),
    }));

    if (convertedOrders.length > 0) {
      return {
        ok: true,
        message: "Órdenes obtenidas exitosamente",
        ordenes: convertedOrders,
        total: totalOrders,
      };
    } else {
      return {
        ok: false,
        message: "No se encontraron órdenes para este negocio",
        total: 0,
      };
    }
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    return {
      ok: false,
      message: "Error al obtener las órdenes",
    };
  }
};
