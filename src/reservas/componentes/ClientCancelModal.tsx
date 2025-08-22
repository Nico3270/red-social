"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteReservaById } from "../actions/deleteReservaById";

interface ClientCancelModalProps {
  id: string;
  nombreCliente: string;
  fecha_hora: string;
  negocioId: string;
  telefonoCliente: string
}

export function ClientCancelModal({ id, nombreCliente, fecha_hora, telefonoCliente, negocioId }: ClientCancelModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(true);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsConfirmOpen(true);
  }, []);

  const handleCancel = () => {
    router.push("/");
  };

  console.log(negocioId, "Client");
  const idNegocio = negocioId
  console.log({idNegocio});

  

  const handleConfirm = async () => {
    setLoading(true);
    toast.loading("Cancelando reserva...", { duration: Infinity });
    const res = await deleteReservaById(id, nombreCliente, fecha_hora, negocioId, telefonoCliente);
    setLoading(false);
    toast.dismiss();
    setResult(res);
    setIsConfirmOpen(false);
  };

  useEffect(() => {
    if (result) {
      if (result.ok) {
        setIsConfirmationOpen(true);
      } else {
        setIsErrorOpen(true);
      }
    }
  }, [result]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <AnimatePresence>
        {isConfirmOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Hola, {nombreCliente}</h2>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de cancelar tu reserva para el {fecha_hora}?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancel}
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Cargando..." : "Aceptar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfirmationOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4"
          >
            <h2 className="text-2xl font-bold text-green-600 mb-4">¡Reserva cancelada!</h2>
            <p className="text-gray-600 mb-6">Tu reserva ha sido cancelada con éxito.</p>
            <div className="flex justify-end">
              <button
                onClick={() => router.push("/")}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isErrorOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4"
          >
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cancelar</h2>
            <p className="text-gray-600 mb-6">{result?.message || "Ocurrió un error inesperado."}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setIsErrorOpen(false)}
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}