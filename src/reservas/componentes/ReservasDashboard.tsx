// /components/dashboard/reservas/ReservasDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, subDays, parse, startOfDay, addMinutes } from "date-fns";
import { es } from "date-fns/locale"; // Locale Colombia/español
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaEye, FaPlus, FaLock } from "react-icons/fa";
import { useReservationsConfigStore } from "@/store/reservasConfig/reseervas-config-store";
import { ReservationDayData, ReservationsResponse } from "@/app/api/reservasConfig/route";
import AddReservationModal from "./AddReservationModal";
import ResumeReservations from "./ResumeReservations";

export const ReservasDashboard = ({ negocioId }: { negocioId: string }) => {
  const { initialconfig, fetchConfig } = useReservationsConfigStore();
  const [currentDate, setCurrentDate] = useState(new Date()); // Fecha actual
  const [reservas, setReservas] = useState<ReservationDayData[]>([]); // Reservas del día
  const [slots, setSlots] = useState<string[]>([]); // Cajones generados (e.g., "08:00", "08:30")
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null); // Slot expandido para lista
  const [showModal, setShowModal] = useState(false); // Estado para modal
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // Slot seleccionado para modal
  const [loading, setLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedSlotReservas, setSelectedSlotReservas] = useState<ReservationDayData[]>([]);

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
      setReservas(data.reservas);
    } else {
      console.error(data.message);
      setReservas([]);
    }
  };

  // Fetch reservas por día
  useEffect(() => {
    fetchReservas();
  }, [currentDate]);

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

    // Debug temporal: Log para verificar fechas
    console.log(`Slot: ${format(slotStart, "yyyy-MM-dd HH:mm")} - ${format(slotEnd, "HH:mm")} (local)`);

    return reservas.filter(res => {
      const resStart = new Date(res.fechaHoraInicio);
      console.log(`Reserva ${res.id}: ${format(resStart, "yyyy-MM-dd HH:mm")} (local from UTC)`);
      return resStart >= slotStart && resStart < slotEnd;
    });
  };

  // Toggle expandir slot
  const toggleExpand = (slot: string) => {
    setExpandedSlot(expandedSlot === slot ? null : slot);
  };

  // Abrir modal para agregar reserva
  const openAddModal = (slot: string) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  // Calcular fechaHoraInicio y fechaHoraFin en ISO para modal
  // En ReservasDashboard.tsx, dentro de getSlotTimes
  const getSlotTimes = (slot: string) => {
    const startDate = parse(slot, "HH:mm", currentDate);
    const endDate = addMinutes(startDate, initialconfig?.intervaloMinutos || 30);
    return {
      horaInicio: startDate.toISOString(),  // Convierte local a UTC ISO
      horaFin: endDate.toISOString(),
    };
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

      {/* Grid de Cajones (Responsive: 1-4 cols basado en screen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {slots.map((slot) => {
          const slotReservas = getReservasForSlot(slot);
          const isOcupado = slotReservas.length >= (initialconfig?.capacidadPorIntervalo || 1);
          const color = isOcupado ? "bg-red-100 border-red-500" : "bg-green-100 border-green-500";

          return (
            <div key={slot} className={`p-4 border rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow ${color}`} onClick={() => toggleExpand(slot)}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">{slot}</h3>
                <FaCalendarAlt className="text-gray-500" />
              </div>
              <p className="text-sm text-gray-600">Reservas: {slotReservas.length} / {initialconfig?.capacidadPorIntervalo || 1}</p>
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
                  onClick={() => {
                    setSelectedSlotReservas(getReservasForSlot(slot));
                    setShowResumeModal(true);
                  }}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Ver reservas"
                >
                  <FaEye />
                </button>
                <button onClick={() => openAddModal(slot)} className="p-1 text-green-600 hover:text-green-800" title="Agregar manual"><FaPlus /></button>
                <button className="p-1 text-red-600 hover:text-red-800" title="Bloquear"><FaLock /></button>
              </div>
            </div>
          );
        })}
      </div>
      {slots.length === 0 && <p className="text-center text-gray-500 mt-4">No hay configuración de reservas disponible. Crea una primero.</p>}

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
          slotTime={selectedSlot || ""}
          reservas={selectedSlotReservas}
          onClose={() => setShowResumeModal(false)}
          negocioId={negocioId}
          onSuccess={fetchReservas} // Callback para refresh post-creación
        />
      )}
    </div>
  );
};