import { getInformacionReserva } from "@/reservas/actions/getInfoNegocioWhatsapp";
import { ClientCancelModal } from "@/reservas/componentes/ClientCancelModal";
import Link from "next/link";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

function formatearFecha(fechaInput?: string | Date): string {
  if (!fechaInput) {
    return "La fecha no está disponible";
  }
  
  const fechaObj = new Date(fechaInput);

  // Usar Intl.DateTimeFormat con zona horaria específica (America/Bogota para Colombia, UTC-5)
  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  };

  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  };

  const fechaStr = fechaObj.toLocaleDateString("es-ES", optionsDate);
  const horaStr = fechaObj.toLocaleTimeString("es-ES", optionsTime);

  return `${fechaStr} a las ${horaStr}`;
}

export default async function EliminarReservaUsuarioPage({ params }: Props) {
  const { id } = await params;
  const infoReserva = await getInformacionReserva(id);
  // console.log(infoReserva);

  if (!infoReserva.ok) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reserva no encontrada</h1>
        <p className="text-gray-600 mb-6">La reserva ya ha sido eliminada o no existe.</p>
        <Link
          href="/"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const nombreCliente = infoReserva.nombre_cliente;
  const fecha_hora = formatearFecha(infoReserva.fecha_hora);

  return (
    <ClientCancelModal id={id} nombreCliente={nombreCliente || ""} fecha_hora={fecha_hora} negocioId={infoReserva.negocioId} telefonoCliente={infoReserva.telefono_cliente || ""} />
  );
}

// Componente cliente para manejar modales y animaciones
// Coloca esto en un archivo separado si lo prefieres, como components/ClientCancelModal.tsx
// Asegúrate de instalar framer-motion y react-hot-toast: npm install framer-motion react-hot-toast