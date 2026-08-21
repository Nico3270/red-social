"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaEdit, FaChevronDown, FaTimes, FaSpinner } from "react-icons/fa";
import { ReservationDayData } from "@/app/api/reservasConfig/route"; // Ajusta la ruta según tu estructura
import { changeStatusReservations } from "../actions/reservasActions";
import { EditReservationSlotSelector } from "./EditReservationSlotSelector"; // Importa el nuevo componente (ajusta ruta si es necesario)

interface ResumeReservationsProps {
  slotTime: string;
  reservas: ReservationDayData[];
  negocioId: string; // Requerida para server actions
  onClose: () => void;
  onSuccess?: () => void; // Nueva prop para refrescar padre después de éxito (similar a AddReservationModal)
}

const statusOptions: ReservationDayData["estado"][] = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];

const statusDisplayMap: Record<ReservationDayData["estado"], string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
  BLOQUEADA: "Bloqueada",
};

const isCancellableStatus = (status: ReservationDayData["estado"]) =>
  status === "PENDIENTE" || status === "CONFIRMADA";

const ResumeReservations: React.FC<ResumeReservationsProps> = ({
  slotTime,
  reservas: initialReservas, // Renombrado para claridad (usamos local state para optimistic)
  negocioId,
  onClose,
  onSuccess = () => {},
}) => {
  const [localReservas, setLocalReservas] = useState<ReservationDayData[]>(initialReservas); // State local para optimistic updates
  const [openStatusMenus, setOpenStatusMenus] = useState<Record<string, boolean>>({});
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmChange, setConfirmChange] = useState<{ reservaId: string; newStatus: ReservationDayData["estado"] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<{ message: string; isError: boolean } | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estados nuevos para manejar el modal de edición de slot
  const [showEditSlotModal, setShowEditSlotModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState<ReservationDayData | null>(null);

  // Sync local con props iniciales si cambian (e.g., refresco externo)
  useEffect(() => {
    setLocalReservas(initialReservas);
  }, [initialReservas]);

  // Cerrar dropdowns al clickear fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(openStatusMenus).forEach((id) => {
        if (openStatusMenus[id] && menuRefs.current[id] && !menuRefs.current[id]?.contains(event.target as Node)) {
          setOpenStatusMenus((prev) => ({ ...prev, [id]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openStatusMenus]);

  const toggleStatusMenu = (reservaId: string) => {
    setOpenStatusMenus((prev) => ({ ...prev, [reservaId]: !prev[reservaId] }));
  };

  const handleCancel = (reservaId: string) => {
    setConfirmCancelId(reservaId);
    setResponseMessage(null);
  };

  const confirmCancel = async () => {
    if (!confirmCancelId) return;

    // Optimistic update: conservar historial y reflejar el estado terminal.
    setLocalReservas((prev) =>
      prev.map((r) =>
        r.id === confirmCancelId ? { ...r, estado: "CANCELADA" } : r,
      ),
    );

    setLoading(true);
    const res = await changeStatusReservations({
      negocioId,
      reservaId: confirmCancelId,
      nuevoStatus: "CANCELADA",
    });
    setLoading(false);
    setResponseMessage({ message: res.message, isError: !res.ok });

    if (res.ok) {
      onSuccess(); // Notifica al padre para refrescar global (sync DB)
      setConfirmCancelId(null);
      // Cierre automático con delay para ver mensaje
      setTimeout(() => {
        onClose();
      }, 1500); // 1.5 segundos para leer el mensaje de éxito
    } else {
      // Revertir optimistic si falla
      setLocalReservas(initialReservas); // O usa prev state si guardas
    }
  };

  const handleSelectStatus = (reservaId: string, newStatus: ReservationDayData["estado"]) => {
    toggleStatusMenu(reservaId);
    setConfirmChange({ reservaId, newStatus });
    setResponseMessage(null);
  };

  const confirmChangeStatus = async () => {
    if (!confirmChange) return;

    // Optimistic update: Actualizar status localmente primero
    setLocalReservas((prev) =>
      prev.map((r) => (r.id === confirmChange.reservaId ? { ...r, estado: confirmChange.newStatus } : r))
    );

    setLoading(true);
    const res = await changeStatusReservations({ negocioId, reservaId: confirmChange.reservaId, nuevoStatus: confirmChange.newStatus });
    setLoading(false);
    setResponseMessage({ message: res.message, isError: !res.ok });

    if (res.ok) {
      // console.log("Cambio de estado exitoso, llamando onSuccess y cerrando modal en 1.5s");
      onSuccess(); // Notifica al padre para refrescar global
      setConfirmChange(null);
      // Cierre automático con delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      // Revertir optimistic si falla
      setLocalReservas(initialReservas);
    }
  };

  // Guard para estado actual seguro
  const getCurrentStatus = (reservaId: string): ReservationDayData["estado"] => {
    const reserva = localReservas.find((r) => r.id === reservaId); // Usa local para optimistic
    return reserva?.estado || "PENDIENTE";
  };

  // Función para abrir el modal de selección de slot al editar
  const handleEdit = (reserva: ReservationDayData) => {
    setSelectedReserva(reserva);
    setShowEditSlotModal(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 overflow-y-auto max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Reservas para {slotTime}
          </h2>
          {localReservas.length === 0 ? (
            <p className="text-center text-gray-500">No hay reservas en este intervalo.</p>
          ) : (
            <div className="space-y-4">
              {localReservas.map((reserva, index) => {
                const filteredOptions = isCancellableStatus(reserva.estado)
                  ? statusOptions.filter((status) => status !== reserva.estado)
                  : [];
                return (
                  <div
                    key={reserva.id}
                    className={`p-4 bg-gray-50 rounded-lg shadow-sm ${
                      index < localReservas.length - 1 ? "border-b border-gray-200" : ""
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-800">{reserva.nombre}</h3>
                        <p className="text-sm text-gray-600">Teléfono: {reserva.telefono}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Notas: {reserva.notas || "Sin notas adicionales"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Estado actual: {statusDisplayMap[reserva.estado]}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                        <button
                          onClick={() => handleEdit(reserva)} // Abre el modal de selección de slot
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                          aria-label="Editar reserva"
                        >
                          <FaEdit />
                        </button>
                        {isCancellableStatus(reserva.estado) && (
                          <button
                            onClick={() => handleCancel(reserva.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                            aria-label="Cancelar reserva"
                            title="Cancelar reserva"
                          >
                            <FaTimes />
                          </button>
                        )}
                        {filteredOptions.length > 0 && (
                          <div className="relative" ref={(el) => { menuRefs.current[reserva.id] = el; }}>
                            <button
                              onClick={() => toggleStatusMenu(reserva.id)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1"
                              aria-label="Cambiar estado"
                            >
                              <FaChevronDown size={12} />
                            </button>
                            {openStatusMenus[reserva.id] && (
                              <motion.ul
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                              >
                                {filteredOptions.map((status) => (
                                  <li key={status}>
                                    <button
                                      onClick={() => handleSelectStatus(reserva.id, status)}
                                      className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      {statusDisplayMap[status]}
                                    </button>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sub-modal de confirmación para cancelar */}
          {confirmCancelId && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
              <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">¿Estás seguro de cancelar esta reserva?</h3>
                {loading ? (
                  <div className="flex justify-center items-center">
                    <FaSpinner className="animate-spin text-blue-600" size={24} />
                  </div>
                ) : responseMessage ? (
                  <div className={`p-4 rounded-md ${responseMessage.isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {responseMessage.message}
                    <button
                      onClick={() => {
                        setResponseMessage(null);
                        setConfirmCancelId(null);
                      }}
                      className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setConfirmCancelId(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={confirmCancel}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Confirmar cancelación
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-modal de confirmación para cambiar status */}
          {confirmChange && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
              <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 text-center">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  ¿Estás seguro de cambiar el estado de{" "}
                  {statusDisplayMap[getCurrentStatus(confirmChange.reservaId)]} a{" "}
                  {statusDisplayMap[confirmChange.newStatus]}?
                </h3>
                {loading ? (
                  <div className="flex justify-center items-center">
                    <FaSpinner className="animate-spin text-blue-600" size={24} />
                  </div>
                ) : responseMessage ? (
                  <div className={`p-4 rounded-md ${responseMessage.isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {responseMessage.message}
                    <button
                      onClick={() => {
                        setResponseMessage(null);
                        setConfirmChange(null);
                      }}
                      className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setConfirmChange(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmChangeStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Integración del modal EditReservationSlotSelector */}
          {showEditSlotModal && selectedReserva && (
            <EditReservationSlotSelector
              reservaData={selectedReserva as ReservationDayData} // Cast para compatibilidad de tipos
              negocioId={negocioId}
              onClose={() => setShowEditSlotModal(false)}
              onSuccess={() => {
                // console.log("Edición exitosa desde EditReservationSlotSelector, llamando onSuccess y cerrando ResumeReservations en 1.5s");
                onSuccess(); // Refresca dashboard
                // Cierre automático con delay
                setTimeout(() => {
                  onClose(); // Cierra ResumeReservations
                }, 1500);
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResumeReservations;
