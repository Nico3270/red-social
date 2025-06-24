"use client";

import React from "react";
import { FaCheckCircle, FaDollarSign, FaTimesCircle, FaBoxOpen, FaTools } from "react-icons/fa";
import { Order, StatusHistory } from "@/order/interfaces/types";

interface ShowInformationOrderProps {
    order: Order;
    statusHistory: StatusHistory[];
}

const stateColors: Record<string, string> = {
    RECIBIDA: "bg-blue-500 text-white",
    ENTREGADA: "bg-green-500 text-white",
    PAGADA: "bg-yellow-500 text-black",
    CANCELADA: "bg-red-500 text-white",
    PREPARACION: "bg-orange-500 text-white",
};

const stateIcons: Record<string, JSX.Element> = {
    RECIBIDA: <FaBoxOpen />,
    ENTREGADA: <FaCheckCircle />,
    PAGADA: <FaDollarSign />,
    CANCELADA: <FaTimesCircle />,
    PREPARACION: <FaTools />,
};

export const ShowInformationOrder: React.FC<ShowInformationOrderProps> = ({ order, statusHistory }) => {
    const totalPrice = order.items.reduce(
        (acc, item) => acc + (item.producto ? item.cantidad * item.producto.precio : 0),
        0
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {/* Información de la orden */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Información de la Orden</h2>
                <p>
                    <strong>ID:</strong> {order.id}
                </p>
                <p>
                    <strong>Estado:</strong>{" "}
                    <span
                        className={`flex items-center gap-2 px-2 py-1 rounded-md ${stateColors[order.estado]}`}
                    >
                        {stateIcons[order.estado]} <span>{order.estado}</span>
                    </span>
                </p>
                <br />

                <p>
                    <strong>Fecha de creación:</strong> {new Date(order.createdAt).toLocaleString("es-CO")}
                </p>
                <p>
                    <strong>Dirección:</strong> {order.datosDeEntrega?.deliveryAddress || "N/A"}
                </p>
                <p>
                    <strong>Remitente:</strong> {order.datosDeEntrega?.senderName || "N/A"}
                </p>
                <p>
                    <strong>Teléfono remitente:</strong> {order.datosDeEntrega?.senderPhone || "N/A"}
                </p>
                <p>
                    <strong>Destinatario:</strong> {order.datosDeEntrega?.recipientName || "N/A"}
                </p>
                <p>
                    <strong>Teléfono:</strong> {order.datosDeEntrega?.recipientPhone || "N/A"}
                </p>
                <p className="mt-4 font-bold">Productos:</p>
                <ul className="list-disc pl-6">
                    {order.items.map((item, index) =>
                        item.producto ? (
                            <li key={index}>
                                {item.cantidad} x {item.producto.nombre} (${item.producto.precio.toFixed(2)}){" "}
                                {item.comentario && <span className="italic">({item.comentario})</span>}
                            </li>
                        ) : (
                            <li key={index} className="italic text-gray-500">
                                Producto no disponible
                            </li>
                        )
                    )}
                </ul>
                <p className="mt-4 font-bold">
                    Total: <span className="text-lg">${totalPrice.toFixed(2)}</span>
                </p>
                <a
                    href={`/dashboard/updateOrder/${order.id}`}
                    className="block mt-6 bg-[#CA7373] text-white text-center py-2 rounded-lg hover:bg-blue-600"
                >
                    Modificar Orden
                </a>
            </div>

            {/* Historial de la orden */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Historial de la Orden</h2>
                <ul className="space-y-4">
                    {statusHistory.map((history, index) => (
                        <li key={index} className="flex items-center space-x-4">
                            <div className={`p-3 rounded-full ${stateColors[history.newState]} text-xl`}>
                                {stateIcons[history.newState]}
                            </div>
                            <div>
                                <p>
                                    <strong>{history.newState}</strong>{" "}
                                    <span className="text-sm text-gray-500">
                                        {new Date(history.createdAt).toLocaleString("es-CO")}
                                    </span>
                                </p>
                                {history.comment && <p className="italic text-gray-600">{history.comment}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
