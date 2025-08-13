"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { BsArrowUp, BsArrowDown } from "react-icons/bs";

interface TransactionDetail {
    date: string;
    amount: number;
    description: string;
    category: string; // Agregado desde la API
    paymentMethod: string; // Agregado desde la API
    type: string; // Agregado para indicar si es ingreso o gasto
    orderItems: Array<{
        id: string;
        description: string;
        quantity: number;
        price: number;
        subtotal: number;
        product?: { id: string; nombre: string; slug: string } | null;
    }> | null;
}

interface TransactionDetailModalProps {
    transactionId: string;
    isOpen: boolean;
    onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
    transactionId,
    isOpen,
    onClose,
}) => {
    const [data, setData] = useState<TransactionDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/resumenTransaccion/${transactionId}`);
            if (!response.ok) {
                throw new Error("Error al obtener la transacción");
            }
            let result;
            try {
                result = await response.json();
            } catch {
                const text = await response.text();
                throw new Error(`Respuesta no es JSON: ${text}`);
            }

            if (result.ok) {
                setData(result.data);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Error al cargar los detalles. Intenta nuevamente.");
            console.error("Error fetching transaction:", err);
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => {
        if (isOpen) {
            fetchTransaction();
        } else {
            setData(null); // Limpia data al cerrar
        }
    }, [isOpen, fetchTransaction]);

    const handleClose = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Botón de cerrar */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
                        aria-label="Cerrar modal"
                    >
                        <FaTimes size={20} />
                    </button>

                    <div className="p-6 max-h-[80vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 border-solid"></div>
                            </div>
                        ) : error ? (
                            <p className="text-red-600 text-center">{error}</p>
                        ) : data ? (
                            <>
                                <div className="flex items-center mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">Detalles de la Transacción</h2>
                                    {data.type && (
                                        <span className={`ml-4 flex items-center px-3 py-1 rounded-full text-white font-semibold ${data.type.toLowerCase() === 'ingreso' ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {data.type.toLowerCase() === 'ingreso' ? <BsArrowUp className="mr-1" /> : <BsArrowDown className="mr-1" />}
                                            {data.type.charAt(0).toUpperCase() + data.type.slice(1)}
                                        </span>
                                    )}
                                </div>

                                {/* Información general */}
                                <div className="space-y-2 mb-6">
                                    <p><strong>Fecha:</strong> {new Date(data.date).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })} a las {new Date(data.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                                    <p><strong>Medio de Pago:</strong> {data.paymentMethod}</p>
                                    <p><strong>Categoría:</strong> {data.category}</p>
                                    <p><strong>Descripción:</strong> {data.description}</p>
                                </div>

                                {/* Tabla de items si existen */}
                                {data.orderItems && data.orderItems.length > 0 ? (
                                    <div className="mb-6 overflow-x-auto">
                                        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                                            <thead className="bg-gray-800">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-100">Cantidad</th>
                                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-100">Descripción</th>
                                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-100">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.orderItems.map((item) => (
                                                    <tr key={item.id} className="border-t">
                                                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                                            ${Number(item.subtotal).toFixed(2)}
                                                        </td>

                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {/* Total */}
                                <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">Total: ${Number(data.amount).toFixed(2)}</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-600 text-center">No hay detalles disponibles.</p>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body // O usa un div con id="modal-root" si lo tienes
    );
};

export default TransactionDetailModal;