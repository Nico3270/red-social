"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, parse, startOfDay, addMinutes, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FaArrowLeft, FaArrowRight, FaTimes, FaCalendarAlt, FaCheck, FaClock } from "react-icons/fa"; // Agregué FaClock para original
import { motion } from "framer-motion";

import { ReservationDayData, ReservationsResponse } from "@/app/api/reservasConfig/route";
import AddReservationModal, { ReservationFormData } from "./AddReservationModal"; // Importa también el tipo ReservationFormData
import { useReservationsConfigStore } from "@/store/reservasConfig/reseervas-config-store";

// Extensión para estado (como en ReservasDashboard)
interface ExtendedReservationDayData extends ReservationDayData {
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'BLOQUEADA';
}

interface EditReservationSlotSelectorProps {
  reservaData: ExtendedReservationDayData; // Reserva actual a editar
  negocioId: string;
  onClose: () => void;
  onSuccess?: () => void; // Callback post-éxito en AddReservationModal
}

export const EditReservationSlotSelector = ({ reservaData, negocioId, onClose, onSuccess }: EditReservationSlotSelectorProps) => {
  const { initialconfig, fetchConfig } = useReservationsConfigStore();
  const [currentDate, setCurrentDate] = useState(startOfDay(parseISO(reservaData.fechaHoraInicio))); // Fecha inicial de reserva
  const [reservas, setReservas] = useState<ExtendedReservationDayData[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState(format(parseISO(reservaData.fechaHoraInicio), "HH:mm")); // Slot inicial
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false); // Controla apertura de AddReservationModal

  // Fetch config si vacío
  useEffect(() => {
    if (!initialconfig) {
      fetchConfig();
    }
  }, [fetchConfig, initialconfig]);

  // Generar slots basados en config (igual a ReservasDashboard)
  useEffect(() => {
    if (initialconfig) {
      const generateSlots = () => {
        const newSlots: string[] = [];
        const intervalo = initialconfig.intervaloMinutos;

        const addSlotsInRange = (inicio?: string, fin?: string) => {
          if (!inicio || !fin) return;
          let current = parse(inicio, "HH:mm", new Date());
          const end = parse(fin, "HH:mm", new Date());
          while (current < end) {
            newSlots.push(format(current, "HH:mm"));
            current = addMinutes(current, intervalo);
          }
        };

        addSlotsInRange(initialconfig.franjaMananaInicio, initialconfig.franjaMananaFin);
        addSlotsInRange(initialconfig.franjaTardeInicio, initialconfig.franjaTardeFin);
        setSlots(newSlots);
      };
      generateSlots();
    }
  }, [initialconfig]);

  // Fetch reservas para currentDate (igual a ReservasDashboard)
  const fetchReservas = useCallback(async () => {
  setLoading(true);
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const res = await fetch(`/api/reservasConfig?date=${dateStr}`);
  const data: ReservationsResponse = await res.json();
  setLoading(false);
  if (data.ok) {
    setReservas(data.reservas as ExtendedReservationDayData[]);
  } else {
    console.error(data.message);
    setReservas([]);
  }
}, [currentDate]);

  useEffect(() => {
  if (initialconfig) {
    const dayName = format(currentDate, "EEEE", { locale: es });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const isAttendingDay = initialconfig.diasAtencion.includes(capitalizedDay);
    if (isAttendingDay) {
      fetchReservas();
    } else {
      setReservas([]);
      setLoading(false);
    }
  }
}, [currentDate, initialconfig, fetchReservas]);

  // Navegación fecha
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Map reservas a slots
  const getReservasForSlot = (slotTime: string) => {
    const slotStart = parse(slotTime, "HH:mm", currentDate);
    const slotEnd = addMinutes(slotStart, initialconfig?.intervaloMinutos || 30);
    return reservas.filter(res => {
      const resStart = new Date(res.fechaHoraInicio);
      return resStart >= slotStart && resStart < slotEnd;
    });
  };

  // Seleccionar slot con confirm si excede capacidad
  const handleSelectSlot = (slot: string) => {
    const slotReservas = getReservasForSlot(slot);
    const maxCapacidad = initialconfig?.capacidadPorIntervalo || 1;
    const nonBlockedReservas = slotReservas.filter(res => res.estado !== "BLOQUEADA");
    if (nonBlockedReservas.length >= maxCapacidad) {
      setConfirmSlot(slot);
      setShowConfirmModal(true);
      return;
    }
    setSelectedSlot(slot);
  };

  // Confirmar y seleccionar slot excedido
  const confirmAndSelect = () => {
    setShowConfirmModal(false);
    if (confirmSlot) {
      setSelectedSlot(confirmSlot);
    }
  };

  // Continuar: Abrir AddReservationModal con nuevo horario (mapeo corregido)
  const handleContinue = () => {
    setShowAddModal(true); // Abre AddReservationModal
  };

  // Computar si día de atención
  const dayName = format(currentDate, "EEEE", { locale: es });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const isAttendingDay = initialconfig?.diasAtencion?.includes(capitalizedDay) ?? true;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden p-6 max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Cerrar modal"
          >
            <FaTimes size={20} />
          </button>
          <h2 className="text-xl font-bold mb-4">Seleccionar Nuevo Horario para Reserva</h2>

          {/* Navegación Fecha */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevDay} className="p-2 text-blue-600 hover:text-blue-800">
              <FaArrowLeft size={20} />
            </button>
            <p className="text-center text-lg">{format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
            <button onClick={nextDay} className="p-2 text-blue-600 hover:text-blue-800">
              <FaArrowRight size={20} />
            </button>
          </div>

          {initialconfig && !isAttendingDay ? (
            <div className="text-center py-10 bg-gray-100 rounded-lg">
              <FaCalendarAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
              <p className="text-gray-600">No hay atención este día. Selecciona otro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slots.map((slot) => {
                const slotReservas = getReservasForSlot(slot);
                const maxCapacidad = initialconfig?.capacidadPorIntervalo || 1;
                const isBlocked = slotReservas.some((res) => res.estado === "BLOQUEADA");
                const isOcupado = slotReservas.length >= maxCapacidad && !isBlocked;
                const isCurrent = slot === format(parseISO(reservaData.fechaHoraInicio), "HH:mm") && currentDate.toISOString().split('T')[0] === parseISO(reservaData.fechaHoraInicio).toISOString().split('T')[0];
                const isSelected = slot === selectedSlot;

                // Lógica de colores separada para elegancia
                let color = isOcupado ? "bg-red-100 border-red-500" : "bg-white border-gray-800"; // Base: blanco para disponible, rojo para ocupado
                if (isBlocked) color = "bg-gray-300 border-gray-400"; // Gris para bloqueado
                if (isSelected) {
                  color = "bg-green-200 border-green-600"; // Verde destacado para seleccionado
                } else if (isCurrent) {
                  color = "bg-yellow-200 border-yellow-600"; // Amarillo para original (si no seleccionado)
                }

                return (
                  <div
                    key={slot}
                    className={`p-4 border rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow ${color}`}
                    onClick={() => !isBlocked && handleSelectSlot(slot)} // No selectable si bloqueado
                    title={isCurrent && !isSelected ? "Horario original" : isSelected ? "Seleccionado" : ""} // Tooltip para accesibilidad
                  >
                    <h3 className="text-lg font-medium">{slot}</h3>
                    <p className="text-sm text-gray-600">Reservas: {slotReservas.length} / {maxCapacidad}</p>
                    {isSelected && <FaCheck className="text-green-600 mt-2" title="Seleccionado" />} {/* Check solo en seleccionado */}
                    {isCurrent && !isSelected && <FaClock className="text-yellow-600 mt-2" title="Horario original" />} {/* Reloj para original */}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selectedSlot || loading}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Continuar a Editar Detalles
          </button>
        </motion.div>
      </motion.div>

      {/* Modal de Confirmación para slot excedido */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm mx-4"
          >
            <h2 className="text-lg font-bold mb-4 text-center">Advertencia</h2>
            <p className="text-sm text-gray-700 mb-6 text-center">
              Este slot ha alcanzado su capacidad máxima ({initialconfig?.capacidadPorIntervalo || 1}). ¿Desea continuar?
            </p>
            <div className="flex justify-between space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndSelect}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Render AddReservationModal si seleccionado */}
      {showAddModal && (
        (() => {
          const startDate = parse(selectedSlot, "HH:mm", currentDate);
          const endDate = addMinutes(startDate, initialconfig?.intervaloMinutos || 30);

          // Mapeo explícito para resolver incompatibilidad de tipos (null -> undefined)
          const updatedData: ReservationFormData = {
            id: reservaData.id,
            nombre: reservaData.nombre,
            telefono: reservaData.telefono,
            estado: reservaData.estado,
            fechaHoraInicio: startDate.toISOString(),
            fechaHoraFin: endDate.toISOString(),
            notas: reservaData.notas ?? undefined,
          };

          return (
            <AddReservationModal
              negocioId={negocioId}
              horaInicio={startDate.toISOString()}
              horaFin={endDate.toISOString()}
              data={updatedData} // Usa el mapeado corregido
              onClose={() => {
                setShowAddModal(false); // Cierra solo Add inmediatamente (elegante y responsive)
                // console.log("Cerrando AddReservationModal, el cierre de superiores se maneja en onSuccess");
              }}
              onSuccess={() => {
                // console.log("Éxito propagado desde Add a EditReservationSlotSelector, llamando props.onSuccess para cierre de ResumeReservations");
                if (onSuccess) onSuccess(); // Propaga a ResumeReservations para refresh y cierre con delay
              }}
            />
          );
        })()
      )}
    </>
  );
};
