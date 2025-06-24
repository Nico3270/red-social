import { UpdateOrder } from "@/order/componentes/UpdateOrder";
import { getInformationByIdUpdateOrder } from "@/orders/actions/getInformationByIdUpdateOrder";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
interface Props {
  params: Promise<{
    id: string; // El ID de la orden
  }>
}

export default async function UpdateOrderPage({ params }: Props) {
  const {id} = await  params;

  if (!id) {
    return (
      <div className="text-center text-red-500">
        <h1>Error</h1>
        <p>No se proporcionó un ID válido.</p>
      </div>
    );
  }

  const result = await getInformationByIdUpdateOrder(id);

  if (!result.success) {
    return (
      <div className="text-center text-red-500">
        <h1>Error</h1>
        <p>{result.error || "No se pudo cargar la información de la orden."}</p>
      </div>
    );
  }

  // Garantiza que `orderId` siempre sea una cadena
  const orderId = result.orderId ?? ""; // Si está undefined, será una cadena vacía
  const existingProducts = result.existingProducts ?? [];
  const catalogProducts = result.catalog ?? [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Modificar Orden </h1>
      <UpdateOrder
        orderId={orderId} // Siempre será una cadena
        existingProducts={existingProducts}
        catalogProducts={catalogProducts}
      />
    </div>
  );
}
