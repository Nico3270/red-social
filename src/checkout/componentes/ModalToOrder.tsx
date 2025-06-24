"use client";

import { FaCheckCircle, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { BsWhatsapp } from "react-icons/bs";

interface ModalToOrderProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: string;
}

export const ModalToOrder: React.FC<ModalToOrderProps> = ({
  isOpen,
  onClose,
  orderDetails,
}) => {
  const router = useRouter();
  const clearCart = useCartCatalogoStore((state) => state.clearCart); // Extraer clearCart del store

  if (!isOpen) return null;

  // Función para vaciar el carrito y cerrar modal
  const handleClose = () => {
    clearCart();  // Vaciar el carrito al cerrar el modal
    onClose();
    router.push("/");  // Redirigir al usuario a la página principal
  };

  // Función para confirmar la orden por WhatsApp
  const handleConfirmWhatsApp = () => {
    const whatsappURL = `https://wa.me/573182293083?text=${encodeURIComponent(orderDetails)}`;
    window.open(whatsappURL, "_blank");
    handleClose();  // Cierra el modal y vacía el carrito después de abrir WhatsApp
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaCheckCircle className="text-green-500" /> Orden Creada
          </h2>
          <button onClick={handleClose} className="text-red-500 hover:text-red-600">
            <FaTimes size={24} />
          </button>
        </div>
        <div className="p-6 text-left">
          <pre className="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap">
            {orderDetails}
          </pre>
        </div>
        <div className="p-4 flex justify-center">
          <button
            onClick={handleConfirmWhatsApp}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
          >
            <BsWhatsapp className="text-xl" /> Confirmar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
