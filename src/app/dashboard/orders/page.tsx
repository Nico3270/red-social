import { getOrders } from "@/orders/actions/getOrderss";
import { ShowOrders } from "@/orders/componentes/ShowOrders";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

export default async function OrdersPage() {
  const { orders, totalOrders, ordersPerPage } = await getOrders();
  
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Panel de Órdenes</h1>
      <ShowOrders orders={orders} totalOrders={totalOrders} ordersPerPage={ordersPerPage} />
    </div>
  );
}
