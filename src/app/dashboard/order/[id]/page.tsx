
import { titulosPrincipales } from "@/config/fonts";
import { getOrderById } from "@/order/actions/getOrderById";
import { ShowInformationOrder } from "@/order/componentes/ShowInformationOrder";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
interface Props {
  params: Promise<{id:string}>
}

export default async function OrderPage({ params }: Props) {
  // Asegúrate de esperar los params usando `await` 
  const { id } = await params;

  if (!id) {
    return (
      <div className="text-center text-red-500">
        <h1>Error</h1>
        <p>No se proporcionó un ID válido.</p>
      </div>
    );
  }

  const result = await getOrderById(id);

  if (!result.success || !result.order || !result.statusHistory) {
    return (
      <div className="text-center text-red-500">
        <h1>Error</h1>
        <p>{result.error || "No se pudo cargar la información de la orden."}</p>
      </div>
    );
  }

  const order = result.order;
  const statusHistory = result.statusHistory;

  return (
    <div className="container mx-auto p-4">
      <h1
        className={`text-3xl font-bold text-center mb-2 mt-2 ${titulosPrincipales.className} text-[#D91656]`}
      >
        Detalle de la Orden
      </h1>
      <ShowInformationOrder order={order} statusHistory={statusHistory} />
    </div>
  );
}
