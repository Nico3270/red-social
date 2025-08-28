"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, subDays, parse, startOfDay, addMinutes, isBefore, isSameDay } from "date-fns";
import { es } from "date-fns/locale"; // Locale para español/Colombia
import { FaArrowLeft, FaArrowRight, FaCalendarAlt } from "react-icons/fa";
import { ReservationsResponse, ReservationDayData } from "@/app/api/reservasConfig/route"; // Asume paths correctos
import AddReservationModal from "./AddReservationModal"; // Asume que existe y se adapta para usuario
import { BusinessAvailabilityData } from "../actions/getCongifUserReservation";

interface ReservasUserDashboardProps {
  config: BusinessAvailabilityData;
}

const ReservasUserDashboard = ({ config }: ReservasUserDashboardProps) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date())); // Fecha actual, normalizada a inicio del día
  const [reservas, setReservas] = useState<ReservationDayData[]>([]); // Reservas del día (para chequear ocupación)
  const [slots, setSlots] = useState<string[]>([]); // Cajones generados (e.g., "08:00", "08:30")
  const [showModal, setShowModal] = useState(false); // Estado para modal de creación
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // Slot seleccionado para modal
  const [loading, setLoading] = useState(true); // Loading para fetch
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Mensaje de error para fechas pasadas

  const today = useMemo(() => startOfDay(new Date()), []); // Hoy, normalizado

  // Generar slots basados en config (similar a dashboard negocio)
  useEffect(() => {
    const generateSlots = () => {
      const newSlots: string[] = [];
      const intervalo = config.intervaloMinutos;

      // Función auxiliar para generar slots en rango
      const addSlotsInRange = (inicio?: string | null, fin?: string | null) => {
        if (!inicio || !fin) return;
        let current = parse(inicio, "HH:mm", new Date());
        const end = parse(fin, "HH:mm", new Date());
        while (current < end) {
          newSlots.push(format(current, "HH:mm"));
          current = addMinutes(current, intervalo);
        }
      };

      addSlotsInRange(config.franjaMananaInicio, config.franjaMananaFin);
      addSlotsInRange(config.franjaTardeInicio, config.franjaTardeFin);
      setSlots(newSlots);
    };
    generateSlots();
  }, [config]);

  // Fetch reservas por día para calcular ocupación (sin mostrar detalles)
  const fetchReservas = useCallback(async () => {
  setLoading(true);
  const dateStr = format(currentDate, "yyyy-MM-dd"); // YYYY-MM-DD para API
  const res = await fetch(`/api/reservasConfigUser?date=${dateStr}&negocioId=${config.negocioId}`);
  const data: ReservationsResponse = await res.json();
  setLoading(false);
  if (data.ok) {
    setReservas(data.reservas);
  } else {
    console.error(data.message);
    setReservas([]);
  }
}, [currentDate, config.negocioId]); // Solo depende de estas dos cosas

  useEffect(() => {
    // Si la fecha es anterior a hoy, no fetch y mostrar error
    if (isBefore(currentDate, today)) {
      setReservas([]);
      setLoading(false);
      setErrorMessage("No hay reservas disponibles para períodos pasados.");
      return;
    }

    setErrorMessage(null); // Limpiar error si fecha válida

    const dayName = format(currentDate, "EEEE", { locale: es });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const isAttendingDay = config.diasAtencion.includes(capitalizedDay);
    if (isAttendingDay) {
      fetchReservas();
    } else {
      setReservas([]);
      setLoading(false);
    }
  }, [currentDate, config, fetchReservas, today]);

  // Navegación: Prev/Next día
  const prevDay = () => {
    const newDate = subDays(currentDate, 1);
    if (!isBefore(newDate, today)) {
      setCurrentDate(newDate);
    }
  };

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Cambio manual de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = startOfDay(parse(e.target.value, "yyyy-MM-dd", new Date()));
    if (!isNaN(newDate.getTime())) {
      if (isBefore(newDate, today)) {
        setErrorMessage("No se pueden seleccionar fechas pasadas.");
        return;
      }
      setCurrentDate(newDate);
    }
  };

  // Obtener reservas para un slot (para chequear disponibilidad)
  const getReservasForSlot = (slotTime: string) => {
    const slotStart = parse(slotTime, "HH:mm", currentDate);
    const slotEnd = addMinutes(slotStart, config.intervaloMinutos);

    return reservas.filter(res => {
      const resStart = new Date(res.fechaHoraInicio);
      return resStart >= slotStart && resStart < slotEnd;
    });
  };

  // Abrir modal si slot disponible (no bloqueado y no lleno)
  const openAddModal = (slot: string) => {
    const slotReservas = getReservasForSlot(slot);
    const maxCapacidad = config.capacidadPorIntervalo;
    const isBlocked = slotReservas.some(res => res.estado === "BLOQUEADA");
    const nonBlockedReservas = slotReservas.filter(res => res.estado !== "BLOQUEADA");
    const isFull = nonBlockedReservas.length >= maxCapacidad;

    if (isBlocked || isFull) {
      // Por ahora, no mostrar toast o alert; solo no abrir modal
      return;
    }

    setSelectedSlot(slot);
    setShowModal(true);
  };

  // Calcular fechaHoraInicio y fechaHoraFin en ISO para modal
  const getSlotTimes = (slot: string) => {
    const startDate = parse(slot, "HH:mm", currentDate);
    const endDate = addMinutes(startDate, config.intervaloMinutos);
    return {
      horaInicio: startDate.toISOString(),
      horaFin: endDate.toISOString(),
    };
  };

  // Computar si es día de atención
  const dayName = format(currentDate, "EEEE", { locale: es });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const isAttendingDay = config.diasAtencion.includes(capitalizedDay);

  // Filtrar slots: si es hoy, excluir slots pasados (basado en hora local actual)
  const filteredSlots = useMemo(() => {
    if (!isSameDay(currentDate, new Date())) {
      return slots; // Para fechas futuras, mostrar todos
    }
    const now = new Date();
    return slots.filter(slot => {
      const slotDate = parse(slot, "HH:mm", currentDate);
      return slotDate > now; // Solo slots futuros
    });
  }, [slots, currentDate]);

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      {/* Navegación de Fecha (responsive: flex wrap en small) */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
        {!isBefore(currentDate, today) && !isBefore(subDays(currentDate, 1), today) && (
          <button onClick={prevDay} className="p-2 text-blue-600 hover:text-blue-800 flex items-center gap-2">
            <FaArrowLeft size={20} /> Día anterior
          </button>
        )}
        <div className="text-center flex-grow">
          <input
            type="date"
            value={format(currentDate, "yyyy-MM-dd")}
            onChange={handleDateChange}
            min={format(today, "yyyy-MM-dd")} // Previene selección de fechas pasadas en el input
            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 w-full sm:w-auto"
          />
          <p className="text-sm text-gray-600 mt-1">{format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        <button onClick={nextDay} className="p-2 text-blue-600 hover:text-blue-800 flex items-center gap-2">
          Día siguiente <FaArrowRight size={20} />
        </button>
      </div>

      {errorMessage ? (
        <div className="text-center py-10 bg-gray-100 rounded-lg shadow-md">
          <FaCalendarAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lo sentimos</h2>
          <p className="text-gray-600">{errorMessage}</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, selecciona una fecha actual o futura.</p>
        </div>
      ) : !isAttendingDay ? (
        <div className="text-center py-10 bg-gray-100 rounded-lg shadow-md">
          <FaCalendarAlt className="text-6xl text-gray-400 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Lo sentimos</h2>
          <p className="text-gray-600">En este día no se presta atención.</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, selecciona otro día.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Cargando slots disponibles...</p>
        </div>
      ) : (
        <>
          <p className="text-center text-lg font-semibold text-gray-800 mb-6 bg-gray-50 p-4 rounded-lg shadow-sm">
            Seleccione un horario disponible para realizar su reserva.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSlots.map((slot) => {
              const slotReservas = getReservasForSlot(slot);
              const maxCapacidad = config.capacidadPorIntervalo;
              const isBlocked = slotReservas.some(res => res.estado === "BLOQUEADA");
              const nonBlockedReservas = slotReservas.filter(res => res.estado !== "BLOQUEADA");
              const isFull = nonBlockedReservas.length >= maxCapacidad;
              const isAvailable = !isBlocked && !isFull;

              let colorClass = 'bg-white border border-gray-300 hover:border-blue-500'; // Default: disponible
              if (isBlocked || isFull) colorClass = 'bg-gray-200 border border-gray-300 cursor-not-allowed'; // No disponible: gris y disabled

              return (
                <div
                  key={slot}
                  className={`p-4 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${colorClass} ${isAvailable ? 'hover:shadow-md' : ''}`}
                  onClick={() => isAvailable && openAddModal(slot)} // Solo abre si disponible
                >
                  <h3 className="text-lg font-medium text-center">{slot}</h3>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    {isAvailable ? "Disponible" : "No disponible"}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Render Modal si showModal */}
      {showModal && selectedSlot && (
        <AddReservationModal
          negocioId={config.negocioId} // Usa negocioId de config
          horaInicio={getSlotTimes(selectedSlot).horaInicio}
          horaFin={getSlotTimes(selectedSlot).horaFin}
          onClose={() => setShowModal(false)}
          onSuccess={fetchReservas} // Refresh post-creación para actualizar disponibilidad
        />
      )}
    </div>
  );
};

export default ReservasUserDashboard;