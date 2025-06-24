"use server";

import prisma from "@/lib/prisma";
import { OrderState } from "@prisma/client";



export const getOrders = async (page: number = 1, ordersPerPage: number = 12) => {
  try {
    // Contar el número total de órdenes
    const totalOrders = await prisma.order.count();

    // Obtener las órdenes con los detalles necesarios
    const orders = await prisma.order.findMany({
      skip: (page - 1) * ordersPerPage,
      take: ordersPerPage,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            producto: true, // Relación con el producto
          },
        },
        datosDeEntrega: true, // Relación con los datos de entrega
      },
    });

    // Formatear las órdenes para evitar problemas con valores null y formatos de fecha
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      estado: order.estado as OrderState,
      createdAt: order.createdAt.toISOString(),
      datosDeEntrega: order.datosDeEntrega
        ? {
            deliveryAddress: order.datosDeEntrega.deliveryAddress,
            senderName: order.datosDeEntrega.senderName,
            recipientName: order.datosDeEntrega.recipientName || "N/A",
            recipientPhone: order.datosDeEntrega.recipientPhone,
            additionalComments: order.datosDeEntrega.additionalComments || null,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
        comentario: item.comentario || null,
        orderId: item.orderId,
        producto: item.producto
          ? {
              id: item.producto.id,
              createdAt: item.producto.createdAt.toISOString(),
              updatedAt: item.producto.updatedAt.toISOString(),
              precio: item.producto.precio,
              nombre: item.producto.nombre,
              descripcion: item.producto.descripcion,
              descripcionCorta: item.producto.descripcionCorta || null,
              slug: item.producto.slug,
              prioridad: item.producto.prioridad || null,
              status: item.producto.status,
              tags: item.producto.tags,
            }
          : null, // Si no hay producto, devuelve null
      })),
    }));

    // Retornar los datos formateados
    return {
      orders: formattedOrders,
      totalOrders,
      ordersPerPage,
    };
  } catch (error) {
    console.error("Error al obtener órdenes:", error);
    return {
      orders: [],
      totalOrders: 0,
      ordersPerPage,
    };
  }
};
