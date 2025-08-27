import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notifyReservaConfirmadaCliente } from "@/reservas/helpers/notifyReserva";
import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";
import { NextResponse } from "next/server";


type Params = { id: string };

export async function DELETE(req: Request, context: { params: Params }) {
  const params = await context.params; // 👈 forzar await

  const { id } = params;
  const session = await auth();
  if (!session || !session.user.negocioId) {
    return NextResponse.json(
      { ok: false, message: "No autorizado: Debes tener un perfil de negocio" },
      { status: 401 }
    );
  }


  const negocioId = session.user.negocioId;


  try {
    // Verificar existencia y propiedad en una query eficiente
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        negocioId: true,
        items: true,
        totalAmount: true,
        datosDeEntrega: true
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

    // Eliminar la orden
    await prisma.order.delete({
      where: { id },
    });


    const datosPedido = order.items
      .map((item) => `${item.quantity} - ${item.description}`)
      .join(", ");
    const valorCompra = `$${order.totalAmount.toFixed(2)}`;
    const nombreCliente = order.datosDeEntrega?.clientName || "";

    const notificacionUsuario = await notifyReservaConfirmadaCliente(
      {
        to: "+573182293083",
        template: PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO,
        datos_pedido: datosPedido,
        valor_compra: valorCompra,
        nombre_cliente: nombreCliente,
        negocioId: negocioId || "", // Incluye negocioId para contexto
      }
    )
    if (!notificacionUsuario.ok) {
      console.warn('Notificación WhatsApp fallida, pero reserva creada: error en plantilla pedido cancelado negocio usuario');
      // Opcional: Envía fallback por email o log a un servicio como Sentry para monitoreo pro
    }

    return NextResponse.json(
      { ok: true, message: "Orden eliminada exitosamente" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error al eliminar la orden:", error);
    if (error.code === "P2025") { // Prisma error para registro no encontrado (aunque ya chequeamos)
      return NextResponse.json(
        { ok: false, message: "Orden no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "Error al eliminar la orden" },
      { status: 500 }
    );
  }
};