import { getOrdersByNegocio } from "@/orders/actions/getOrders";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  try {
    const result = await getOrdersByNegocio(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en la API de órdenes:", error);
    return NextResponse.json(
      { ok: false, message: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}