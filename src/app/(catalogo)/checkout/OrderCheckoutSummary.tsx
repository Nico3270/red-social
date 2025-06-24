"use client";

import { useCartCatalogoStore } from "@/store/carro/carro-store";
import { Precio } from "@/seccion/componentes/Precio";
import { useEffect, useState } from "react";
import { useAddressStore } from "@/store/address/address-store";
import { createOrder } from "@/checkout/actions/createOrder";
import {
  BsWhatsapp,
  BsBoxSeam,
  BsPerson,
  BsHouse,
  BsCalendar3,
  BsClock,
  BsChatSquareDots,
  BsPencil,
  BsBalloon,
  BsGift,
} from "react-icons/bs";
import { useRouter } from "next/navigation";
import { ModalToOrder } from "@/checkout/componentes/ModalToOrder";
import { sendOrderEmail } from "@/checkout/actions/sendOrderEmail";

export default function OrderCheckoutSummary() {
  const router = useRouter();
  const cartItems = useCartCatalogoStore((state) => state.cart);
  const totalItems = useCartCatalogoStore((state) => state.getTotalItems());
  const totalPrice = useCartCatalogoStore((state) => state.getTotalPrice());
  const address = useAddressStore((state) => state.address);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || totalItems === 0) {
    return null;
  }

  const handleConfirmOrder = async () => {
    const details = cartItems
      .map(
        (item) =>
          `${item.cantidad} x ${item.nombre}${item.comentario ? ` (Comentario: ${item.comentario})` : ""}`
      )
      .join("\n");

    const message = `📦 Resumen de Pedido\n${details}\n` +
      `🔢 Total de Artículos: ${totalItems}\n` +
      `💰 Total a Pagar: $${totalPrice}\n` +
      `📍 Datos de Entrega:\n` +
      `👤 Remitente: ${address.senderName} (${address.senderPhone})\n` +
      `🎁 Destinatario: ${address.recipientName || "N/A"} (${address.recipientPhone})\n` +
      `📍 Dirección: ${address.deliveryAddress}\n` +
      `🎉 Ocasión: ${address.occasion || "N/A"}\n` +
      `✍️ Dedicatoria: ${address.dedicationMessage || "N/A"}\n` +
      `📅 Fecha de Entrega: ${address.deliveryDate || "N/A"}\n` +
      `⏰ Hora de Entrega: ${address.deliveryTime || "N/A"}\n` +
      `💬 Comentarios: ${address.additionalComments || "N/A"}\n` +
      `Gracias por tu compra!`;

    const response = await createOrder({
      cartItems: cartItems.map((item) => ({
        productId: item.id,
        cantidad: item.cantidad,
        precio: item.precio,
        comentario: item.comentario,
      })),
      address,
    });

    if (response.success) {
      setOrderDetails(message);
      setIsModalOpen(true);

      // Llamar a la action para enviar el correo
      await sendOrderEmail({ orderDetails: message });
     
    } else {
      alert("Hubo un problema al procesar tu orden. Por favor, intenta nuevamente.");
    }
  };

  return (
    <div className="border rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Información del Pedido</h2>
      <div className="space-y-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BsBoxSeam className="text-red-500" /> Datos de Entrega
        </h3>

        {/* Remitente */}
        <p className="flex items-center gap-2">
          <BsPerson className="text-blue-500" />
          <strong>Remitente:</strong> {address.senderName} ({address.senderPhone})
        </p>

        {/* Destinatario */}
        <p className="flex items-center gap-2">
          <BsGift className="text-pink-500" />
          <strong>Destinatario:</strong> {address.recipientName || "N/A"} ({address.recipientPhone})
        </p>

        {/* Dirección */}
        <p className="flex items-center gap-2">
          <BsHouse className="text-yellow-500" />
          <strong>Dirección:</strong> {address.deliveryAddress}
        </p>

        {/* Ocasión */}
        <p className="flex items-center gap-2">
          <BsBalloon className="text-pink-400" />
          <strong>Ocasión:</strong> {address.occasion || "N/A"}
        </p>

        {/* Dedicatoria */}
        <p className="flex items-center gap-2">
          <BsPencil className="text-orange-400" />
          <strong>Dedicatoria:</strong> {address.dedicationMessage || "N/A"}
        </p>

        {/* Fecha de entrega */}
        <p className="flex items-center gap-2">
          <BsCalendar3 className="text-green-500" />
          <strong>Fecha de Entrega:</strong> {address.deliveryDate || "N/A"}
        </p>

        {/* Hora de entrega */}
        <p className="flex items-center gap-2">
          <BsClock className="text-purple-500" />
          <strong>Hora de Entrega:</strong> {address.deliveryTime || "N/A"}
        </p>

        {/* Comentarios adicionales */}
        <p className="flex items-center gap-2">
          <BsChatSquareDots className="text-gray-500" />
          <strong>Comentarios:</strong> {address.additionalComments || "N/A"}
        </p>
      </div>

      <div>
        <h3 className="text-lg font-bold">Resumen de Orden</h3>
        {cartItems.map((product) => (
          <p key={product.cartItemId}>
            <span className="font-bold">{product.cantidad} - </span>
            {product.nombre}
          </p>
        ))}
        <p className="font-bold text-red-600 text-lg flex items-center">
          Total a pagar: <Precio value={totalPrice} />
        </p>
        <button
          className="mt-4 px-6 py-2 flex items-center justify-center gap-2 rounded-lg text-white font-bold w-full bg-green-500 hover:bg-green-600 transition"
          onClick={handleConfirmOrder}
        >
          <BsWhatsapp className="text-xl" /> Confirmar Pedido en WhatsApp
        </button>
      </div>

      {isModalOpen && (
        <ModalToOrder
          isOpen={isModalOpen}
          orderDetails={orderDetails}
          onClose={() => {
            setIsModalOpen(false);
            router.push("/");
          }}
        />
      )}
    </div>
  );
}
