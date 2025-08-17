"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, addDays, subDays, parse, startOfDay, addMinutes } from "date-fns";
import { es } from "date-fns/locale"; // Locale Colombia/español
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaEye, FaPlus, FaLock, FaUnlock, FaTimes, FaList, FaGraduationCap } from "react-icons/fa"; // Agregué icons para botones de vista
import { useReservationsConfigStore } from "@/store/reservasConfig/reseervas-config-store";
import { ReservationDayData, ReservationsResponse } from "@/app/api/reservasConfig/route";
import AddReservationModal from "./AddReservationModal";
import ResumeReservations from "./ResumeReservations";
import { toast } from "react-hot-toast"; // Asume uso de react-hot-toast para toasts elegantes (instala si no)
import { blockSlot, deleteReserva } from "../actions/reservasActions";
import { motion } from "framer-motion";

// Extensión del interface para incluir el nuevo estado (corrige el error de tipos)
interface ExtendedReservationDayData extends ReservationDayData {
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'BLOQUEADA';
}

// Función auxiliar para capitalizar solo la primera letra
const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const ReservasDashboard = ({ negocioId }: { negocioId: string }) => {
  const { initialconfig, fetchConfig } = useReservationsConfigStore();
  const [currentDate, setCurrentDate] = useState(new Date()); // Fecha actual
  const [reservas, setReservas] = useState<ExtendedReservationDayData[]>([]); // Usamos el tipo extendido
  const [slots, setSlots] = useState<string[]>([]); // Cajones generados (e.g., "08:00", "08:30")
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null); // Slot expandido para lista
  const [showModal, setShowModal] = useState(false); // Estado para modal de creación
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // Slot seleccionado para modal de creación
  const [selectedResumeSlot, setSelectedResumeSlot] = useState<string | null>(null); // Slot seleccionado para ResumeReservations
  const [loading, setLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedSlotReservas, setSelectedSlotReservas] = useState<ExtendedReservationDayData[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Modal para confirmación de agregar reserva excedida
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null); // Slot para confirmar agregar
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false); // Nuevo modal para confirmación de bloqueo
  const [blockSlotToConfirm, setBlockSlotToConfirm] = useState<string | null>(null); // Slot para confirmar bloqueo
  const [view, setView] = useState<'slots' | 'list'>('slots'); // Nueva estado para vista: 'slots' (default) o 'list'

  // Fetch config si vacío
  useEffect(() => {
    if (!initialconfig) {
      fetchConfig();
    }
  }, [fetchConfig, initialconfig]);

  // Generar cajones/slots basados en config
  useEffect(() => {
    if (initialconfig) {
      const generateSlots = () => {
        const newSlots: string[] = [];
        const intervalo = initialconfig.intervaloMinutos;

        // Función auxiliar para generar slots en rango
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

  // Función separada para fetch reservas (para refresh post-creación)
  const fetchReservas = async () => {
    setLoading(true);
    const dateStr = format(currentDate, "yyyy-MM-dd"); // YYYY-MM-DD para API
    const res = await fetch(`/api/reservasConfig?date=${dateStr}`);
    const data: ReservationsResponse = await res.json();
    setLoading(false);
    if (data.ok) {
      setReservas(data.reservas as ExtendedReservationDayData[]); // Cast para compatibilidad
    } else {
      console.error(data.message);
      setReservas([]);
    }
  };

  // Fetch reservas por día si es un día de atención
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
  }, [currentDate, initialconfig]);

  // Navegación: Prev/Next día
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Cambio manual de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parse(e.target.value, "yyyy-MM-dd", new Date());
    if (!isNaN(newDate.getTime())) {
      setCurrentDate(startOfDay(newDate)); // Asegura inicio del día
    }
  };

  // Map reservas a slots (resumen por slot)
  const getReservasForSlot = (slotTime: string) => {
    const slotStart = parse(slotTime, "HH:mm", currentDate);
    const slotEnd = addMinutes(slotStart, initialconfig?.intervaloMinutos || 30);

    return reservas.filter(res => {
      const resStart = new Date(res.fechaHoraInicio);
      return resStart >= slotStart && resStart < slotEnd;
    });
  };

  // Toggle expandir slot
  const toggleExpand = (slot: string) => {
    setExpandedSlot(expandedSlot === slot ? null : slot);
  };

  // Abrir modal para agregar reserva con warning si máximo alcanzado
  const openAddModal = (slot: string) => {
    const slotReservas = getReservasForSlot(slot);
    const maxCapacidad = initialconfig?.capacidadPorIntervalo || 1;
    const nonBlockedReservas = slotReservas.filter(res => res.estado !== "BLOQUEADA"); // Contar solo reservas no bloqueadas
    if (nonBlockedReservas.length >= maxCapacidad) {
      setConfirmSlot(slot); // Guardamos el slot y mostramos modal de confirmación
      setShowConfirmModal(true);
      return; // No procedemos hasta confirmar
    }
    setSelectedSlot(slot);
    setShowModal(true);
  };

  // Función para confirmar y proceder con agregar reserva
  const confirmAndCreate = () => {
    setShowConfirmModal(false);
    if (confirmSlot) {
      setSelectedSlot(confirmSlot);
      setShowModal(true);
    }
  };

  // Función para confirmar y proceder con bloqueo
  const confirmAndBlock = async () => {
    setShowBlockConfirmModal(false);
    if (blockSlotToConfirm) {
      const slotTimes = getSlotTimes(blockSlotToConfirm);
      toast.loading("Bloqueando slot...", { duration: 2000 });
      const res = await blockSlot({
        negocioId,
        fechaHoraInicio: slotTimes.horaInicio,
        fechaHoraFin: slotTimes.horaFin,
      });
      if (res.ok) {
        toast.success(res.message, { duration: 3000 });
        await fetchReservas();
      } else {
        toast.error(res.message, { duration: 3000 });
      }
    }
  };

  // Función para iniciar bloqueo (muestra modal primero)
  const initiateBlockSlot = (slot: string) => {
    setBlockSlotToConfirm(slot);
    setShowBlockConfirmModal(true);
  };

  // Función para desbloquear slot (elimina la reserva BLOQUEADA)
  const handleUnblockSlot = async (blockedReservaId: string) => {
    const res = await deleteReserva({ negocioId, reservaId: blockedReservaId });
    if (res.ok) {
      toast.success(res.message, { duration: 3000 });
      await fetchReservas(); // Refresca
    } else {
      toast.error(res.message, { duration: 3000 });
    }
  };

  // Calcular fechaHoraInicio y fechaHoraFin en ISO para modal
  const getSlotTimes = (slot: string) => {
    const startDate = parse(slot, "HH:mm", currentDate);
    const endDate = addMinutes(startDate, initialconfig?.intervaloMinutos || 30);
    return {
      horaInicio: startDate.toISOString(),  // Convierte local a UTC ISO
      horaFin: endDate.toISOString(),
    };
  };

  // Computar si es día de atención
  const dayName = format(currentDate, "EEEE", { locale: es });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const isAttendingDay = initialconfig?.diasAtencion?.includes(capitalizedDay) ?? true;

  // Preparar reservas ordenadas para la tabla (useMemo para optimización)
  const sortedReservas = useMemo(() => {
    return [...reservas].sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
  }, [reservas]);

  // Función para abrir Resume por slot desde la tabla
  const openResumeBySlot = (reserva: ExtendedReservationDayData) => {
    const slotTime = format(new Date(reserva.fechaHoraInicio), "HH:mm");
    const slotReservas = getReservasForSlot(slotTime);
    setSelectedSlotReservas(slotReservas);
    setSelectedResumeSlot(slotTime);
    setShowResumeModal(true);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      {/* Navegación de Fecha */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevDay} className="p-2 text-blue-600 hover:text-blue-800">
          <FaArrowLeft size={20} />
        </button>
        <div className="text-center">
          <input
            type="date"
            value={format(currentDate, "yyyy-MM-dd")}
            onChange={handleDateChange}
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500"
          />
          <p className="text-sm text-gray-600 mt-1">{format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        <button onClick={nextDay} className="p-2 text-blue-600 hover:text-blue-800">
          <FaArrowRight size={20} />
        </button>
      </div>

      {initialconfig && !isAttendingDay ? (
        <div className="text-center py-10 bg-gray-100 rounded-lg shadow-md">
          <FaCalendarAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lo sentimos</h2>
          <p className="text-gray-600">En este día no se presta atención.</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, selecciona otro día.</p>
        </div>
      ) : (
        <>
          {/* Botones para cambiar vista (Responsive: column en sm, row en md+) */}
          <div className="flex flex-col md:flex-row justify-center mb-6 space-y-2 md:space-y-0 md:space-x-4">
            <button
              onClick={() => setView('slots')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'slots' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              <FaGraduationCap /> Reservas diarias
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${view === 'list' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              <FaList /> Lista de reservas
            </button>
          </div>

          {view === 'slots' ? (
            /* Vista de Slots (Grid responsive) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slots.map((slot) => {
                const slotReservas = getReservasForSlot(slot);
                const maxCapacidad = initialconfig?.capacidadPorIntervalo || 1;
                const isBlocked = slotReservas.some((res) => res.estado === "BLOQUEADA");
                const blockedReserva = isBlocked ? slotReservas.find((res) => res.estado === "BLOQUEADA") : null;
                const nonBlockedReservas = slotReservas.filter((res) => res.estado !== "BLOQUEADA");
                const hasReservas = nonBlockedReservas.length > 0;
                const isOcupado = nonBlockedReservas.length >= maxCapacidad;

                let colorClass = 'bg-white border border-gray-600'; // Default: vacío (blanco con borde gris oscuro)
                if (hasReservas && !isOcupado && !isBlocked) colorClass = 'bg-green-100 border-green-500'; // Verde si tiene reservas pero no lleno
                if (isOcupado && !isBlocked) colorClass = 'bg-red-100 border-red-500'; // Rojo si lleno
                if (isBlocked) colorClass = 'bg-gray-300 border-gray-400 text-gray-900'; // Gris si bloqueado

                return (
                  <div key={slot} className={`p-4 border rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow ${colorClass}`} onClick={() => toggleExpand(slot)}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">{slot}</h3>
                      <FaCalendarAlt className="text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-600">Reservas: {nonBlockedReservas.length} / {maxCapacidad}</p>
                    {expandedSlot === slot && slotReservas.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {slotReservas.map((res) => (
                          <li key={res.id} className="border-t pt-1">
                            <span className="font-medium">{res.nombre}</span> - {format(new Date(res.fechaHoraInicio), "HH:mm")}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex justify-end mt-2 space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Evita toggle expand al clickear botón
                          setSelectedSlotReservas(slotReservas);
                          setSelectedResumeSlot(slot); // Establecer el slot seleccionado para Resume
                          setShowResumeModal(true);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Ver reservas"
                      >
                        <FaEye />
                      </button>
                      {!isBlocked && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Evita toggle
                            openAddModal(slot);
                          }} 
                          className="p-1 text-green-600 hover:text-green-800" 
                          title="Agregar manual"
                        >
                          <FaPlus />
                        </button>
                      )}
                      {isBlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evita toggle
                            blockedReserva && handleUnblockSlot(blockedReserva.id);
                          }}
                          className="p-1 text-yellow-600 hover:text-yellow-800"
                          title="Desbloquear"
                        >
                          <FaUnlock />
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Evita toggle
                            initiateBlockSlot(slot);
                          }} 
                          className="p-1 text-red-600 hover:text-red-800" 
                          title="Bloquear"
                        >
                          <FaLock />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista de Lista (Tabla responsive) */
            <div className="overflow-x-auto">
              <h2 className="text-2xl font-bold mb-4 text-center  py-2 rounded-t-lg">
                Listado de reservas para el día {format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </h2>
              {sortedReservas.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No hay reservas para este día.</p>
              ) : (
                <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-md">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="py-3 px-4 border-b border-r border-gray-300 text-left">Fecha</th>
                      <th className="py-3 px-4 border-b border-r border-gray-300 text-left">Nombre</th>
                      <th className="py-3 px-4 border-b border-r border-gray-300 text-left">Teléfono</th>
                      <th className="py-3 px-4 border-b border-r border-gray-300 text-left">Descripción</th>
                      <th className="py-3 px-4 border-b text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReservas.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                        <td 
                          className="py-3 px-4 border-b border-r border-gray-300 text-blue-600 cursor-pointer hover:underline"
                          onClick={() => openResumeBySlot(res)}
                        >
                          {format(new Date(res.fechaHoraInicio), "HH:mm")}
                        </td>
                        <td className="py-3 px-4 border-b border-r border-gray-300">{res.nombre}</td>
                        <td className="py-3 px-4 border-b border-r border-gray-300">{res.telefono}</td>
                        <td className="py-3 px-4 border-b border-r border-gray-300">{res.notas}</td>
                        <td className="py-3 px-4 border-b">{capitalizeFirstLetter(res.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {slots.length === 0 && <p className="text-center text-gray-500 mt-4">No hay configuración de reservas disponible. Crea una primero.</p>}
        </>
      )}

      {/* Render Modal si showModal */}
      {showModal && selectedSlot && (
        <AddReservationModal
          negocioId={negocioId}
          horaInicio={getSlotTimes(selectedSlot).horaInicio}
          horaFin={getSlotTimes(selectedSlot).horaFin}
          onClose={() => setShowModal(false)}
          onSuccess={fetchReservas} // Callback para refresh post-creación
        />
      )}

      {showResumeModal && (
        <ResumeReservations
          slotTime={selectedResumeSlot || ""}
          reservas={selectedSlotReservas}
          onClose={() => setShowResumeModal(false)}
          negocioId={negocioId}
          onSuccess={fetchReservas} // Callback para refresh post-operaciones
        />
      )}

      {/* Modal de Confirmación para agregar reserva excedida */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-sm mx-4"
          >
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-900 text-center">Advertencia</h2>
            <p className="text-sm text-gray-700 mb-6 text-center">
              Se ha alcanzado el máximo de reservas ({initialconfig?.capacidadPorIntervalo || 1}) para este intervalo. ¿Desea continuar creando una reserva manual?
            </p>
            <div className="flex justify-between space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndCreate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmación para bloquear slot */}
      {showBlockConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-sm mx-4"
          >
            <button
              onClick={() => setShowBlockConfirmModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-gray-900 text-center">Confirmar Bloqueo</h2>
            <p className="text-sm text-gray-700 mb-6 text-center">
              Al bloquear este slot, las reservas existentes no serán canceladas automáticamente. Deben cancelarse manualmente si es necesario. ¿Desea continuar?
            </p>
            <div className="flex justify-between space-x-4">
              <button
                onClick={() => setShowBlockConfirmModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndBlock}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Bloquear
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};